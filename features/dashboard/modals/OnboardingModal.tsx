import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScheduleTab } from '@/features/settings/components/ScheduleTab';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, formatClassDisplayName } from '@/constants';
import { getBundledCalendar, getSchoolYearFor, todayInMorocco } from '@/utils/calendar';
import { Bell, Check, Plus, Trash2, BookOpen, CalendarRange, GraduationCap, School, FlaskConical } from '@/components/ui/icons';

type Lang = 'fr' | 'ar';
/** même clé que le guide : la préférence de langue est PARTAGÉE dans toute l'app */
const LANG_KEY = 'guide_lang_v1';

const readLang = (): Lang => {
    try {
        return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'fr';
    } catch {
        return 'fr';
    }
};

interface OnboardingModalProps {
    isOpen: boolean;
    /** fermeture (à tout moment) — l'appelant mémorise que l'accueil a été vu */
    onClose: () => void;
    /** validation finale : déclenche la permission native dans le geste utilisateur */
    onComplete: () => Promise<void> | void;
    config: AppConfig;
    onConfigChange: (patch: Partial<AppConfig>) => void;
    classes: ClassInfo[];
    onCreateClass: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
    onOpenNotebook: (classInfo: ClassInfo) => void;
}

const CYCLES: { key: Cycle; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'college', label: 'Collège', icon: School },
    { key: 'lycee', label: 'Lycée', icon: GraduationCap },
    { key: 'prepa', label: 'Prépa', icon: FlaskConical },
];

/* Niveaux officiels groupés « niveau puis filière » : TC → 1re Bac → 2e Bac. */
const LEVEL_GROUPS: Record<Cycle, { label: string; levels: string[] }[]> = {
    college: [{ label: 'Collège', levels: CLASS_LEVELS_BY_CYCLE.college }],
    lycee: [
        { label: 'Tronc commun', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(l => l.startsWith('Tronc')) },
        { label: '1re Bac', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(l => l.startsWith('1BAC')) },
        { label: '2e Bac', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(l => l.startsWith('2BAC')) },
    ],
    prepa: [{ label: 'Classes préparatoires', levels: CLASS_LEVELS_BY_CYCLE.prepa }],
};

const TEXTS: Record<Lang, {
    title: string;
    steps: [string, string, string];
    subtitle: string;
    next: string;
    back: string;
    later: string;
    start: string;
    createClasses: (n: number) => string;
    notifications: string;
    notificationsIOS: string;
}> = {
    fr: {
        title: 'Bienvenue',
        steps: ['Votre profil', 'Vos classes', 'Votre emploi du temps'],
        subtitle: 'Trois étapes et votre cahier de textes est prêt : qui vous êtes, vos classes, puis vos créneaux.',
        next: 'Continuer',
        back: 'Retour',
        later: 'Plus tard',
        start: 'Ouvrir mon premier cahier',
        createClasses: n => (n > 1 ? `Créer ces ${n} classes` : 'Créer cette classe'),
        notifications: 'À la validation, votre téléphone proposera d’activer les notifications natives.',
        notificationsIOS: 'Sur iPhone/iPad, installez d’abord l’application sur l’écran d’accueil pour activer les notifications.',
    },
    ar: {
        title: 'مرحباً بكم',
        steps: ['ملفكم الشخصي', 'أقسامكم', 'استعمال الزمن'],
        subtitle: 'ثلاث خطوات ويصبح دفتر نصوصكم جاهزاً: من أنتم، أقسامكم، ثم حصصكم.',
        next: 'متابعة',
        back: 'رجوع',
        later: 'لاحقاً',
        start: 'فتح دفتري الأول',
        createClasses: n => (n > 1 ? `إنشاء ${n} أقسام` : 'إنشاء هذا القسم'),
        notifications: 'عند التأكيد، سيقترح هاتفكم تفعيل الإشعارات الأصلية.',
        notificationsIOS: 'على iPhone وiPad، أضيفوا التطبيق أولاً إلى الشاشة الرئيسية لتفعيل الإشعارات.',
    },
};

interface ClassRow {
    level: string;
    group: string;
}

/**
 * Accueil FUSIONNÉ (ex-Welcome + ex-« Bien démarrer ») — une seule modale,
 * trois étapes DANS L'ORDRE LOGIQUE des données :
 *   1. Profil (partie « Profil » des Paramètres, saisie dès le commencement,
 *      rattachée à l'année scolaire en cours) ;
 *   2. Classes PAR LOT (nombre → niveau/filière officiels → groupe) — les
 *      classes existent AVANT l'emploi du temps, la grille les propose donc ;
 *   3. Emploi du temps (la même grille que Paramètres ▸ Emploi du temps).
 * Chaque étape détecte l'état réel (✓ si déjà faite) ; rien n'est bloquant.
 */
