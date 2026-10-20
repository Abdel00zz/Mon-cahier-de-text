import { classRosterPatch, historicalStudentNames } from '../../src/domain/evaluations/classRosterSync';
/** Development-only capture entry. Real components and fictitious teaching data. */
import { useState, useEffect } from 'react';
import { produce } from 'immer';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { LocaleProvider, useLocale } from '../../src/i18n/LocaleProvider';
import { GuideModal } from '../../src/features/guide/GuideModal';
import { GuidePage } from '../../src/features/guide/GuidePage';
import { SettingsPage } from '../../src/features/settings/SettingsPage';
import { AbsencesTab } from '../../src/features/settings/components/AbsencesTab';
import { DevoirsView } from '../../src/features/evaluations/DevoirsView';
import { materializeContentAssessments } from '../../src/domain/evaluations/homeworkCorrectionContent';
import { TabBar } from '../../src/components/navigation/TabBar';
import { DashboardActions } from '../../src/features/dashboard/DashboardActions';
import type { ClassDisplayMode } from '../../src/features/dashboard/classDisplayMode';
import '../../src/features/dashboard/dashboardCanvas.css';
import { computeDynamicCanvasStyle } from '../../src/features/dashboard/dashboardCanvas';
import { ClassCard } from '../../src/features/dashboard/ClassCard';
import { AddClassCard } from '../../src/features/dashboard/AddClassCard';
import { ClassListItem } from '../../src/features/dashboard/ClassListItem';
import { CreateClassModal } from '../../src/features/dashboard/modals/CreateClassModal';
import { dashboardTitleStyle } from '../../src/constants/classTitleTypography';
import { ClassAssistant } from '../../src/features/assistant/ClassAssistant';
import type { GuidanceAction } from '../../src/domain/assistant/classGuidance';
import { ScheduleTab } from '../../src/features/settings/components/ScheduleTab';
import { NotificationsTab } from '../../src/features/settings/components/NotificationsTab';
import { AppearanceTab } from '../../src/features/settings/components/AppearanceTab';
import { AssignDateModal } from '../../src/features/editor/modals/AssignDateModal';
import { MainTable } from '../../src/features/editor/MainTable';
import { SelectionBar } from '../../src/features/editor/SelectionBar';
import { Header } from '../../src/features/editor/Header';
import { EditorBackButton } from '../../src/features/editor/EditorBackButton';
import { Toolbar } from '../../src/features/editor/Toolbar';
import { ContentModal } from '../../src/features/editor/modals/ContentModal';
import { PrintModal } from '../../src/features/editor/modals/PrintModal';
import { StudentReviewDialog } from '../../src/features/evaluations/components/StudentReviewDialog';
import { StudentNamesEditor } from '../../src/features/evaluations/components/StudentNamesEditor';
import { PageTransitionLoader } from '../../src/components/ui/PageSkeleton';
import { FeedbackPreview } from './FeedbackPreview';
import { ModalGallery } from './ModalGallery';
import { LandingPage } from '../../src/features/auth/LandingPage';
import { AuthPage } from '../../src/features/auth/AuthPage';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { defaultNotificationSettings } from '../../src/hooks/useConfigManager';
import { buildLessonRows, indicesKey, filterLessonRows } from '../../src/domain/notebook/lessonRows';
import { buildContentMoveTargets } from '../../src/domain/notebook/contentEditing';
import { applyContentDrop, planContentDrop } from '../../src/domain/notebook/contentReorder';
import { applySessionEdit, readSessionSelection } from '../../src/domain/notebook/sessionEditing';
import type { SessionEditorState } from '../../src/features/editor/hooks/useSessionAssignment';
import { deriveSchedules } from '../../src/domain/calendar/timetable';
import type { AppConfig, ClassInfo, LessonsData } from '../../src/types';

const params = new URLSearchParams(location.search);
const locale = params.get('lang') === 'ar' ? 'ar' : params.get('lang') === 'en' ? 'en' : 'fr';
const screen = params.get('screen') ?? 'guide';
const tab = params.get('tab');
if (tab) {
  try { sessionStorage.setItem('config_initial_tab_v1', tab); } catch {}
}
if (params.get('theme') === 'dark') document.documentElement.classList.add('dark');
const isAr = locale === 'ar';

