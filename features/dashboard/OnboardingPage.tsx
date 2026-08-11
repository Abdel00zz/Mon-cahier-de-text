import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useModalLang, type ModalLang } from '@/components/ui/lang-toggle';
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
    sectionLanguage: string; languageSelect: string;
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
        title: 'Bienvenue', subtitle: 'Configurez votre espace de travail en quelques étapes.',
        start: 'Ouvrir mes cahiers',
        createClasses: n => (n > 1 ? `Ajouter ${n} classes` : 'Ajouter cette classe'),
        classAdded: n => `${n} classe${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}.`,
        notifications: 'Activez les notifications de séance dans les réglages de votre téléphone.',
        notificationsIOS: 'Sur iPhone/iPad, ajoutez d\'abord l\'application à l\'écran d\'accueil pour activer les notifications.',
        sectionLanguage: 'Langue', languageSelect: 'Choisissez votre langue principale',
        sectionProfile: 'Vos informations', sectionClasses: 'Classes', sectionSchedule: 'Emploi du temps',
        fullName: 'Nom complet', fullNamePlaceholder: 'Ex. : M. Ahmed Benali',
        establishment: 'Établissement', establishmentPlaceholder: 'Ex. : Lycée Ibn al-Haytham',
        teachingCycle: 'Cycle d\'enseignement', subject: 'Matière principale', subjectPlaceholder: 'Choisir une matière',
        classesToCreate: 'Classes à créer', levelPlaceholder: 'Niveau / filière',
        groupPlaceholder: 'N° 1–99', deleteRow: 'Supprimer cette ligne',
        addedClasses: n => `${n} ajoutée${n > 1 ? 's' : ''}`,
        step: (current, total) => `Étape ${current} sur ${total}`,
        cycleLabels: { college: 'Collège', lycee: 'Lycée qualifiant', prepa: 'Prépa' },
        levelGroupLabels: { college: 'Collège', common: 'Tronc commun', firstBac: '1re Bac', secondBac: '2e Bac', prepa: 'Classes préparatoires' },
        addRow: 'Ajouter une ligne',
        groupHint: 'N° obligatoire de 1 à 99 · unique pour un même niveau.',
        missingGroup: 'Indiquez le numéro de groupe.', invalidGroup: 'Utilisez un numéro de 1 à 99.',
        duplicateGroup: 'Ce numéro est déjà utilisé dans cette liste.', existingGroup: 'Cette classe existe déjà.',
        later: 'Plus tard', back: 'Retour', next: 'Suivant',
    },
    ar: {
        title: 'مرحباً', subtitle: 'لنأخذ بضع لحظات لإعداد مساحة العمل الخاصة بك.',
        start: 'الدخول إلى مساحتي',
        createClasses: n => (n > 1 ? `إضافة ${n} أقسام` : 'إضافة هذا القسم'),
        classAdded: n => `تمت إضافة ${n} ${n > 1 ? 'أقسام' : 'قسم'}.`,
        notifications: 'عند التأكيد، سيقترح هاتفكم تفعيل الإشعارات الأصلية.',
        notificationsIOS: 'على iPhone وiPad، أضيفوا التطبيق أولاً إلى الشاشة الرئيسية لتفعيل الإشعارات.',
        sectionLanguage: 'اللغة', languageSelect: 'اختر لغتك الرئيسية',
        sectionProfile: 'الملف الشخصي', sectionClasses: 'أقسامك', sectionSchedule: 'الجدول الزمني',
        fullName: 'الاسم الكامل', fullNamePlaceholder: 'مثال: الأستاذ أحمد بنعلي',
        establishment: 'المؤسسة', establishmentPlaceholder: 'مثال: ثانوية ابن الهيثم',
        teachingCycle: 'السلك التعليمي', subject: 'المادة الرئيسية', subjectPlaceholder: 'اختر مادة',
        classesToCreate: 'الأقسام المراد إنشاؤها', levelPlaceholder: 'المستوى / الشعبة',
        groupPlaceholder: 'رقم 1–99', deleteRow: 'حذف هذا السطر',
        addedClasses: n => `${n} ${n > 1 ? 'أقسام مضافة' : 'قسم مضاف'}`,
        step: (current, total) => `المرحلة ${current} من ${total}`,
        cycleLabels: { college: 'الإعدادي', lycee: 'الثانوي التأهيلي', prepa: 'الأقسام التحضيرية' },
        levelGroupLabels: { college: 'الإعدادي', common: 'الجذع المشترك', firstBac: 'الأولى باك', secondBac: 'الثانية باك', prepa: 'الأقسام التحضيرية' },
        addRow: 'إضافة سطر',
        groupHint: 'رقم من 1 إلى 99 مطلوب وفريد داخل المستوى نفسه.', missingGroup: 'أدخل رقم المجموعة.',
        invalidGroup: 'استخدم رقماً من 1 إلى 99.', duplicateGroup: 'هذا الرقم مكرر في هذه اللائحة.',
        existingGroup: 'هذا القسم موجود بالفعل.', later: 'لاحقاً', back: 'رجوع', next: 'التالي',
    },
};

