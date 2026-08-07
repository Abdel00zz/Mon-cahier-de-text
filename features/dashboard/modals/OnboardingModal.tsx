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
import { Bell, BookOpen, GraduationCap, School, FlaskConical, Trash2, Plus, ChevronRight } from '@/components/ui/icons';

type Lang = 'fr' | 'ar';
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
    onClose: () => void;
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
    subtitle: string;
    start: string;
    createClasses: (n: number) => string;
    notifications: string;
    notificationsIOS: string;
    sectionProfile: string;
    sectionClasses: string;
    sectionSchedule: string;
}> = {
    fr: {
        title: 'Bienvenue',
        subtitle: 'Prenons quelques instants pour configurer votre espace.',
        start: 'Accéder à mon espace',
        createClasses: n => (n > 1 ? `Ajouter ${n} classes` : 'Ajouter cette classe'),
        notifications: 'À la validation, votre téléphone proposera d’activer les notifications natives.',
        notificationsIOS: 'Sur iPhone/iPad, installez d’abord l’application sur l’écran d’accueil pour activer les notifications.',
        sectionProfile: 'Profil enseignant',
        sectionClasses: 'Vos classes',
        sectionSchedule: 'Emploi du temps'
    },
    ar: {
        title: 'مرحباً',
        subtitle: 'لنأخذ بضع لحظات لإعداد مساحتك.',
        start: 'الدخول إلى مساحتي',
        createClasses: n => (n > 1 ? `إضافة ${n} فصول` : 'إضافة هذا الفصل'),
        notifications: 'عند التأكيد، سيقترح هاتفكم تفعيل الإشعارات الأصلية.',
        notificationsIOS: 'على iPhone وiPad، أضيفوا التطبيق أولاً إلى الشاشة الرئيسية لتفعيل الإشعارات.',
        sectionProfile: 'الملف الشخصي',
        sectionClasses: 'فصولك',
        sectionSchedule: 'الجدول الزمني'
    },
};