const fixtureClasses: ClassInfo[] = [
  {
    id: 'demo-class-0',
    name: isAr ? '2 باك علوم فيزيائية 1' : '2BAC Sciences Physiques 1',
    cycle: 'lycee',
    teacherName: isAr ? 'ذ. محمد العلمي' : 'Prof. M. Alami',
    subject: isAr ? 'الرياضيات' : 'Mathématiques',
    createdAt: '2026-09-01T08:00:00Z',
    color: 'indigo',
  },
  {
    id: 'demo-class-1',
    name: isAr ? '1 باك علوم رياضية 2' : '1BAC Sciences Mathématiques 2',
    cycle: 'lycee',
    teacherName: isAr ? 'ذ. محمد العلمي' : 'Prof. M. Alami',
    subject: isAr ? 'الرياضيات' : 'Mathématiques',
    createdAt: '2026-09-01T08:00:00Z',
    color: 'mint',
  },
  {
    id: 'demo-class-2',
    name: isAr ? 'جذع مشترك علمي 3' : 'Tronc Commun Scientifique 3',
    cycle: 'lycee',
    teacherName: isAr ? 'ذ. محمد العلمي' : 'Prof. M. Alami',
    subject: isAr ? 'الرياضيات' : 'Mathématiques',
    createdAt: '2026-09-01T08:00:00Z',
    color: 'coral',
  },
  {
    id: 'demo-class-3',
    name: isAr ? 'الثالثة إعدادي 1' : '3ème Année Collégiale 1',
    cycle: 'college',
    teacherName: isAr ? 'ذ. محمد العلمي' : 'Prof. M. Alami',
    subject: isAr ? 'الرياضيات' : 'Mathématiques',
    createdAt: '2026-09-01T08:00:00Z',
    color: 'amber',
  },
];

const timetable = [
  // Lundi / الإثنين
  { day: 1, slot: 0, classId: fixtureClasses[0].id },
  { day: 1, slot: 1, classId: fixtureClasses[0].id },
  { day: 1, slot: 2, classId: fixtureClasses[1].id },
  { day: 1, slot: 3, classId: fixtureClasses[1].id },
  { day: 1, slot: 4, classId: fixtureClasses[2].id },
  { day: 1, slot: 5, classId: fixtureClasses[2].id },
  // Mardi / الثلاثاء
  { day: 2, slot: 0, classId: fixtureClasses[2].id },
  { day: 2, slot: 1, classId: fixtureClasses[2].id },
  { day: 2, slot: 2, classId: fixtureClasses[3].id },
  { day: 2, slot: 3, classId: fixtureClasses[3].id },
  // Mercredi / الأربعاء
  { day: 3, slot: 0, classId: fixtureClasses[1].id },
  { day: 3, slot: 1, classId: fixtureClasses[1].id },
  { day: 3, slot: 2, classId: fixtureClasses[0].id },
  { day: 3, slot: 3, classId: fixtureClasses[0].id },
  // Jeudi / الخميس
  { day: 4, slot: 0, classId: fixtureClasses[3].id },
  { day: 4, slot: 1, classId: fixtureClasses[3].id },
  { day: 4, slot: 2, classId: fixtureClasses[2].id },
  { day: 4, slot: 3, classId: fixtureClasses[2].id },
  { day: 4, slot: 4, classId: fixtureClasses[0].id },
  { day: 4, slot: 5, classId: fixtureClasses[0].id },
  // Vendredi / الجمعة
  { day: 5, slot: 0, classId: fixtureClasses[0].id },
  { day: 5, slot: 1, classId: fixtureClasses[0].id },
  { day: 5, slot: 2, classId: fixtureClasses[1].id },
  { day: 5, slot: 3, classId: fixtureClasses[1].id },
  // Samedi / السبت
  { day: 6, slot: 0, classId: fixtureClasses[2].id },
  { day: 6, slot: 1, classId: fixtureClasses[2].id },
  { day: 6, slot: 2, classId: fixtureClasses[3].id },
  { day: 6, slot: 3, classId: fixtureClasses[3].id },
];

