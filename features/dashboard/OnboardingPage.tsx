import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LangToggle, useModalLang, type ModalLang } from '@/components/ui/lang-toggle';
import { ScheduleTab } from '@/features/settings/components/ScheduleTab';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { classNameForLevelAndGroup, isSameClassGroup, normalizeGroupNumber, sanitizeGroupNumberInput } from '@/utils/classGroup';
import { Bell, GraduationCap, School, FlaskConical, Trash2, Plus, ChevronRight, ChevronLeft } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

const LANG_KEY = 'onboarding_lang_v1';

interface OnboardingPageProps {
    config: AppConfig;
    onConfigChange: (patch: Partial<AppConfig>) => void;
    classes: ClassInfo[];
    onCreateClass: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
    onOpenNotebook: (classInfo: ClassInfo) => void;
    onComplete: () => Promise<void> | void;
    onSkip: () => void;
}

const CYCLES: { key: Cycle; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'college', icon: School },
    { key: 'lycee', icon: GraduationCap },
    { key: 'prepa', icon: FlaskConical },
];

const LEVEL_GROUPS: Record<Cycle, { key: string; levels: string[] }[]> = {
    college: [{ key: 'college', levels: CLASS_LEVELS_BY_CYCLE.college }],
    lycee: [
        { key: 'common', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(l => l.startsWith('Tronc')) },
        { key: 'firstBac', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(l => l.startsWith('1BAC')) },
        { key: 'secondBac', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(l => l.startsWith('2BAC')) },
    ],
    prepa: [{ key: 'prepa', levels: CLASS_LEVELS_BY_CYCLE.prepa }],
};

type ClassRowIssue = 'missingGroup' | 'invalidGroup' | 'duplicateGroup' | 'existingGroup';

interface ClassRow {
    level: string;
    group: string;
}

interface ClassRowValidation {
    groupNumber: string | null;
    key: string | null;
    issue: ClassRowIssue | null;
}

