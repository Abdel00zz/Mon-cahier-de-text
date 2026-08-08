import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScheduleTab } from '@/features/settings/components/ScheduleTab';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { classNameForLevelAndGroup, isSameClassGroup, normalizeGroupNumber, sanitizeGroupNumberInput } from '@/utils/classGroup';
import { Bell, GraduationCap, School, FlaskConical, Trash2, Plus, ChevronRight } from '@/components/ui/icons';

type Lang = 'fr' | 'ar';
const LANG_KEY = 'onboarding_lang_v1';

const readLang = (): Lang => {
    try {
        if (document.documentElement.lang === 'ar') return 'ar';
        return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'fr';
    } catch {
        return typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar' : 'fr';
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

const CYCLES: { key: Cycle; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'college', icon: School },
    { key: 'lycee', icon: GraduationCap },
    { key: 'prepa', icon: FlaskConical },
];

const LEVEL_GROUPS: Record<Cycle, { key: 'college' | 'common' | 'firstBac' | 'secondBac' | 'prepa'; levels: string[] }[]> = {
    college: [{ key: 'college', levels: CLASS_LEVELS_BY_CYCLE.college }],
    lycee: [
        { key: 'common', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(l => l.startsWith('Tronc')) },
        { key: 'firstBac', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(l => l.startsWith('1BAC')) },
        { key: 'secondBac', levels: CLASS_LEVELS_BY_CYCLE.lycee.filter(l => l.startsWith('2BAC')) },
    ],
    prepa: [{ key: 'prepa', levels: CLASS_LEVELS_BY_CYCLE.prepa }],
};

const TEXTS: Record<Lang, {
    title: string;
    subtitle: string;
    start: string;
    createClasses: (n: number) => string;
    classAdded: (n: number) => string;
    notifications: string;
    notificationsIOS: string;
    sectionProfile: string;
    sectionClasses: string;
    sectionSchedule: string;
    fullName: string;
    fullNamePlaceholder: string;
    establishment: string;
    establishmentPlaceholder: string;
    teachingCycle: string;
    subject: string;
    subjectPlaceholder: string;
    classesToCreate: string;
    levelPlaceholder: string;
    groupPlaceholder: string;
    deleteRow: string;
    addedClasses: (n: number) => string;
    step: (current: number, total: number) => string;
    cycleLabels: Record<Cycle, string>;
    levelGroupLabels: Record<'college' | 'common' | 'firstBac' | 'secondBac' | 'prepa', string>;
    addRow: string;
    groupHint: string;
    missingGroup: string;
    invalidGroup: string;
    duplicateGroup: string;
    existingGroup: string;
    later: string;
    back: string;
    next: string;
}> = {
    fr: {
        title: 'Bienvenue',
        subtitle: 'Configurez votre espace en trois étapes.',
        start: 'Ouvrir mes cahiers',
        createClasses: n => (n > 1 ? `Ajouter ${n} classes` : 'Ajouter cette classe'),
        classAdded: n => `${n} classe${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}.`,
        notifications: 'Activez les notifications de séance depuis les réglages de votre téléphone.',
        notificationsIOS: 'Sur iPhone/iPad, ajoutez d’abord l’application à l’écran d’accueil pour activer les notifications.',
        sectionProfile: 'Vos informations',
        sectionClasses: 'Classes',
        sectionSchedule: 'Emploi du temps',
        fullName: 'Nom complet',
        fullNamePlaceholder: 'Ex. : M. Ahmed Benali',
        establishment: 'Établissement',
        establishmentPlaceholder: 'Ex. : Lycée Ibn al-Haytham',
        teachingCycle: "Cycle d’enseignement",
        subject: 'Matière principale',
        subjectPlaceholder: 'Choisir une matière',
        classesToCreate: 'Classes à créer',
        levelPlaceholder: 'Niveau / filière',
        groupPlaceholder: 'N° 1–99',
        deleteRow: 'Supprimer cette ligne',
        addedClasses: n => `${n} ajoutée${n > 1 ? 's' : ''}`,
        step: (current, total) => `Étape ${current} sur ${total}`,
        cycleLabels: { college: 'Collège', lycee: 'Lycée', prepa: 'Prépa' },
        levelGroupLabels: { college: 'Collège', common: 'Tronc commun', firstBac: '1re Bac', secondBac: '2e Bac', prepa: 'Classes préparatoires' },
        addRow: 'Ajouter une ligne',
        groupHint: 'N° obligatoire de 1 à 99 · unique pour un même niveau.',
        missingGroup: 'Indiquez le numéro de groupe.',
        invalidGroup: 'Utilisez un numéro de 1 à 99.',
        duplicateGroup: 'Ce numéro est déjà utilisé dans cette liste.',
        existingGroup: 'Cette classe existe déjà.',
        later: 'Plus tard',
        back: 'Retour',
        next: 'Suivant',
    },
    ar: {
        title: 'مرحباً',
        subtitle: 'لنأخذ بضع لحظات لإعداد مساحتك.',
        start: 'الدخول إلى مساحتي',
        createClasses: n => (n > 1 ? `إضافة ${n} أقسام` : 'إضافة هذا القسم'),
        classAdded: n => `تمت إضافة ${n} ${n > 1 ? 'أقسام' : 'قسم'}.`,
        notifications: 'عند التأكيد، سيقترح هاتفكم تفعيل الإشعارات الأصلية.',
        notificationsIOS: 'على iPhone وiPad، أضيفوا التطبيق أولاً إلى الشاشة الرئيسية لتفعيل الإشعارات.',
        sectionProfile: 'الملف الشخصي',
        sectionClasses: 'أقسامك',
        sectionSchedule: 'الجدول الزمني',
        fullName: 'الاسم الكامل',
        fullNamePlaceholder: 'مثال: الأستاذ أحمد بنعلي',
        establishment: 'المؤسسة',
        establishmentPlaceholder: 'مثال: ثانوية ابن الهيثم',
        teachingCycle: 'السلك التعليمي',
        subject: 'المادة الرئيسية',
        subjectPlaceholder: 'اختر مادة',
        classesToCreate: 'الأقسام المراد إنشاؤها',
        levelPlaceholder: 'المستوى / الشعبة',
        groupPlaceholder: 'رقم 1–99',
        deleteRow: 'حذف هذا السطر',
        addedClasses: n => `${n} ${n > 1 ? 'أقسام مضافة' : 'قسم مضاف'}`,
        step: (current, total) => `المرحلة ${current} من ${total}`,
        cycleLabels: { college: 'الإعدادي', lycee: 'الثانوي', prepa: 'الأقسام التحضيرية' },
        levelGroupLabels: { college: 'الإعدادي', common: 'الجذع المشترك', firstBac: 'الأولى باك', secondBac: 'الثانية باك', prepa: 'الأقسام التحضيرية' },
        addRow: 'إضافة سطر',
        groupHint: 'رقم من 1 إلى 99 مطلوب وفريد داخل المستوى نفسه.',
        missingGroup: 'أدخل رقم المجموعة.',
        invalidGroup: 'استخدم رقماً من 1 إلى 99.',
        duplicateGroup: 'هذا الرقم مكرر في هذه اللائحة.',
        existingGroup: 'هذا القسم موجود بالفعل.',
        later: 'لاحقاً',
        back: 'رجوع',
        next: 'التالي',
    },
};

interface ClassRow {
    level: string;
    group: string;
}

type ClassRowIssue = 'missingGroup' | 'invalidGroup' | 'duplicateGroup' | 'existingGroup';

interface ClassRowValidation {
    groupNumber: string | null;
    key: string | null;
    issue: ClassRowIssue | null;
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
    const cycle: Cycle = (config.selectedCycles?.[0] as Cycle) ?? 'lycee';

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
            const issue: ClassRowIssue | null = !row.group.trim()
                ? 'missingGroup'
                : !groupNumber
                    ? 'invalidGroup'
                    : null;
            const validation: ClassRowValidation = { groupNumber, key, issue };
            return validation;
        });

        const firstRowByKey = new Map<string, number>();
        validations.forEach((validation, index) => {
            if (!validation.key || validation.issue) return;
            if (classes.some(classInfo => isSameClassGroup(classInfo.name, rows[index].level, validation.groupNumber!))) {
                validation.issue = 'existingGroup';
                return;
            }

            const firstIndex = firstRowByKey.get(validation.key);
            if (firstIndex === undefined) {
                firstRowByKey.set(validation.key, index);
                return;
            }

            validation.issue = 'duplicateGroup';
            validations[firstIndex].issue = 'duplicateGroup';
        });

        return validations;
    }, [classes, rows]);

    const canCreateBatch = rows.length > 0 && rowValidations.every(validation => !validation.issue && !!validation.groupNumber);

    const getRowIssueText = (issue: ClassRowIssue | null) => {
        if (issue === 'missingGroup') return t.missingGroup;
        if (issue === 'invalidGroup') return t.invalidGroup;
        if (issue === 'duplicateGroup') return t.duplicateGroup;
        if (issue === 'existingGroup') return t.existingGroup;
        return null;
    };

    const updateGroup = (index: number, value: string) => {
        setRows(prev => prev.map((row, rowIndex) => (
            rowIndex === index ? { ...row, group: sanitizeGroupNumberInput(value) } : row
        )));
    };

    const handleCycleChange = (nextCycle: Cycle) => {
        const nextDefaultLevel = LEVEL_GROUPS[nextCycle][0]?.levels[0] ?? '';
        onConfigChange({ selectedCycles: [nextCycle], showAllCycles: false });
        setRows(prev => prev.map(row => ({ ...row, level: nextDefaultLevel })));
        setShowGroupValidation(false);
    };

    const createBatch = () => {
        if (!canCreateBatch) {
            setShowGroupValidation(true);
            return;
        }

        let created = 0;
        rows.forEach((row, index) => {
            const groupNumber = rowValidations[index].groupNumber;
            if (!groupNumber) return;
            const name = classNameForLevelAndGroup(row.level, groupNumber);
            onCreateClass({ name, subject, cycle });
            created += 1;
        });
        if (created > 0) {
            toast.success(t.classAdded(created));
            setRows([{ level: defaultLevel, group: '' }]);
            setShowGroupValidation(false);
        }
    };
    
    const renderStepIndicators = () => (
        <div className="mb-4 flex items-center gap-1.5" aria-label={t.step(step, 3)}>
            {[1, 2, 3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-sm ${step >= i ? 'bg-[#0056D2]' : 'bg-muted'}`} />
            ))}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            hideClose={true}
            maxWidth="2xl"
            className="flex max-h-[92dvh] flex-col overflow-hidden rounded-t-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-lg"
            bodyClassName="custom-scrollbar overflow-y-auto !px-4 !py-4 sm:!px-5 sm:!py-4"
            footerClassName="!flex-row !items-center !justify-between bg-background !px-4 !py-3 sm:!px-5 sm:!py-3"
            footer={
                <div dir={isAr ? 'rtl' : 'ltr'} className="flex w-full items-center justify-between gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={step === 1 ? onClose : () => setStep(current => current - 1)}
                        className="h-8 px-2 text-xs font-medium text-muted-foreground"
                    >
                        {step === 1 ? t.later : t.back}
                    </Button>
                    {step < 3 ? (
                        <Button
                            type="button"
                            size="sm"
                            className="h-8 px-3.5 text-xs bg-[#0056D2] hover:bg-[#0047b3] text-white"
                            onClick={() => setStep(current => current + 1)}
                        >
                            {t.next}
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            size="sm"
                            className="h-8 px-3.5 text-xs bg-[#0056D2] hover:bg-[#0047b3] text-white"
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
            }
        >
            <div dir={isAr ? 'rtl' : 'ltr'} className={`flex h-full flex-col ${isAr ? 'font-ar' : ''} text-left`}>
                
                <div className="mb-3 flex w-full items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-foreground">{t.title}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.subtitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center rounded-lg border border-border bg-muted/50 p-0.5">
                        {(['fr', 'ar'] as const).map(l => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => setLang(l)}
                                aria-pressed={lang === l}
                                className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
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
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="mb-3 text-sm font-semibold">{t.sectionProfile}</h3>
                                <div className="grid max-w-xl gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-foreground">{t.fullName}</label>
                                        <Input
                                            type="text"
                                            value={config.defaultTeacherName || ''}
                                            onChange={e => onConfigChange({ defaultTeacherName: e.target.value })}
                                            placeholder={t.fullNamePlaceholder}
                                            className="h-9 bg-background border-border text-sm"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-foreground">{t.establishment}</label>
                                        <Input
                                            type="text"
                                            value={config.establishmentName || ''}
                                            onChange={e => onConfigChange({ establishmentName: e.target.value })}
                                            placeholder={t.establishmentPlaceholder}
                                            className="h-9 bg-background border-border text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="mb-2 block text-xs font-medium text-foreground">{t.teachingCycle}</label>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                    {CYCLES.map(c => {
                                        const active = cycle === c.key;
                                        return (
                                            <button
                                                key={c.key}
                                                type="button"
                                                onClick={() => handleCycleChange(c.key)}
                                                className={`flex h-10 items-center gap-2 rounded-lg border px-2.5 text-left transition-all ${
                                                    active
                                                        ? 'border-[#0056D2] bg-blue-50/50 text-[#0056D2] shadow-sm dark:bg-[#0056D2]/10'
                                                        : 'border-border bg-background hover:border-border/80 hover:bg-muted/50 text-foreground'
                                                }`}
                                            >
                                                <div className={`rounded-md p-1 ${active ? 'bg-[#0056D2]/10' : 'bg-muted'}`}>
                                                    <c.icon className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="text-xs font-medium">{t.cycleLabels[c.key]}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">{t.sectionClasses}</h3>
                                {hasClasses && (
                                    <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-[#0056D2] dark:bg-blue-900/20">
                                        {t.addedClasses(classes.length)}
                                    </span>
                                )}
                            </div>
                            
                            <div className="space-y-4">
                                <div className="max-w-sm">
                                    <label className="mb-1.5 block text-xs font-medium text-foreground">{t.subject}</label>
                                    <Select value={subject} onValueChange={setSubject}>
                                        <SelectTrigger className="h-9 bg-background text-sm">
                                            <SelectValue placeholder={t.subjectPlaceholder} />
                                        </SelectTrigger>
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
                                                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 text-[10px] font-bold text-[#0056D2]">
                                                    {index + 1}
                                                </span>
                                                <Select
                                                    value={row.level}
                                                    onValueChange={value => setRows(prev => prev.map((current, rowIndex) => (rowIndex === index ? { ...current, level: value } : current)))}
                                                >
                                                    <SelectTrigger className="h-9 min-w-0 bg-background text-sm">
                                                        <SelectValue placeholder={t.levelPlaceholder} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {LEVEL_GROUPS[cycle].map(group => (
                                                            <SelectGroup key={group.key}>
                                                                <SelectLabel className="text-xs font-semibold text-muted-foreground">{t.levelGroupLabels[group.key]}</SelectLabel>
                                                                {group.levels.map(level => (
                                                                    <SelectItem key={level} value={level}>
                                                                        {formatLocalizedClassDisplayName(level, lang)}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    type="text"
                                                    value={row.group}
                                                    onChange={event => updateGroup(index, event.target.value)}
                                                    onBlur={() => {
                                                        const next = normalizeGroupNumber(row.group);
                                                        if (next) setRows(prev => prev.map((current, rowIndex) => (rowIndex === index ? { ...current, group: next } : current)));
                                                    }}
                                                    placeholder={t.groupPlaceholder}
                                                    className={`h-9 min-w-0 bg-background px-2 text-center text-sm ${rowValidations[index].issue && (showGroupValidation || row.group) ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                                                    inputMode="numeric"
                                                    maxLength={2}
                                                    aria-invalid={!!rowValidations[index].issue}
                                                />
                                                {rows.length > 1 ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => setRows(prev => prev.filter((_, rowIndex) => rowIndex !== index))}
                                                        aria-label={t.deleteRow}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                ) : <span className="h-8 w-8" />}
                                            </div>
                                            {rowValidations[index].issue && (showGroupValidation || row.group) && (
                                                <p className={`${isAr ? 'pr-7' : 'pl-7'} text-[11px] font-medium text-destructive`}>
                                                    {getRowIssueText(rowValidations[index].issue)}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        className="h-8 border-blue-200 px-2.5 text-xs text-[#0056D2] hover:bg-blue-50 dark:border-blue-900/50 dark:hover:bg-blue-900/20"
                                        onClick={() => setRows(prev => [...prev, { level: prev[prev.length - 1]?.level || defaultLevel, group: '' }])}
                                    >
                                        <Plus className={isAr ? 'ml-1 h-3.5 w-3.5' : 'mr-1 h-3.5 w-3.5'} />
                                        {t.addRow}
                                    </Button>
                                    
                                    <Button 
                                        type="button" 
                                        size="sm"
                                        className="h-8 bg-[#0056D2] px-3 text-xs text-white hover:bg-[#0047b3]"
                                        onClick={createBatch} 
                                        disabled={!canCreateBatch}
                                    >
                                        {t.createClasses(rows.length)}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-sm font-semibold">{t.sectionSchedule}</h3>
                            <div className="overflow-hidden rounded-lg border border-border bg-background text-sm">
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
                            
                            <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/50 p-2.5">
                                <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0056D2]" />
                                <p className="text-[11px] leading-relaxed text-foreground">
                                    {iosNeedsInstall ? t.notificationsIOS : t.notifications}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </Modal>
    );
};