const studentNames = [
  'أمين العلمي',
  'سلمى الفاسي',
  'يوسف الناجي',
  'لينا الإدريسي',
  'آدم برادة',
  'مهدي الشرايبي',
  'كنزة بنجلون',
];

const alertTimetable = timetable.filter(entry => entry.classId === fixtureClasses[0].id || entry.classId === fixtureClasses[1].id);
const effectiveTimetable = params.get('assistant') === 'alert' ? alertTimetable : timetable;

const initialConfig: AppConfig = {
  establishmentName: isAr ? 'ثانوية ابن خلدون التأهيلية' : 'Lycée Ibn Khaldoun',
  defaultTeacherName: isAr ? 'ذ. محمد العلمي' : 'Prof. M. Alami',
  printShowDescriptions: true,
  applicationLocale: locale,
  selectedCycles: ['college', 'lycee'],
  selectedSubjects: ['Mathématiques'],
  schoolYearStart: '2026-09-01',
  timetable: effectiveTimetable,
  schedules: deriveSchedules(effectiveTimetable),
  notificationSettings: { ...defaultNotificationSettings, morningBriefing: true, sessionReminders: true },
  theme: 'light',
  classRosters: {
    [fixtureClasses[0].id]: { names: studentNames, version: 1, updatedAt: '2026-10-14T08:00:00Z' },
  },
  manualAssessments: {
    [fixtureClasses[0].id]: [
      { id: 'eval-written-1', type: 'controle', num: 1, semestre: 1, schoolYear: '2026-2027', dateISO: '2026-10-24' },
      { id: 'eval-homework-1', type: 'maison', num: 1, semestre: 1, schoolYear: '2026-2027', dateISO: '2026-09-16', dueDateISO: '2026-10-02', correctionDateISO: '2026-10-05' },
      { id: 'eval-oral-1', type: 'oral', num: 1, semestre: 1, schoolYear: '2026-2027', dateISO: '2026-10-12' },
    ],
  },
  assessmentDates: {
    [fixtureClasses[0].id]: {
      'eval-written-1': '2026-10-24',
      'eval-homework-1': '2026-09-16',
      'eval-oral-1': '2026-10-12',
    },
  },
  pedagogicalEvents: {
    [fixtureClasses[0].id]: [
      {
        id: 'event-notebook',
        type: 'controle_cahiers',
        title: isAr ? 'مراقبة دفاتر التلاميذ' : 'Contrôle des cahiers des élèves',
        date: '2026-09-14',
        status: 'planned',
        createdAt: '2026-09-01T08:00:00Z',
        students: {
          names: studentNames,
          notebookConditions: {
            [studentNames[0]]: 'good',
            [studentNames[1]]: 'good',
            [studentNames[2]]: 'average',
            [studentNames[3]]: 'needs_work',
          },
          updatedAt: '2026-09-14T08:00:00Z',
        },
      },
      {
        id: 'event-soutien',
        type: 'soutien',
        title: isAr ? 'دعم في حساب النهايات وتطبيقات الاتصال' : 'Soutien · calcul de limites et continuité',
        date: '2026-10-18',
        status: 'planned',
        createdAt: '2026-10-14T08:00:00Z',
      },
    ],
  },
  assessmentParticipants: {
    [fixtureClasses[0].id]: {
      'eval-oral-1': {
        names: studentNames,
        updatedAt: '2026-10-12T10:00:00Z',
        oralOutcomes: {
          [studentNames[0]]: 'mastered',
          [studentNames[1]]: 'developing',
          [studentNames[2]]: 'needs_support',
          [studentNames[3]]: 'mastered',
          [studentNames[4]]: 'developing',
          [studentNames[5]]: 'mastered',
          [studentNames[6]]: 'developing',
        },
        oralGrades: {
          [studentNames[0]]: '17',
          [studentNames[1]]: '14',
          [studentNames[2]]: '11',
          [studentNames[3]]: '18',
          [studentNames[4]]: '13',
          [studentNames[5]]: '16',
          [studentNames[6]]: '15',
        },
      },
      'eval-homework-1': {
        names: studentNames,
        updatedAt: '2026-10-02T08:00:00Z',
        homeworkOutcomes: {
          [studentNames[0]]: 'given',
          [studentNames[1]]: 'given',
          [studentNames[2]]: 'missing',
          [studentNames[3]]: 'given',
          [studentNames[4]]: 'given',
          [studentNames[5]]: 'given',
          [studentNames[6]]: 'given',
        },
      },
    },
  },
};