const TEXTS: Record<ModalLang, {
    title: string; subtitle: string; start: string;
    createClasses: (n: number) => string; classAdded: (n: number) => string;
    notifications: string; notificationsIOS: string;
    sectionProfile: string; sectionClasses: string; sectionSchedule: string;
    fullName: string; fullNamePlaceholder: string;
    establishment: string; establishmentPlaceholder: string;
    teachingCycle: string; subject: string; subjectPlaceholder: string;
    classesToCreate: string; levelPlaceholder: string; groupPlaceholder: string;
    deleteRow: string; addedClasses: (n: number) => string;
    step: (current: number, total: number) => string;
    cycleLabels: Record<Cycle, string>;
    levelGroupLabels: Record<string, string>;
    addRow: string; groupHint: string; missingGroup: string;
    invalidGroup: string; duplicateGroup: string; existingGroup: string;
    later: string; back: string; next: string;
}> = {
    fr: {
        title: 'Bienvenue', subtitle: 'Configurez votre espace en trois étapes.',
        start: 'Ouvrir mes cahiers',
        createClasses: n => (n > 1 ? `Ajouter ${n} classes` : 'Ajouter cette classe'),
        classAdded: n => `${n} classe${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}.`,
        notifications: 'Activez les notifications de séance dans les réglages de votre téléphone.',
        notificationsIOS: 'Sur iPhone/iPad, ajoutez d\'abord l\'application à l\'écran d\'accueil pour activer les notifications.',
        sectionProfile: 'Vos informations', sectionClasses: 'Classes', sectionSchedule: 'Emploi du temps',
        fullName: 'Nom complet', fullNamePlaceholder: 'Ex. : M. Ahmed Benali',
        establishment: 'Établissement', establishmentPlaceholder: 'Ex. : Lycée Ibn al-Haytham',
        teachingCycle: 'Cycle d\'enseignement', subject: 'Matière principale', subjectPlaceholder: 'Choisir une matière',
        classesToCreate: 'Classes à créer', levelPlaceholder: 'Niveau / filière',
        groupPlaceholder: 'N° 1–99', deleteRow: 'Supprimer cette ligne',
        addedClasses: n => `${n} ajoutée${n > 1 ? 's' : ''}`,
        step: (current, total) => `Étape ${current} sur ${total}`,
        cycleLabels: { college: 'Collège', lycee: 'Lycée', prepa: 'Prépa' },
        levelGroupLabels: { college: 'Collège', common: 'Tronc commun', firstBac: '1re Bac', secondBac: '2e Bac', prepa: 'Classes préparatoires' },
        addRow: 'Ajouter une ligne',
        groupHint: 'N° obligatoire de 1 à 99 · unique pour un même niveau.',
        missingGroup: 'Indiquez le numéro de groupe.', invalidGroup: 'Utilisez un numéro de 1 à 99.',
        duplicateGroup: 'Ce numéro est déjà utilisé dans cette liste.', existingGroup: 'Cette classe existe déjà.',
        later: 'Plus tard', back: 'Retour', next: 'Suivant',
    },
    ar: {
        title: 'مرحباً', subtitle: 'لنأخذ بضع لحظات لإعداد مساحتك.',
        start: 'الدخول إلى مساحتي',
        createClasses: n => (n > 1 ? `إضافة ${n} أقسام` : 'إضافة هذا القسم'),
        classAdded: n => `تمت إضافة ${n} ${n > 1 ? 'أقسام' : 'قسم'}.`,
        notifications: 'عند التأكيد، سيقترح هاتفكم تفعيل الإشعارات الأصلية.',
        notificationsIOS: 'على iPhone وiPad، أضيفوا التطبيق أولاً إلى الشاشة الرئيسية لتفعيل الإشعارات.',
        sectionProfile: 'الملف الشخصي', sectionClasses: 'أقسامك', sectionSchedule: 'الجدول الزمني',
        fullName: 'الاسم الكامل', fullNamePlaceholder: 'مثال: الأستاذ أحمد بنعلي',
        establishment: 'المؤسسة', establishmentPlaceholder: 'مثال: ثانوية ابن الهيثم',
        teachingCycle: 'السلك التعليمي', subject: 'المادة الرئيسية', subjectPlaceholder: 'اختر مادة',
        classesToCreate: 'الأقسام المراد إنشاؤها', levelPlaceholder: 'المستوى / الشعبة',
        groupPlaceholder: 'رقم 1–99', deleteRow: 'حذف هذا السطر',
        addedClasses: n => `${n} ${n > 1 ? 'أقسام مضافة' : 'قسم مضاف'}`,
        step: (current, total) => `المرحلة ${current} من ${total}`,
        cycleLabels: { college: 'الإعدادي', lycee: 'الثانوي', prepa: 'الأقسام التحضيرية' },
        levelGroupLabels: { college: 'الإعدادي', common: 'الجذع المشترك', firstBac: 'الأولى باك', secondBac: 'الثانية باك', prepa: 'الأقسام التحضيرية' },
        addRow: 'إضافة سطر',
        groupHint: 'رقم من 1 إلى 99 مطلوب وفريد داخل المستوى نفسه.', missingGroup: 'أدخل رقم المجموعة.',
        invalidGroup: 'استخدم رقماً من 1 إلى 99.', duplicateGroup: 'هذا الرقم مكرر في هذه اللائحة.',
        existingGroup: 'هذا القسم موجود بالفعل.', later: 'لاحقاً', back: 'رجوع', next: 'التالي',
    },
};

/**
 * Page de démarrage immersive (première connexion). Même logique métier
 * que l'OnboardingModal, mais en page pleine avec hero section.
 */