/**
 * Page de démarrage immersive ultra avancée (première connexion).
 * Design inspiré des grandes entreprises : épuré, aéré, sans distraction.
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
    const totalSteps = 4;

    const iosNeedsInstall = typeof navigator !== 'undefined'
        && /iphone|ipad|ipod/i.test(navigator.userAgent)
        && !(window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

    // Step validations
    const isStep1Valid = true; // Langue (toujours valide)
    const isStep2Valid = !!(config.defaultTeacherName && config.defaultTeacherName.trim().length > 0);
    const isStep3Valid = hasClasses;

    // Class rows setup
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
            setRows([{ level: defaultLevel, group: '' }]);
            setShowGroupValidation(false);
        }
    };

    const finish = async () => {
        if (finishing) return;
        setFinishing(true);
        try { 
            await onComplete(); 
            toast.success(t.classAdded(classes.length));
            if (classes[0]) onOpenNotebook(classes[0]); 
        }
        finally { setFinishing(false); }
    };

    const handleNext = () => {
        if (step === 1 && isStep1Valid) setStep(2);
        else if (step === 2 && isStep2Valid) setStep(3);
        else if (step === 3 && isStep3Valid) setStep(4);
    };

    const renderHeaderTitle = () => {
        if (step === 1) return t.title;
        if (step === 2) return t.sectionProfile;
        if (step === 3) return t.sectionClasses;
        if (step === 4) return t.sectionSchedule;
        return '';
    };

    return (
        <div dir={isAr ? 'rtl' : 'ltr'} className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#eef2ff] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
            {/* Decorative wavy background shapes */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-50">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute -left-[10%] -top-[20%] h-[150%] w-[60%] fill-none stroke-current stroke-[8] text-[#c6d0ff]" style={{ filter: 'blur(4px)' }}>
                    <path d="M 0,0 C 30,20 20,80 50,50 S 70,80 100,100" />
                </svg>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute -bottom-[10%] -right-[10%] h-[120%] w-[50%] fill-none stroke-current stroke-[6] text-[#d7defe]" style={{ filter: 'blur(3px)' }}>
                    <path d="M 0,100 C 40,80 10,20 60,50 S 80,10 100,0" />
                </svg>
            </div>

            {/* Minimalist Logo Header */}
            <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
                <div className="flex items-center gap-2 text-slate-900">
                    <School className="w-6 h-6 sm:w-8 sm:h-8" />
                    <span className="text-lg sm:text-xl font-bold tracking-tight">Mon cahier</span>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-4 py-20 sm:px-8">
                <main className="relative m-auto flex w-full max-w-[760px] shrink-0 flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/95 shadow-[0_24px_64px_rgba(30,41,59,0.14)] backdrop-blur-sm">
                    
                    <div className="flex-1 px-5 pb-6 pt-7 sm:px-10 sm:pb-8 sm:pt-9">
                        
                        {/* Top Progress Bar inside Card */}
                        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 sm:h-2">
                            <div 
                                className="h-full rounded-full bg-[#5064df] transition-all duration-700 ease-out"
                                style={{ width: `${(step / totalSteps) * 100}%` }} 
                            />
                        </div>

                        {/* Dynamic Title */}
                        <div className="mb-7 animate-fade-in text-start">
                            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                                {renderHeaderTitle()}
                            </h1>
                            {step === 1 && <p className="text-base font-medium leading-relaxed text-slate-500 sm:text-lg">{t.subtitle}</p>}
                        </div>

                        {/* Step 1 : Langue */}
                        {step === 1 && (
                            <div className="space-y-4 animate-fade-in duration-500">
                            <p className="text-sm font-medium text-slate-600 sm:text-base">{t.languageSelect}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button 
                                    onClick={() => { setLang('fr'); setStep(2); }} 
                                    className={cn(
                                        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-blue-600/20 sm:p-8",
                                        lang === 'fr' 
                                            ? "border-[#5064df] bg-[#f4f6ff] text-blue-950 shadow-[0_8px_20px_rgba(80,100,223,0.12)]"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm"
                                    )}
                                > 
                                    <span className="text-3xl sm:text-4xl">🇫🇷</span>
                                    <span className="text-base sm:text-lg font-bold">Français</span>
                                </button>
                                <button 
                                    onClick={() => { setLang('ar'); setStep(2); }} 
                                    className={cn(
                                        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-blue-600/20 sm:p-8",
                                        lang === 'ar' 
                                            ? "border-[#5064df] bg-[#f4f6ff] text-blue-950 shadow-[0_8px_20px_rgba(80,100,223,0.12)]"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm"
                                    )}
                                > 
                                    <span className="text-3xl sm:text-4xl">🇲🇦</span>
                                    <span className="text-base sm:text-lg font-bold">العربية</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2 : Profil */}
                    {step === 2 && (
                        <div className="max-w-2xl space-y-6 animate-fade-in duration-500">
                            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                                <div className="space-y-1.5">
                                    <label className="block text-start text-sm font-semibold text-slate-800">{t.fullName}</label>
                                    <Input 
                                        type="text" 
                                        value={config.defaultTeacherName || ''} 
                                        onChange={e => onConfigChange({ defaultTeacherName: e.target.value })} 
                                        placeholder={t.fullNamePlaceholder} 
                                        className="h-12 rounded-lg border-slate-200 bg-white px-4 text-start text-base shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600"
                                        autoFocus 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-start text-sm font-semibold text-slate-800">{t.establishment}</label>
                                    <Input 
                                        type="text" 
                                        value={config.establishmentName || ''} 
                                        onChange={e => onConfigChange({ establishmentName: e.target.value })} 
                                        placeholder={t.establishmentPlaceholder} 
                                        className="h-12 rounded-lg border-slate-200 bg-white px-4 text-start text-base shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-3 border-t border-slate-200 pt-5">
                                <label className="block text-start text-sm font-semibold text-slate-800">{t.teachingCycle}</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {CYCLES.map(c => {
                                        const active = cycle === c.key;
                                        return (
                                            <button key={c.key} type="button" onClick={() => handleCycleChange(c.key)}
                                                className={cn('group relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-start outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-blue-600/20 sm:flex-col sm:items-start sm:p-4',
                                                    active ? 'border-[#5064df] bg-[#f4f6ff] shadow-[0_8px_18px_rgba(80,100,223,0.10)]' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm')}>
                                                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300',
                                                    active ? 'bg-[#5064df] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200')}>
                                                    <c.icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className={cn("block text-sm font-bold sm:text-base", active ? "text-blue-950" : "text-slate-900")}>{t.cycleLabels[c.key]}</span>
                                                    <span className={cn("mt-0.5 block text-xs font-medium", active ? "text-blue-700" : "text-slate-500")}>
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

                    {/* Step 3 : Classes */}
                    {step === 3 && (
                        <div className="space-y-6 animate-fade-in duration-500">
                            {hasClasses && (
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{t.addedClasses(classes.length)}</span>
                                </div>
                            )}
                            
                            <div className="max-w-md space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                                <label className="block text-start text-sm font-semibold text-slate-800">{t.subject}</label>
                                <Select value={subject} onValueChange={setSubject}>
                                    <SelectTrigger className="h-12 rounded-lg border-slate-200 bg-white text-start text-base shadow-sm hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600">
                                        <SelectValue placeholder={t.subjectPlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(config.selectedSubjects?.length ? config.selectedSubjects : [...SUBJECTS]).map(s => (
                                            <SelectItem key={s} value={s}>{formatLocalizedSubjectDisplayName(s, lang)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-4 border-t border-slate-200 pt-5">
                                <div>
                                    <label className="block text-start text-sm font-semibold text-slate-800">{t.classesToCreate}</label>
                                    <p className="mt-1 text-xs sm:text-sm text-slate-500">{t.groupHint}</p>
                                </div>
                                <div className="space-y-3">
                                    {rows.map((row, index) => (
                                        <div key={index} className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2 sm:flex-nowrap">
                                                <span className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-400">{index + 1}</span>
                                                
                                                <div className="flex-1 min-w-[160px]">
                                                    <Select value={row.level} onValueChange={value => setRows(prev => prev.map((c, i) => (i === index ? { ...c, level: value } : c)))}>
                                                        <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white text-start text-sm shadow-sm hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600 sm:text-base">
                                                            <SelectValue placeholder={t.levelPlaceholder} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {LEVEL_GROUPS[cycle].map(group => (
                                                                <SelectGroup key={group.key}>
                                                                    <SelectLabel className="text-xs sm:text-sm font-bold text-slate-400 py-2">{t.levelGroupLabels[group.key]}</SelectLabel>
                                                                    {group.levels.map(level => <SelectItem key={level} value={level}>{formatLocalizedClassDisplayName(level, lang)}</SelectItem>)}
                                                                </SelectGroup>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <Input 
                                                    type="text" 
                                                    value={row.group} 
                                                    onChange={event => updateGroup(index, event.target.value)}
                                                    onBlur={() => { const next = normalizeGroupNumber(row.group); if (next) setRows(prev => prev.map((c, i) => (i === index ? { ...c, group: next } : c))); }}
                                                    placeholder={t.groupPlaceholder}
                                                    className={cn(
                                                        "h-11 w-24 rounded-lg border-slate-200 bg-white text-center text-sm shadow-sm hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600 sm:w-28 sm:text-base",
                                                        rowValidations[index].issue && (showGroupValidation || row.group) ? 'border-red-500 bg-red-50 focus-visible:ring-red-500 text-red-900' : ''
                                                    )}
                                                    inputMode="numeric" maxLength={2} aria-invalid={!!rowValidations[index].issue} 
                                                />
                                                
                                                {rows.length > 1 ? (
                                                    <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                        onClick={() => setRows(prev => prev.filter((_, i) => i !== index))} aria-label={t.deleteRow}><Trash2 className="h-4 w-4" /></Button>
                                                ) : <span className="hidden h-11 w-11 shrink-0 sm:block" />}
                                            </div>
                                            {rowValidations[index].issue && (showGroupValidation || row.group) && (
                                                <p className="text-xs sm:text-sm font-medium text-red-600 ps-12">
                                                    {getRowIssueText(rowValidations[index].issue)}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                                    <Button type="button" variant="outline" className="h-10 rounded-lg border-slate-200 px-4 font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 sm:h-11 sm:px-6"
                                        onClick={() => setRows(prev => [...prev, { level: prev[prev.length - 1]?.level || defaultLevel, group: '' }])}>
                                        <Plus className="me-2 h-4 w-4" />{t.addRow}
                                    </Button>
                                    <Button type="button" className="h-10 rounded-lg bg-slate-900 px-6 font-semibold text-white shadow-sm hover:bg-slate-800 sm:h-11 sm:px-8"
                                        onClick={createBatch} disabled={!canCreateBatch}>
                                        {t.createClasses(rows.length)}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4 : Emploi du temps */}
                    {step === 4 && (
                        <div className="space-y-4 animate-fade-in duration-500">
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <ScheduleTab classes={classes} config={config} onChange={onConfigChange}
                                    onCreateClass={details => onCreateClass({ ...details, cycle: details.cycle ?? cycle })} />
                            </div>
                        </div>
                    )}
                    </div>
                    {/* Card Footer */}
                    <footer className="border-t border-slate-200 bg-slate-50/80 p-4 sm:px-10 sm:py-5">
                        <div className={cn('flex w-full items-center gap-3', step === 1 ? 'justify-end' : 'justify-between')}>
                            {step === 4 ? (
                                <Button type="button" variant="outline" onClick={onSkip} className="h-11 min-w-[7rem] rounded-lg border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-white sm:px-6 sm:text-base">
                                    {t.later}
                                </Button>
                            ) : step > 1 ? (
                                <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} className="inline-flex h-11 min-w-[7rem] items-center gap-2 rounded-lg border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-white sm:px-6 sm:text-base">
                                    <ChevronLeft className="h-4 w-4 rtl:rotate-180 sm:h-5 sm:w-5" />{t.back}
                                </Button>
                            ) : null}

                            {step < 4 ? (
                                <Button type="button" disabled={step === 1 ? !isStep1Valid : step === 2 ? !isStep2Valid : !isStep3Valid}
                                    className="inline-flex h-11 min-w-[7rem] items-center gap-2 rounded-lg bg-[#5064df] px-5 text-sm font-bold text-white shadow-[0_6px_14px_rgba(80,100,223,0.22)] transition-all hover:bg-[#4357c9] disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-100 sm:px-7 sm:text-base"
                                    onClick={handleNext}>
                                    {t.next}<ChevronRight className="h-4 w-4 rtl:rotate-180 sm:h-5 sm:w-5" />
                                </Button>
                            ) : (
                                <Button type="button"
                                    className="inline-flex h-11 min-w-[7rem] items-center gap-2 rounded-lg bg-[#5064df] px-5 text-sm font-bold text-white shadow-[0_6px_14px_rgba(80,100,223,0.22)] transition-all hover:bg-[#4357c9] disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-100 sm:px-7 sm:text-base"
                                    disabled={!hasClasses || finishing} onClick={finish}>
                                    {finishing ? 'Activation…' : t.start}<ChevronRight className="h-4 w-4 rtl:rotate-180 sm:h-5 sm:w-5" />
                                </Button>
                            )}
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
};