const lessons: LessonsData = isAr ? [{
  type: 'chapter',
  title: 'الفصل 1: اتصال ونهايات الدوال العددية',
  items: [
    {
      type: 'cours',
      title: 'الاتصال في نقطة',
      description: 'لتكن $f$ دالة معرفة على مجال مفتوح مركزه $x_0$. نقول إن $f$ متصلة في $x_0$ إذا كان: $\\displaystyle\\lim_{x \\to x_0} f(x) = f(x_0)$',
      date: '2026-09-14',
    },
    {
      type: 'propriété',
      title: 'العمليات على الدوال المتصلة',
      description: 'إذا كانت $f$ و $g$ متصلتين في $x_0$، فإن $f+g$ و $f \\times g$ و $\\frac{f}{g}$ ($g(x_0) \\ne 0$) متصلة في $x_0$.',
      date: '2026-09-14',
      remark: 'مراقبة دفاتر التلاميذ',
    },
    {
      type: 'exercice',
      title: 'تطبيق تطبيقي 1',
      description: 'ادرس في النقطة $0$ اتصال الدالة $f$ المعرفة بـ: $f(x) = \\frac{\\sqrt{1+x}-1}{x}$ لكل $x \\ne 0$ و $f(0) = \\frac{1}{2}$.',
      date: '2026-09-16',
      remark: 'واجب منزلي رقم 1 مُسند للتلاميذ',
    },
    {
      type: 'théorème',
      title: 'مبرهنة القيم الوسيطية',
      description: 'إذا كانت $f$ دالة متصلة على قطعة $[a, b]$ وكان $f(a) \\times f(b) < 0$، فإن المعادلة $f(x) = 0$ تقبل على الأقل حلاً في $]a, b[$.',
      date: '2026-09-18',
    },
  ],
}] : [{
  type: 'chapter',
  title: 'Chapitre 1 : Continuité et limites d’une fonction numérique',
  items: [
    {
      type: 'cours',
      title: 'Continuité en un point',
      description: 'Soit $f$ une fonction définie sur un intervalle ouvert centré en $x_0$. On dit que $f$ est continue en $x_0$ si : $\\displaystyle\\lim_{x \\to x_0} f(x) = f(x_0)$',
      date: '2026-09-14',
    },
    {
      type: 'propriété',
      title: 'Opérations sur les fonctions continues',
      description: 'Si $f$ et $g$ sont continues en $x_0$, alors $f+g$, $f \\times g$ et $\\frac{f}{g}$ ($g(x_0) \\ne 0$) sont continues en $x_0$.',
      date: '2026-09-14',
      remark: 'Contrôle des cahiers des élèves',
    },
    {
      type: 'exercice',
      title: 'Exercice d’application 1',
      description: 'Étudier la continuité en $0$ de la fonction $f$ définie par : $f(x) = \\frac{\\sqrt{1+x}-1}{x}$ pour $x \\ne 0$ et $f(0) = \\frac{1}{2}$.',
      date: '2026-09-16',
      remark: 'Devoir à la maison 1 assigné aux élèves',
    },
    {
      type: 'théorème',
      title: 'Théorème des valeurs intermédiaires (TVI)',
      description: 'Si $f$ est continue sur un segment $[a, b]$ et si $f(a) \\times f(b) < 0$, alors l’équation $f(x) = 0$ admet au moins une solution dans $]a, b[$.',
      date: '2026-09-18',
    },
  ],
}];

const noop = () => {};