export const OnboardingPage: React.FC<OnboardingPageProps> = ({
    config, onConfigChange, classes, onCreateClass, onOpenNotebook, onComplete, onSkip,
}) => {
    const { lang, setLang } = useModalLang(LANG_KEY, 'fr', { preferDocumentLang: true });
    const [finishing, setFinishing] = useState(false);
    const [step, setStep] = useState(1);
    const isAr = lang === 'ar';
    const t = TEXTS[lang];
    const hasClasses = classes.length > 0;
    const cycle: Cycle = (config.selectedCycles?.[0] as Cycle) ?? 'lycee';

    const iosNeedsInstall = typeof navigator !== 'undefined'
        && /iphone|ipad|ipod/i.test(navigator.userAgent)
        && !(window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

    // Step 1: profile validation
    const isStep1Valid = !!(config.defaultTeacherName && config.defaultTeacherName.trim().length > 0);
    const isStep2Valid = hasClasses;

    // Step 2: class rows
    const defaultLevel = LEVEL_GROUPS[cycle][0]?.levels[0] ?? '';
    const [subject, setSubject] = useState<string>(config.selectedSubjects?.[0] ?? 'Mathématiques');
    const [rows, setRows] = useState<ClassRow[]>([{ level: defaultLevel, group: '' }]);
    const [showGroupValidation, setShowGroupValidation] = useState(false);

    const rowValidations = useMemo<ClassRowValidation[]>(() => {
        const validations = rows.map(row => {
            const groupNumber = normalizeGroupNumber(row.group);
            const key = row.level && groupNumber
                ? `${row.level.trim().toLocaleLowerCase('fr').replace(/\s+/g, ' ')}:${groupNumber}`
                : null;
            const issue = ((!row.group.trim()
                ? 'missingGroup'
                : !groupNumber ? 'invalidGroup' : null)) as ClassRowIssue | null;
            return { groupNumber, key, issue };
        });
        const firstRowByKey = new Map<string, number>();
        validations.forEach((v, i) => {
            if (!v.key || v.issue) return;
            if (classes.some(c => isSameClassGroup(c.name, rows[i].level, v.groupNumber!))) { v.issue = 'existingGroup'; return; }
            const fi = firstRowByKey.get(v.key);
            if (fi === undefined) { firstRowByKey.set(v.key, i); return; }
            v.issue = 'duplicateGroup';
            validations[fi].issue = 'duplicateGroup';
        });
        return validations;
    }, [classes, rows]);

    const canCreateBatch = rows.length > 0 && rowValidations.every(v => !v.issue && !!v.groupNumber);

    const getRowIssueText = (issue: ClassRowIssue | null) => {
        if (issue === 'missingGroup') return t.missingGroup;
        if (issue === 'invalidGroup') return t.invalidGroup;
        if (issue === 'duplicateGroup') return t.duplicateGroup;
        if (issue === 'existingGroup') return t.existingGroup;
        return null;
    };

    const updateGroup = (index: number, value: string) => {
        setRows(prev => prev.map((row, i) => (i === index ? { ...row, group: sanitizeGroupNumberInput(value) } : row)));
    };

    const handleCycleChange = (nextCycle: Cycle) => {
        const nextDefaultLevel = LEVEL_GROUPS[nextCycle][0]?.levels[0] ?? '';
        onConfigChange({ selectedCycles: [nextCycle], showAllCycles: false });
        setRows(prev => prev.map(row => ({ ...row, level: nextDefaultLevel })));
        setShowGroupValidation(false);
    };

    const createBatch = () => {
        if (!canCreateBatch) { setShowGroupValidation(true); return; }
        let created = 0;
        rows.forEach((row, i) => {
            const gn = rowValidations[i].groupNumber;
            if (!gn) return;
            onCreateClass({ name: classNameForLevelAndGroup(row.level, gn), subject, cycle });
            created += 1;
        });
        if (created > 0) {
            toast.success(t.classAdded(created));
            setRows([{ level: defaultLevel, group: '' }]);
            setShowGroupValidation(false);
        }
    };

    const finish = async () => {
        if (finishing) return;
        setFinishing(true);
        try { await onComplete(); if (classes[0]) onOpenNotebook(classes[0]); }
        finally { setFinishing(false); }
    };

    return (
        <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Hero */}
            <header className="px-4 pt-10 pb-3 text-center sm:pt-16 sm:pb-4">
                <div className="mx-auto max-w-lg">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary mb-3 sm:h-14 sm:w-14 sm:mb-4">
                        <School className="h-6 w-6 sm:h-7 sm:w-7" />
                    </span>
                    <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{t.title}</h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">{t.subtitle}</p>
                    <LangToggle lang={lang} onChange={setLang} labels={{ fr: 'FR', ar: 'العربية' }} className="mt-3 rounded-lg" />
                </div>
            </header>

            {/* Step indicators */}
            <div className="px-4 sm:px-8">
                <div className="mx-auto max-w-2xl flex items-center gap-1.5" aria-label={t.step(step, 3)}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-sm transition-colors duration-200 ${step >= i ? 'bg-primary' : 'bg-muted'}`} />
                    ))}
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
                <div className="mx-auto max-w-2xl">

                    {/* Step 1 : Profil */}
                    {step === 1 && (
                        <div className="space-y-5 animate-fade-in duration-300">
                            <div>
                                <h3 className="mb-3 text-sm font-semibold">{t.sectionProfile}</h3>
                                <div className="grid max-w-xl gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-foreground">{t.fullName}</label>
                                        <Input type="text" value={config.defaultTeacherName || ''} onChange={e => onConfigChange({ defaultTeacherName: e.target.value })} placeholder={t.fullNamePlaceholder} className="h-9 bg-background border-border text-sm" autoFocus />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-foreground">{t.establishment}</label>
                                        <Input type="text" value={config.establishmentName || ''} onChange={e => onConfigChange({ establishmentName: e.target.value })} placeholder={t.establishmentPlaceholder} className="h-9 bg-background border-border text-sm" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.teachingCycle}</label>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    {CYCLES.map(c => {
                                        const active = cycle === c.key;
                                        return (
                                            <button key={c.key} type="button" onClick={() => handleCycleChange(c.key)}
                                                className={cn('group relative flex min-h-[72px] w-full cursor-pointer items-center gap-3.5 rounded-2xl border-2 p-3.5 text-start transition-all duration-200 outline-none',
                                                    active ? 'border-primary bg-primary/10 text-primary shadow-xs' : 'border-border bg-card text-muted-foreground hover:border-border hover:bg-muted')}>
                                                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105',
                                                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                                                    <c.icon className="h-6 w-6" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className="block text-sm font-bold leading-tight">{t.cycleLabels[c.key]}</span>
                                                    <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
                                                        {c.key === 'college' ? (isAr ? 'من الأولى إلى الثالثة إعدادي' : '1AC à 3AC') : c.key === 'lycee' ? (isAr ? 'الجذع المشترك والبكالوريا' : 'TC, 1BAC, 2BAC') : (isAr ? 'الأقسام التحضيرية للمدارس العليا' : 'CPGE (1ère & 2ème année)')}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2 : Classes */}
                    {step === 2 && (
                        <div className="space-y-4 animate-fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">{t.sectionClasses}</h3>
                                {hasClasses && <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">{t.addedClasses(classes.length)}</span>}
                            </div>
                            <div className="space-y-4">
                                <div className="max-w-sm">
                                    <label className="mb-1.5 block text-xs font-medium text-foreground">{t.subject}</label>
                                    <Select value={subject} onValueChange={setSubject}>
                                        <SelectTrigger className="h-9 bg-background text-sm"><SelectValue placeholder={t.subjectPlaceholder} /></SelectTrigger>
                                        <SelectContent>
                                            {(config.selectedSubjects?.length ? config.selectedSubjects : [...SUBJECTS]).map(s => (
                                                <SelectItem key={s} value={s}>{formatLocalizedSubjectDisplayName(s, lang)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2.5">
                                    <div>
                                        <label className="block text-xs font-medium text-foreground">{t.classesToCreate}</label>
                                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t.groupHint}</p>
                                    </div>
                                    {rows.map((row, index) => (
                                        <div key={index} className="space-y-1">
                                            <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_6.5rem_auto] items-center gap-2">
                                                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">{index + 1}</span>
                                                <Select value={row.level} onValueChange={value => setRows(prev => prev.map((c, i) => (i === index ? { ...c, level: value } : c)))}>
                                                    <SelectTrigger className="h-9 min-w-0 bg-background text-sm"><SelectValue placeholder={t.levelPlaceholder} /></SelectTrigger>
                                                    <SelectContent>
                                                        {LEVEL_GROUPS[cycle].map(group => (
                                                            <SelectGroup key={group.key}>
                                                                <SelectLabel className="text-xs font-semibold text-muted-foreground">{t.levelGroupLabels[group.key]}</SelectLabel>
                                                                {group.levels.map(level => <SelectItem key={level} value={level}>{formatLocalizedClassDisplayName(level, lang)}</SelectItem>)}
                                                            </SelectGroup>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Input type="text" value={row.group} onChange={event => updateGroup(index, event.target.value)}
                                                    onBlur={() => { const next = normalizeGroupNumber(row.group); if (next) setRows(prev => prev.map((c, i) => (i === index ? { ...c, group: next } : c))); }}
                                                    placeholder={t.groupPlaceholder}
                                                    className={`h-9 min-w-0 bg-background px-2 text-center text-sm ${rowValidations[index].issue && (showGroupValidation || row.group) ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                                                    inputMode="numeric" maxLength={2} aria-invalid={!!rowValidations[index].issue} />
                                                {rows.length > 1 ? (
                                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => setRows(prev => prev.filter((_, i) => i !== index))} aria-label={t.deleteRow}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                ) : <span className="h-8 w-8" />}
                                            </div>
                                            {rowValidations[index].issue && (showGroupValidation || row.group) && (
                                                <p className={`${isAr ? 'pr-7' : 'pl-7'} text-[11px] font-medium text-destructive`}>{getRowIssueText(rowValidations[index].issue)}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <Button type="button" variant="outline" size="sm" className="h-8 border-primary/30 px-2.5 text-xs text-primary hover:bg-primary/10"
                                        onClick={() => setRows(prev => [...prev, { level: prev[prev.length - 1]?.level || defaultLevel, group: '' }])}>
                                        <Plus className={isAr ? 'ml-1 h-3.5 w-3.5' : 'mr-1 h-3.5 w-3.5'} />{t.addRow}
                                    </Button>
                                    <Button type="button" size="sm" className="h-8 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90" onClick={createBatch} disabled={!canCreateBatch}>{t.createClasses(rows.length)}</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3 : Emploi du temps */}
                    {step === 3 && (
                        <div className="space-y-4 animate-fade-in duration-300">
                            <h3 className="text-sm font-semibold">{t.sectionSchedule}</h3>
                            <div className="overflow-hidden rounded-lg border border-border bg-background text-sm">
                                <ScheduleTab classes={classes} config={config} onChange={onConfigChange}
                                    onCreateClass={details => onCreateClass({ ...details, cycle: details.cycle ?? cycle })} />
                            </div>
                            <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/50 p-2.5">
                                <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                <p className="text-[11px] leading-relaxed text-foreground">{iosNeedsInstall ? t.notificationsIOS : t.notifications}</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border bg-card/80 px-4 py-4 sm:px-8 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
                    {step === 1 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={onSkip} className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer">{t.later}</Button>
                    ) : (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer inline-flex items-center gap-1.5">
                            {isAr ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}{t.back}
                        </Button>
                    )}
                    {step < 3 ? (
                        <Button type="button" size="sm" disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
                            className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                            onClick={() => setStep(s => s + 1)}>
                            {t.next}{isAr ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>
                    ) : (
                        <Button type="button" size="sm"
                            className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                            disabled={!hasClasses || finishing} onClick={finish}>
                            {finishing ? 'Activation…' : t.start}{isAr ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>
                    )}
                </div>
            </footer>
        </div>
    );
};