interface ClassRow {
    level: string;
    group: string;
}

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
    const [step, setStep] = useState(1);
    
    const isAr = lang === 'ar';
    const t = TEXTS[lang];
    const iosNeedsInstall = typeof navigator !== 'undefined'
        && /iphone|ipad|ipod/i.test(navigator.userAgent)
        && !(window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

    const setLang = (next: Lang) => {
        setLangState(next);
        try { localStorage.setItem(LANG_KEY, next); } catch { /* stockage indisponible */ }
    };

    const hasClasses = classes.length > 0;

    const calendar = getBundledCalendar();
    const yearLabel = getSchoolYearFor(calendar, todayInMorocco(new Date(), calendar)).libelle;
    const cycle: Cycle = (config.selectedCycles?.[0] as Cycle) ?? 'lycee';

    const defaultLevel = LEVEL_GROUPS[cycle][0]?.levels[0] ?? '';
    const [subject, setSubject] = useState<string>(config.selectedSubjects?.[0] ?? 'Mathématiques');
    const [rows, setRows] = useState<ClassRow[]>([{ level: defaultLevel, group: '' }]);

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
                skipped += 1;
                return;
            }
            existing.add(name.toLocaleLowerCase('fr'));
            onCreateClass({ name, subject, cycle });
            created += 1;
        });
        if (created > 0) {
            toast.success(`${created} classe${created > 1 ? 's' : ''} ajoutée${created > 1 ? 's' : ''}.`);
            setRows([{ level: defaultLevel, group: '' }]); 
        }
        if (skipped > 0) toast.info(`${skipped} classe${skipped > 1 ? 's' : ''} déjà existante${skipped > 1 ? 's' : ''}.`);
    };
    
    const renderStepIndicators = () => (
        <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-[#0056D2]' : 'bg-muted'}`} />
            ))}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            hideClose={true}
            maxWidth="2xl"
            className="h-[96vh] max-h-[96vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden p-0"
            bodyClassName="flex-1 custom-scrollbar overflow-y-auto px-5 sm:px-8 py-6"
        >
            <div dir={isAr ? 'rtl' : 'ltr'} className={`flex flex-col h-full ${isAr ? 'font-ar text-right' : 'text-left'}`}>
                
                <div className="flex w-full items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-foreground tracking-tight">{t.title}</h2>
                        <p className="text-muted-foreground mt-1 text-sm">{t.subtitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center rounded-full border border-border bg-muted/50 p-1">
                        {(['fr', 'ar'] as const).map(l => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => setLang(l)}
                                aria-pressed={lang === l}
                                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                    lang === l ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {l === 'fr' ? 'FR' : 'العربية'}
                            </button>
                        ))}
                    </div>
                </div>

                {renderStepIndicators()}

                <div className="flex-1">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">{t.sectionProfile}</h3>
                                <div className="space-y-4 max-w-md" dir="ltr">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Nom complet</label>
                                        <Input
                                            type="text"
                                            value={config.defaultTeacherName || ''}
                                            onChange={e => onConfigChange({ defaultTeacherName: e.target.value })}
                                            placeholder="Ex : M. Ahmed Benali"
                                            className="h-10 bg-background border-border"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Établissement</label>
                                        <Input
                                            type="text"
                                            value={config.establishmentName || ''}
                                            onChange={e => onConfigChange({ establishmentName: e.target.value })}
                                            placeholder="Ex : Lycée Ibn al-Haytham"
                                            className="h-10 bg-background border-border"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-foreground block mb-3" dir="ltr">Cycle d'enseignement</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" dir="ltr">
                                    {CYCLES.map(c => {
                                        const active = cycle === c.key;
                                        return (
                                            <button
                                                key={c.key}
                                                type="button"
                                                onClick={() => onConfigChange({ selectedCycles: [c.key], showAllCycles: false })}
                                                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                                                    active
                                                        ? 'border-[#0056D2] bg-blue-50/50 text-[#0056D2] shadow-sm dark:bg-[#0056D2]/10'
                                                        : 'border-border bg-background hover:border-border/80 hover:bg-muted/50 text-foreground'
                                                }`}
                                            >
                                                <div className={`p-1.5 rounded-md ${active ? 'bg-[#0056D2]/10' : 'bg-muted'}`}>
                                                    <c.icon className="h-4 w-4" />
                                                </div>
                                                <span className="font-medium text-sm">{c.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">{t.sectionClasses}</h3>
                                {hasClasses && (
                                    <span className="text-xs font-medium text-[#0056D2] bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full">
                                        {classes.length} ajoutée{classes.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            
                            <div className="space-y-5" dir="ltr">
                                <div className="max-w-sm">
                                    <label className="text-sm font-medium text-foreground block mb-2">Matière principale</label>
                                    <Select value={subject} onValueChange={setSubject}>
                                        <SelectTrigger className="h-10 bg-background">
                                            <SelectValue placeholder="Choisir une matière" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(config.selectedSubjects?.length ? config.selectedSubjects : [...SUBJECTS]).map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-foreground block">Liste des classes à ajouter</label>
                                    {rows.map((row, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                            <div className="w-5 h-5 rounded-full bg-blue-50 text-[#0056D2] flex items-center justify-center text-[10px] font-bold shrink-0 hidden sm:flex">
                                                {index + 1}
                                            </div>
                                            <Select
                                                value={row.level}
                                                onValueChange={value => setRows(prev => prev.map((r, i) => (i === index ? { ...r, level: value } : r)))}
                                            >
                                                <SelectTrigger className="h-10 flex-1 bg-background">
                                                    <SelectValue placeholder="Niveau / filière" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {LEVEL_GROUPS[cycle].map(group => (
                                                        <SelectGroup key={group.label}>
                                                            <SelectLabel className="font-semibold text-muted-foreground">{group.label}</SelectLabel>
                                                            {group.levels.map(l => (
                                                                <SelectItem key={l} value={l}>
                                                                    {formatClassDisplayName(l)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <Input
                                                    type="text"
                                                    value={row.group}
                                                    onChange={e => setRows(prev => prev.map((r, i) => (i === index ? { ...r, group: e.target.value } : r)))}
                                                    placeholder="N° (ex: 1)"
                                                    className="h-10 w-full sm:w-28 bg-background"
                                                    maxLength={6}
                                                />
                                                {rows.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => setRows(prev => prev.filter((_, i) => i !== index))}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        className="h-9 text-[#0056D2] border-blue-200 hover:bg-blue-50 dark:border-blue-900/50 dark:hover:bg-blue-900/20"
                                        onClick={() => setRows(prev => [...prev, { level: prev[prev.length-1]?.level || defaultLevel, group: '' }])}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                                        Ajouter classe
                                    </Button>
                                    
                                    <Button 
                                        type="button" 
                                        size="sm"
                                        className="h-9 px-4 bg-[#0056D2] hover:bg-[#0047b3] text-white" 
                                        onClick={createBatch} 
                                        disabled={!rows.some(r => r.level)}
                                    >
                                        {t.createClasses(rows.filter(r => r.level).length)}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-semibold">{t.sectionSchedule}</h3>
                            <div dir="ltr" className="border border-border rounded-xl bg-background overflow-hidden text-sm">
                                <ScheduleTab
                                    classes={classes}
                                    config={config}
                                    onChange={onConfigChange}
                                    onCreateClass={details => onCreateClass({
                                        ...details,
                                        cycle: details.cycle ?? cycle,
                                    })}
                                />
                            </div>
                            
                            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 mt-4 border border-border">
                                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#0056D2]" />
                                <p className="text-xs text-foreground leading-relaxed">
                                    {iosNeedsInstall ? t.notificationsIOS : t.notifications}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center justify-between pt-4 mt-6 border-t border-border">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
                        className="text-muted-foreground font-medium"
                    >
                        {step === 1 ? 'Plus tard' : 'Retour'}
                    </Button>
                    
                    {step < 3 ? (
                        <Button
                            type="button"
                            size="sm"
                            className="px-5 bg-[#0056D2] hover:bg-[#0047b3] text-white"
                            onClick={() => setStep(s => s + 1)}
                        >
                            Continuer
                            <ChevronRight className="h-4 w-4 ml-1.5" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            size="sm"
                            className="px-5 bg-[#0056D2] hover:bg-[#0047b3] text-white"
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
                            {finishing ? (isAr ? 'جارٍ التفعيل…' : 'Activation…') : t.start}
                        </Button>
                    )}
                </div>

            </div>
        </Modal>
    );
};