function Preview() {
  const [classes, setClasses] = useState<ClassInfo[]>(fixtureClasses);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);

  useEffect(() => {
    if (params.get('assistant') === 'open') {
      setTimeout(() => {
        document.querySelector<HTMLButtonElement>('.assistant-trigger')?.click();
      }, 600);
    }
  }, []);
  const { t } = useLocale();
  const [config, setConfig] = useState(initialConfig);
  const [display, setDisplay] = useState<ClassDisplayMode>('triple');
  const [dashboardCreateOpen, setDashboardCreateOpen] = useState(false);
  const [dashboardGuideOpen, setDashboardGuideOpen] = useState(false);
  const assist = (action: GuidanceAction) => {
    setDashboardGuideOpen(false);
    if (action.type === 'create-class') setDashboardCreateOpen(true);
    else {
      const url = new URL(location.href);
      url.searchParams.set('screen', action.type === 'schedule' ? 'schedule' : 'editor');
      location.assign(url.href);
    }
  };
  const [open, setOpen] = useState(true);
  const [add, setAdd] = useState(screen === 'add');
  const [selectedKeys, setSelectedKeys] = useState(() => new Set([
    indicesKey({ chapterIndex: 0, itemIndex: 0 }), indicesKey({ chapterIndex: 0, itemIndex: 1 }),
  ]));
  const [searchQuery, setSearchQuery] = useState('');
  const [previewLessons, setPreviewLessons] = useState<LessonsData>(() =>
    materializeContentAssessments(lessons, initialConfig, classes[0].id, locale));
  const previewTargets = buildContentMoveTargets(buildLessonRows(previewLessons));
  const [previewDate, setPreviewDate] = useState<SessionEditorState | null>(null);

  const openPreviewDate = (indices: Parameters<typeof indicesKey>[0]) => {
    const targets = previewTargets.get(indicesKey(indices)) ?? [indices];
    const selection = readSessionSelection(previewLessons, targets);
    if (selection) setPreviewDate({ source: previewLessons, selection, intent: 'date' });
  };
  const canPreviewReorder = (source: string, target: string, side: 'before' | 'after') =>
    planContentDrop(previewLessons, previewTargets, source, target, side) !== null;
  const previewReorder = (source: string, target: string, side: 'before' | 'after') => {
    const plan = planContentDrop(previewLessons, previewTargets, source, target, side);
    if (!plan) return false;
    setPreviewLessons(current => produce(current, draft => { applyContentDrop(draft, plan); }));
    setSelectedKeys(new Set(plan.selection.map(indicesKey)));
    return true;
  };
  const toggleSelection = (indices: Parameters<typeof indicesKey>[0]) => setSelectedKeys(current => {
    const next = new Set(current);
    const key = indicesKey(indices);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const onChange = (patch: Partial<AppConfig>) => setConfig(current => ({ ...current, ...patch }));

  const renderEditorBase = () => (
    <>
      <Header classInfo={classes[0]} teacherName={config.defaultTeacherName} establishmentName={config.establishmentName} onClassInfoChange={noop} onBack={noop} />
      <div className="editor-toolbar-row sticky top-0 z-[50] flex items-center gap-2 print:hidden">
        <div className="min-w-0 flex-1">
          <Toolbar canUndo={false} canRedo={false} saveStatus="saved" onUndo={noop} onRedo={noop}
            onOpenDataTransfer={noop} onOpenManageLessons={noop} onOpenGuide={noop} onOpenAnalyse={noop}
            onOpenEvaluations={noop} onPrint={noop} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>
      </div>
      <div className="pb-32 sm:pb-20">
        <MainTable lessonsData={previewLessons} visibleRows={filterLessonRows(buildLessonRows(previewLessons), searchQuery)} contentDirection={isAr ? 'rtl' : 'ltr'}
          onClearSearch={() => setSearchQuery('')} onOpenAddContentModal={() => setAdd(true)} searchQuery={searchQuery}
          showDescriptions selectedKeys={selectedKeys} onToggleSelect={toggleSelection} onOpenContentEditor={noop} newlyAddedIds={[]}
          onOpenDateModal={openPreviewDate}
          onReorder={previewReorder} canReorder={canPreviewReorder} />
      </div>
      <SelectionBar count={selectedKeys.size} hasDate canAdd canAssignDate canEdit
        onAdd={() => setAdd(true)} onAssignDate={noop} onAssignToday={noop} onClearDate={noop} onEdit={noop} onDelete={noop} onClear={() => setSelectedKeys(new Set())} />
    </>
  );

  return <>
    {screen === 'guide' && <><button className="m-6 p-3" onClick={() => setOpen(true)}>Ouvrir le guide / فتح الدليل</button><GuideModal isOpen={open} onClose={() => setOpen(false)} /></>}
    {screen === 'loading' && <PageTransitionLoader />}
    {screen === 'landing' && <LandingPage locale={locale} onLogin={() => location.assign(`?screen=auth&lang=${locale}`)} onRegister={() => location.assign(`?screen=auth&lang=${locale}`)} />}
    {screen === 'auth' && <AuthProvider><AuthPage locale={locale} onLocaleChange={lang => location.assign(`?screen=auth&lang=${lang}`)} /></AuthProvider>}
    {screen !== 'guide' && screen !== 'loading' && <main className="mx-auto w-full max-w-[1280px] p-4 sm:p-6 min-h-[720px] bg-background text-foreground" dir={isAr ? 'rtl' : 'ltr'}>
      {screen === 'absences' && <AbsencesTab config={config} classes={classes} onConfigChange={onChange} visible />}
      {screen === 'evaluations' && <DevoirsView classInfo={classes[0]} config={config} onConfigChange={onChange} lessonsData={previewLessons} onLessonsChange={setPreviewLessons} />}
      {screen === 'modals' && <ModalGallery config={config} classes={classes} lessons={lessons} onChange={onChange} />}

      {(screen === 'dashboard' || screen === 'classes') && <AuthProvider>
        <div data-dashboard-root className="pb-24 sm:ps-[84px]" style={computeDynamicCanvasStyle(classes, [classes[0]?.id])} >
          <div className="dashboard-heading mb-4" data-layout={display}>
            <DashboardActions mode={display} onModeChange={setDisplay}>
              <ClassAssistant locale={locale} classes={classes} config={config}
                onCreateClass={() => assist({ type: 'create-class' })} onOpenSchedule={() => assist({ type: 'schedule' })}
                onOpenClass={item => assist({ type: 'open-class', classId: item.id })} />
            </DashboardActions>
            <h1 className="dashboard-heading__title text-2xl sm:text-3xl flex items-center gap-2.5" style={dashboardTitleStyle(locale)}><span>{t('dashboard.classes')}</span><span aria-hidden="true">{locale === 'fr' ? '\u00A0:' : ':'}</span></h1>
          </div>
          <div className="dashboard-class-section">
            <div data-layout={display} className="dashboard-class-collection dashboard-class-grid">
              {classes.map((classInfo, i) => <ClassCard key={classInfo.id} classInfo={classInfo} index={i} onSelect={noop} onConfigure={() => setEditingClass(classInfo)} isActiveSession={i === 0} />)}
              <AddClassCard onCreate={() => setDashboardCreateOpen(true)} />
            </div>
          </div>
          <TabBar activeTab="dashboard" onTabChange={tab => { if (tab === 'help') setDashboardGuideOpen(true); }} isExpanded={false} onToggleExpanded={noop} />
          <CreateClassModal isOpen={dashboardCreateOpen || !!editingClass} onClose={() => { setDashboardCreateOpen(false); setEditingClass(null); }} onCreate={() => setDashboardCreateOpen(false)}
            defaultCycle="lycee" teacherSubjects={['Mathématiques']} teacherCycles={['college', 'lycee']} existingClasses={classes} editingClass={editingClass}
            onUpdate={(id, updates) => setClasses(current => current.map(item => item.id === id ? { ...item, ...updates } : item))}
            roster={editingClass ? config.classRosters?.[editingClass.id] : undefined}
            suggestedStudentNames={editingClass ? historicalStudentNames(config, editingClass.id) : undefined}
            onRosterSave={editingClass ? (base, names) => onChange(classRosterPatch(config, editingClass.id, base, names)) : undefined} />
          <GuideModal isOpen={dashboardGuideOpen} onClose={() => setDashboardGuideOpen(false)} />
        </div>
      </AuthProvider>}

      {screen === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{isAr ? 'استعمال الزمن الأسبوعي' : 'Emploi du temps hebdomadaire'}</h1>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">{config.establishmentName} · {config.defaultTeacherName}</span>
          </div>
          <ScheduleTab config={config} classes={classes} onChange={onChange} />
        </div>
      )}

      {screen === 'notifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{isAr ? 'التذكيرات والإشعارات التلقائية' : 'Rappels et notifications automatiques'}</h1>
          </div>
          <NotificationsTab config={config} onChange={onChange} />
        </div>
      )}

      {screen === 'feedback' && <FeedbackPreview />}

      {screen === 'appearance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{isAr ? 'المظهر وراحة الاستخدام' : 'Apparence et confort de lecture'}</h1>
          </div>
          <AppearanceTab config={config} onConfigChange={onChange} />
        </div>
      )}

      {screen === 'settings-page' && (
        <AuthProvider>
          <div className="pb-24 sm:ps-[84px] max-w-6xl mx-auto">
            <TabBar activeTab="settings" onTabChange={noop} isExpanded={false} onToggleExpanded={noop} />
            <SettingsPage asPage onBack={noop} onOpenGuide={noop} config={config} onConfigChange={onChange} classes={classes} addClass={() => classes[0]} />
          </div>
        </AuthProvider>
      )}

      {screen === 'guide-page' && (
        <AuthProvider>
          <div className="pb-24 sm:ps-[84px] max-w-6xl mx-auto">
            <TabBar activeTab="help" onTabChange={noop} isExpanded={false} onToggleExpanded={noop} />
            <GuidePage onBack={noop} onClose={noop} />
          </div>
        </AuthProvider>
      )}

      {screen === 'editor' && renderEditorBase()}

      {screen === 'add' && <>
        {renderEditorBase()}
        <ContentModal isOpen={true} onClose={() => setAdd(false)} onConfirm={noop} lessonsData={previewLessons}
          selectedIndices={null} subject={classes[0].subject} contentDirection={isAr ? 'rtl' : 'ltr'} />
      </>}

      {screen === 'dates' && <>
        {renderEditorBase()}
        <AssignDateModal isOpen={open} onClose={() => setOpen(false)} onApply={noop}
          session={{ source: previewLessons, intent: 'date', selection: {
            targets: [{ chapterIndex: 0, itemIndex: 0 }, { chapterIndex: 0, itemIndex: 1 }],
            date: '2026-09-14', remark: isAr ? 'مراقبة دفاتر التلاميذ' : 'Contrôle des cahiers des élèves', mixedDates: false, mixedRemarks: false,
          } }} />
      </>}

      {screen === 'print' && <>
        {renderEditorBase()}
        <PrintModal isOpen={open} onClose={() => setOpen(false)} classId={classes[0].id} totalDates={3} newDates={['2026-09-14', '2026-09-16']} allDates={['2026-09-14', '2026-09-16', '2026-09-18']} printedDates={['2026-09-07']} lastPrintedAt="2026-09-07T10:00:00Z" config={config} onConfigChange={onChange} onPrint={noop} />
      </>}

      {screen === 'students' && <>
        <DevoirsView classInfo={classes[0]} config={config} onConfigChange={onChange} lessonsData={previewLessons} onLessonsChange={setPreviewLessons} />
        <StudentReviewDialog isOpen={open} onClose={() => setOpen(false)} tracking title={isAr ? 'تقويم شفهي رقم 1' : 'Évaluation orale 1'} context={classes[0].name}>
          <StudentNamesEditor onManageStudents={noop} variant="checked" trackOral
            roster={config.classRosters?.[classes[0].id] ?? { names: studentNames, version: 1, updatedAt: '2026-10-14T08:00:00Z' }}
            initialNames={studentNames.slice(0, 5)}
            initialOralOutcomes={{
              [studentNames[0]]: 'mastered',
              [studentNames[1]]: 'developing',
              [studentNames[2]]: 'needs_support',
              [studentNames[3]]: 'mastered',
              [studentNames[4]]: 'developing',
            }}
            initialOralGrades={{
              [studentNames[0]]: '17',
              [studentNames[1]]: '14',
              [studentNames[2]]: '11',
              [studentNames[3]]: '18',
              [studentNames[4]]: '13',
            }}
            onCancel={noop} onSave={noop} />
        </StudentReviewDialog>
      </>}
    </main>}
  </>;
}

if (import.meta.env.DEV) {
  const root = createRoot(document.getElementById('root')!);
  root.render(<LocaleProvider locale={locale}><Preview /></LocaleProvider>);
  import.meta.hot?.dispose(() => root.unmount());
}