export const OnboardingModal: React.FC<OnboardingModalProps> = ({
    isOpen,
    onClose,
    onComplete,
    config,
    onConfigChange,
    classes,
    onCreateClass,
    onOpenNotebook,
}) => {
    const [lang, setLangState] = useState<Lang>(readLang);
    const [finishing, setFinishing] = useState(false);
    const isAr = lang === 'ar';
    const t = TEXTS[lang];
    const iosNeedsInstall = typeof navigator !== 'undefined'
        && /iphone|ipad|ipod/i.test(navigator.userAgent)
        && !(window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

    const setLang = (next: Lang) => {
        setLangState(next);
        try { localStorage.setItem(LANG_KEY, next); } catch { /* stockage indisponible */ }
    };

    const hasProfile = !!config.defaultTeacherName?.trim();
    const hasClasses = classes.length > 0;
    const hasTimetable = (config.timetable?.length ?? 0) > 0;
    const done = [hasProfile, hasClasses, hasTimetable];

    // démarre sur la première étape non faite (l'accueil est INTELLIGENT :
    // il reflète l'état réel, jamais un parcours figé)
    const [step, setStep] = useState<number>(() => {
        const first = done.findIndex(d => !d);
        return first === -1 ? 2 : first;
    });

    // année scolaire COURANTE (été compris : la prochaine rentrée) — cohérente
    // avec l'en-tête du hub, jamais l'année rétro-compat du fichier calendrier
    const calendar = getBundledCalendar();
    const yearLabel = getSchoolYearFor(calendar, todayInMorocco(new Date(), calendar)).libelle;
    const cycle: Cycle = (config.selectedCycles?.[0] as Cycle) ?? 'lycee';

    // ── Étape 2 : lot de classes ────────────────────────────────────────────
    const defaultLevel = LEVEL_GROUPS[cycle][0]?.levels[0] ?? '';
    const [subject, setSubject] = useState<string>(config.selectedSubjects?.[0] ?? 'Mathématiques');
    const [rows, setRows] = useState<ClassRow[]>([{ level: defaultLevel, group: '1' }]);

    const setRowCount = (count: number) => {
        const clamped = Math.max(1, Math.min(12, count));
        setRows(prev => {
            if (clamped <= prev.length) return prev.slice(0, clamped);
            const last = prev[prev.length - 1];
            const additions = Array.from({ length: clamped - prev.length }, (_, i) => ({
                level: last?.level ?? defaultLevel,
                // groupe suivant suggéré : même niveau, numéro incrémenté
                group: /^\d+$/.test(last?.group ?? '') ? String(Number(last.group) + i + 1) : '',
            }));
            return [...prev, ...additions];
        });
    };

    const composedNames = useMemo(
        () => rows.map(r => `${r.level}${r.group.trim() ? ` ${r.group.trim()}` : ''}`.trim()),
        [rows]
    );

    const createBatch = () => {
        const existing = new Set(classes.map(c => c.name.toLocaleLowerCase('fr')));
        let created = 0;
        let skipped = 0;
        rows.forEach((row, index) => {
            const name = composedNames[index];
            if (!row.level || !name) return;
            if (existing.has(name.toLocaleLowerCase('fr'))) {
                skipped += 1; // conflit : classe déjà existante — jamais de doublon silencieux
                return;
            }
            existing.add(name.toLocaleLowerCase('fr'));
            onCreateClass({ name, subject, cycle });
            created += 1;
        });
        if (created > 0) toast.success(`${created} classe${created > 1 ? 's' : ''} créée${created > 1 ? 's' : ''} — posez-les maintenant sur la grille.`);
        if (skipped > 0) toast.info(`${skipped} classe${skipped > 1 ? 's' : ''} déjà existante${skipped > 1 ? 's' : ''} — ignorée${skipped > 1 ? 's' : ''}.`);
        setStep(2);
    };

    const STEP_ICONS = [GraduationCap, Plus, CalendarRange];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth={step === 2 ? '5xl' : 'xl'}
            title={
                <div className="flex w-full items-center justify-between gap-3">
                    <span dir={isAr ? 'rtl' : 'ltr'} className={`block ${isAr ? 'font-ar text-right' : ''} text-slate-900`}>
                        {t.title} · <span className="text-slate-500 font-bold">{yearLabel}</span>
                    </span>
                    <div className="flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-100 p-0.5">
                        {(['fr', 'ar'] as const).map(l => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => setLang(l)}
                                aria-pressed={lang === l}
                                className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-extrabold transition-all ${
                                    lang === l ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-primary'
                                }`}
                            >
                                {l === 'fr' ? 'FR' : 'ع'}
                            </button>
                        ))}
                    </div>
                </div>
            }
            footer={
                <div dir={isAr ? 'rtl' : 'ltr'} className="flex w-full items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 shrink-0 rounded-lg px-2.5 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                        {t.later} {isAr ? '←' : '→'}
                    </button>
                    <div className="flex items-center gap-1.5">
                        {step > 0 && (
                            <Button type="button" variant="secondary" className="px-3 text-xs font-bold" onClick={() => setStep(step - 1)}>
                                {t.back}
                            </Button>
                        )}
                        {step === 0 && (
                            <Button type="button" className="px-3.5 text-xs font-bold" onClick={() => setStep(1)} disabled={!hasProfile}>
                                {t.next}
                            </Button>
                        )}
                        {step === 1 && (
                            <Button type="button" className="px-3.5 text-xs font-bold" onClick={createBatch} disabled={!rows.some(r => r.level)}>
                                {t.createClasses(rows.filter(r => r.level).length)}
                            </Button>
                        )}
                        {step === 2 && (
                            <Button
                                type="button"
                                className="px-3.5 text-xs font-bold"
                                disabled={!hasClasses || finishing}
                                onClick={async () => {
                                    if (finishing) return;
                                    setFinishing(true);
                                    try {
                                        await onComplete();
                                        onClose();
                                        if (classes[0]) onOpenNotebook(classes[0]);
                                    } finally {
                                        setFinishing(false);
                                    }
                                }}
                            >
                                <BookOpen className="h-3.5 w-3.5" />
                                {finishing ? (isAr ? 'جارٍ التفعيل…' : 'Activation…') : t.start}
                            </Button>
                        )}
                    </div>
                </div>
            }
        >
            <div dir={isAr ? 'rtl' : 'ltr'} className={`space-y-3.5 ${isAr ? 'font-ar' : ''}`}>
                <p className={`text-sm leading-relaxed text-slate-600 ${isAr ? 'text-right' : ''}`}>{t.subtitle}</p>

                {/* Fil d'étapes : cliquable, ✓ = état réel détecté */}
                <div className="flex items-center gap-1.5">
                    {t.steps.map((label, index) => {
                        const Icon = STEP_ICONS[index];
                        const isCurrent = step === index;
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => setStep(index)}
                                aria-label={label}
                                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border px-1.5 py-2 text-[11px] font-bold transition-all min-[390px]:px-2 ${
                                    isCurrent
                                        ? 'border-primary bg-primary text-white shadow-sm'
                                        : done[index]
                                            ? 'border-primary/20 bg-primary/5 text-primary'
                                            : 'border-slate-200 bg-white text-slate-400 hover:border-primary/30'
                                }`}
                            >
                                {done[index] && !isCurrent ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Icon className="h-3.5 w-3.5 shrink-0" />}
                                <span className="hidden truncate min-[390px]:block">{label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Étape 1 : profil (même contenu que Paramètres ▸ Profil) ── */}
                {step === 0 && (
                    <div className="space-y-4" dir="ltr">
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Nom de l'enseignant (M. ou Mme) *
                            </label>
                            <Input
                                type="text"
                                value={config.defaultTeacherName || ''}
                                onChange={e => onConfigChange({ defaultTeacherName: e.target.value })}
                                placeholder="Ex : M. Ahmed Benali"
                                className="h-10 text-sm"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Établissement
                            </label>
                            <Input
                                type="text"
                                value={config.establishmentName || ''}
                                onChange={e => onConfigChange({ establishmentName: e.target.value })}
                                placeholder="Ex : Lycée Ibn al-Haytham"
                                className="h-10 text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Cycle d'enseignement principal
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {CYCLES.map(c => {
                                    const active = cycle === c.key;
                                    return (
                                        <button
                                            key={c.key}
                                            type="button"
                                            onClick={() => onConfigChange({ selectedCycles: [c.key], showAllCycles: false })}
                                            className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-[11px] font-bold transition-all ${
                                                active
                                                    ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                                                    : 'border-slate-200 bg-white text-slate-400 hover:border-primary/30'
                                            }`}
                                        >
                                            <c.icon className="h-4 w-4" />
                                            {c.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] leading-snug text-muted-foreground/60">
                                Ces informations viennent de Paramètres ▸ Profil (modifiables à tout moment) et pré-remplissent
                                la création de vos classes pour l'année {yearLabel}.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Étape 2 : classes PAR LOT — avant l'emploi du temps ── */}
                {step === 1 && (
                    <div className="space-y-4" dir="ltr">
                        {hasClasses && (
                            <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                                <Check className="h-4 w-4 shrink-0 text-primary" />
                                <p className="text-xs font-semibold text-primary">
                                    Vous avez déjà {classes.length} classe{classes.length > 1 ? 's' : ''} — ajoutez-en d'autres
                                    ci-dessous, ou passez directement à l'emploi du temps.
                                </p>
                            </div>
                        )}

                        <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Combien de classes ?
                                </label>
                                <div className="flex items-center gap-1">
                                    <Button type="button" variant="secondary" size="icon" className="h-9 w-9 rounded-lg text-base font-black"
                                        onClick={() => setRowCount(rows.length - 1)} disabled={rows.length <= 1} aria-label="Une classe de moins">−</Button>
                                    <span className="w-10 text-center text-xl font-black text-slate-800 tabular-nums">{rows.length}</span>
                                    <Button type="button" variant="secondary" size="icon" className="h-9 w-9 rounded-lg text-base font-black"
                                        onClick={() => setRowCount(rows.length + 1)} disabled={rows.length >= 12} aria-label="Une classe de plus">+</Button>
                                </div>
                            </div>
                            <div className="min-w-44 flex-1 space-y-1.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Matière (pour toutes)
                                </label>
                                <Select value={subject} onValueChange={setSubject}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Matière…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(config.selectedSubjects?.length ? config.selectedSubjects : [...SUBJECTS]).map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* une ligne par classe : niveau officiel (groupé par palier) + n° de groupe */}
                        <div className="space-y-2">
                            {rows.map((row, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="w-5 shrink-0 text-center text-xs font-black text-slate-300">{index + 1}</span>
                                    <Select
                                        value={row.level}
                                        onValueChange={value => setRows(prev => prev.map((r, i) => (i === index ? { ...r, level: value } : r)))}
                                    >
                                        <SelectTrigger className="h-10 flex-1">
                                            <SelectValue placeholder="Niveau / filière…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LEVEL_GROUPS[cycle].map(group => (
                                                <SelectGroup key={group.label}>
                                                    <SelectLabel>{group.label}</SelectLabel>
                                                    {group.levels.map(l => (
                                                        <SelectItem key={l} value={l} className="text-xs leading-snug">
                                                            {formatClassDisplayName(l)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="text"
                                        value={row.group}
                                        onChange={e => setRows(prev => prev.map((r, i) => (i === index ? { ...r, group: e.target.value } : r)))}
                                        placeholder="Gr."
                                        className="h-10 w-16 text-center"
                                        maxLength={4}
                                        aria-label={`Groupe de la classe ${index + 1}`}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground/50 hover:text-destructive"
                                        onClick={() => setRows(prev => prev.filter((_, i) => i !== index))}
                                        disabled={rows.length <= 1}
                                        aria-label={`Retirer la classe ${index + 1}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {composedNames.some(Boolean) && (
                            <p className="rounded-xl border border-dashed border-border bg-secondary/50 px-3 py-2 text-xs">
                                <span className="font-semibold text-muted-foreground/60">Aperçu : </span>
                                <span className="font-bold text-foreground/80">
                                    {composedNames.filter(Boolean).map(formatClassDisplayName).join(' · ')}
                                </span>
                                <span className="text-muted-foreground/60"> — {subject}</span>
                            </p>
                        )}
                    </div>
                )}

                {/* ── Étape 3 : emploi du temps (grille des Paramètres, classes déjà connues) ── */}
                {step === 2 && (
                    <div className="space-y-3" dir="ltr">
                        <ScheduleTab
                            classes={classes}
                            config={config}
                            onChange={onConfigChange}
                            onCreateClass={details => onCreateClass({
                                ...details,
                                cycle: details.cycle ?? cycle,
                            })}
                        />
                        <div className="flex items-start gap-2.5 rounded-xl border border-blue-200/70 bg-blue-50/70 px-3 py-2.5">
                            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                            <p dir={isAr ? 'rtl' : 'ltr'} className={`text-[10px] font-semibold leading-relaxed text-slate-600 ${isAr ? 'font-ar text-right' : ''}`}>
                                {iosNeedsInstall ? t.notificationsIOS : t.notifications}
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </Modal>
    );
};
