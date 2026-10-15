/** Development-only capture entry. Real components and fictitious teaching data. */
import { useState } from 'react';
import { produce } from 'immer';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { LocaleProvider, useLocale } from '../../src/i18n/LocaleProvider';
import { GuideModal } from '../../src/features/guide/GuideModal';
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
import { NotificationsPage } from '../../src/features/dashboard/NotificationsPage';
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
import { PageTransitionLoader } from '../../src/components/ui/PageSkeleton';
import { FeedbackPreview } from './FeedbackPreview';
import { ModalGallery } from './ModalGallery';
import { LandingPage } from '../../src/features/auth/LandingPage';
import { AuthPage } from '../../src/features/auth/AuthPage';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { useNotificationFeed } from '../../src/hooks/useNotificationFeed';
import { defaultNotificationSettings } from '../../src/hooks/useConfigManager';
import { buildLessonRows, indicesKey, filterLessonRows } from '../../src/domain/notebook/lessonRows';
import { buildContentMoveTargets } from '../../src/domain/notebook/contentEditing';
import { applyContentDrop, planContentDrop } from '../../src/domain/notebook/contentReorder';
import { applySessionEdit, readSessionSelection } from '../../src/domain/notebook/sessionEditing';
import type { SessionEditorState } from '../../src/features/editor/hooks/useSessionAssignment';
import { deriveSchedules } from '../../src/domain/calendar/timetable';
import type { AppConfig, ClassInfo, LessonsData } from '../../src/types';
import { KEEP_TONES } from '../../src/platform/keepTheme';

const params = new URLSearchParams(location.search);
const locale = params.get('lang') === 'ar' ? 'ar' : params.get('lang') === 'en' ? 'en' : 'fr';
const screen = params.get('screen') ?? 'guide';
if (params.get('theme') === 'dark') document.documentElement.classList.add('dark');
const fixtureNames = params.get('fixture') === 'palette' ? KEEP_TONES.map((_, i) => `2BAC PC ${i + 1}`) : params.get('fixture') === 'long-names'
  ? ['2BAC Sciences Mathématiques A 12', 'TC Sciences Option Français 3', 'Classe de consolidation et approfondissement 7']
  : params.get('fixture') === 'paper-cards' ? ['2BAC SVT 2', '2BAC PC 3', '2BAC PC 4', 'TCL 6']
  : ['1AC 1', '2AC 2', '3AC 1'];
const classes: ClassInfo[] = fixtureNames.map((name, i) => ({
  id: `guide-demo-${i}`, name, cycle: 'college', teacherName: '', subject: 'Mathématiques',
  createdAt: '2026-09-01T08:00:00Z', color: params.get('fixture') === 'palette' ? KEEP_TONES[i]
    : params.get('fixture') === 'paper-cards' ? ['mint', 'coral', 'indigo', 'mint'][i] : '',
}));
const timetable = [
  { day: 1, slot: 0, classId: classes[0].id }, { day: 1, slot: 1, classId: classes[0].id },
  { day: 1, slot: 4, classId: classes[1].id }, { day: 2, slot: 2, classId: classes[2].id },
  { day: 3, slot: 0, classId: classes[1].id }, { day: 3, slot: 1, classId: classes[1].id },
  { day: 4, slot: 4, classId: classes[0].id }, { day: 5, slot: 2, classId: classes[2].id },
];
const initialConfig: AppConfig = {
  establishmentName: '', defaultTeacherName: '', printShowDescriptions: true,
  applicationLocale: locale, selectedCycles: ['college'], selectedSubjects: ['Mathématiques'],
  schoolYearStart: '2026-09-01', timetable, schedules: deriveSchedules(timetable),
  notificationSettings: { ...defaultNotificationSettings }, theme: 'light',
};
if (['student-followup', 'content-assessments'].includes(params.get('fixture') ?? '')) {
  const names = ['Amine Alami', 'Salma Fassi', 'Youssef Naji', 'Lina Idrissi', 'Adam Berrada', 'سلمى العلوي'];
  initialConfig.classRosters = { [classes[0].id]: { names, version: 1, updatedAt: '2026-10-14T08:00:00Z' } };
  initialConfig.manualAssessments = { [classes[0].id]: [
    { id: 'review-previous', type: 'oral', num: 2, semestre: 1, schoolYear: '2026-2027', dateISO: '2026-10-05' },
    { id: 'review-oral', type: 'oral', num: 1, semestre: 1, schoolYear: '2026-2027', dateISO: '2026-10-12' },
    { id: 'review-complete', type: 'maison', num: 2, semestre: 1, schoolYear: '2026-2027', dateISO: '2026-10-08', dueDateISO: '2026-10-10' },
    { id: 'review-written', type: 'controle', num: 1, semestre: 1, schoolYear: '2026-2027', dateISO: '2026-10-20' },
    { id: 'review-homework', type: 'maison', num: 1, semestre: 1, schoolYear: '2026-2027', dateISO: '2026-10-07', dueDateISO: '2026-10-14' },
  ] };
  initialConfig.pedagogicalEvents = { [classes[0].id]: [{ id: 'review-activity', type: 'soutien', title: locale === 'ar' ? 'دعم في الأعداد النسبية' : 'Soutien · nombres rationnels', date: '2026-10-18', status: 'planned', createdAt: '2026-10-14T08:00:00Z' }] };
  initialConfig.assessmentParticipants = { [classes[0].id]: {
    'review-complete': { names, updatedAt: '2026-10-10T08:00:00Z', homeworkOutcomes: Object.fromEntries(names.map(name => [name, 'given' as const])) },
    'review-previous': { names: names.slice(0, 5), updatedAt: '2026-10-05T10:00:00Z', oralGrades: { 'Amine Alami': '13', 'Salma Fassi': '14', 'Youssef Naji': '7', 'Lina Idrissi': '16', 'Adam Berrada': '10' } },
    'review-oral': { names, updatedAt: '2026-10-12T10:00:00Z', oralOutcomes: { 'Amine Alami': 'mastered', 'Salma Fassi': 'developing', 'Youssef Naji': 'needs_support', 'Lina Idrissi': 'mastered', 'Adam Berrada': 'developing' }, oralGrades: { 'Amine Alami': '17', 'Salma Fassi': '12', 'Youssef Naji': '8', 'Lina Idrissi': '16', 'Adam Berrada': '11' } },
    'review-homework': { names, updatedAt: '2026-10-14T08:00:00Z', homeworkOutcomes: { 'Amine Alami': 'given', 'Salma Fassi': 'given', 'Youssef Naji': 'missing' } },
  } };
}
if (params.get('fixture') === 'content-assessments') {
  classes[0].cycle = 'prepa';
  classes[0].name = 'MPSI 1';
  initialConfig.manualAssessments![classes[0].id].push({ id: 'review-colle', type: 'colle', num: 1,
    semestre: 1, schoolYear: '2026-2027', dateISO: '2026-10-12' });
  initialConfig.manualAssessments![classes[0].id].find(item => item.id === 'review-homework')!.correctionDateISO = '2026-10-15';
}
const isAr = locale === 'ar';
// Course direction is independent of interface language: a French course stays LTR.
const lessons: LessonsData = [{ type: 'chapter', title: 'Nombres rationnels', items: [
  { type: 'définition', title: 'Nombre rationnel', description: '$\\displaystyle\\frac{a}{b},\\quad b\\ne0$', date: '2026-09-14' },
  { type: 'propriété', title: 'Égalité de deux quotients', description: '$\\displaystyle\\frac{a}{b}=\\frac{ka}{kb},\\quad k\\ne0$', date: '2026-09-14' },
  { type: 'exemple', title: 'Simplifier une fraction', description: '$\\displaystyle\\frac{12}{18}=\\frac{2}{3}$' },
  { type: 'application', title: 'S’entraîner', description: 'Simplifier des fractions et justifier les étapes.' },
  { type: 'remarque', title: 'Vérifier le dénominateur', description: '' },
] }];
const noop = () => {};

function Preview() {
  const { t } = useLocale();
  const [config, setConfig] = useState(initialConfig);
  const [display, setDisplay] = useState<ClassDisplayMode>('triple');
  const [dashboardCreateOpen, setDashboardCreateOpen] = useState(false);
  const [dashboardGuideOpen, setDashboardGuideOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(true);
  const [add, setAdd] = useState(screen === 'add');
  const [selectedKeys, setSelectedKeys] = useState(() => new Set([
    indicesKey({ chapterIndex: 0, itemIndex: 0 }), indicesKey({ chapterIndex: 0, itemIndex: 1 }),
  ]));
  const [searchQuery, setSearchQuery] = useState('');
  const [previewLessons, setPreviewLessons] = useState<LessonsData>(() => params.get('fixture') === 'long-notebook'
    ? [{ type: 'chapter', title: 'Cahier de vérification', items: Array.from({ length: 240 }, (_, i) => ({ type: 'exercice', title: `Exercice ${i + 1}`, description: 'Un contenu pédagogique à réordonner.' })) }]
    : params.get('fixture') === 'reorder-combined' ? [
      { type: 'chapter', title: 'Chapitre A', items: [
        { type: 'exercice', title: 'Exercice combiné', description: 'Énoncé identique', date: '2026-09-14' },
        { type: 'exercice', title: 'Exercice combiné', description: 'Énoncé identique', date: '2026-09-15' },
        { type: 'exercice', title: 'Exercice combiné', description: 'Énoncé identique', date: '2026-09-16' },
      ] },
      { type: 'chapter', title: 'Chapitre B', sections: [{ name: 'Paragraphe B', subsections: [{ name: 'Sous-paragraphe', subsubsections: [{ name: 'Ultime' }] }] }] },
    ] : params.get('fixture') === 'reorder' ? [
      { type: 'chapter', title: 'Chapitre A', items: [{ type: 'definition', title: 'Rappel', date: '2026-09-14' }, { type: 'exercice', title: 'Exercice à déplacer', description: 'Énoncé à conserver', date: '2026-09-14', remark: 'À revoir' }], sections: [{ name: 'Paragraphe vide' }] },
      { type: 'chapter', title: 'Chapitre B', sections: [{ name: 'Paragraphe B', items: [{ type: 'definition', title: 'Repère B' }] }] },
    ]
    : materializeContentAssessments(lessons, initialConfig, classes[0].id, locale));
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
  const feed = useNotificationFeed(classes, config, locale);
  return <>
    {screen === 'guide' && <><button className="m-6 p-3" onClick={() => setOpen(true)}>Ouvrir le guide / فتح الدليل</button><GuideModal isOpen={open} onClose={() => setOpen(false)} /></>}
    {screen === 'pilotage' && <NotificationsPage classes={classes} config={config} feed={feed} onSelectClass={noop} onOpenSettings={noop} onBack={noop} />}
    {screen === 'loading' && <PageTransitionLoader />}
    {screen === 'landing' && <LandingPage locale={locale} onLogin={() => location.assign(`?screen=auth&lang=${locale}`)} onRegister={() => location.assign(`?screen=auth&lang=${locale}`)} />}
    {screen === 'auth' && <AuthProvider><AuthPage locale={locale} onLocaleChange={lang => location.assign(`?screen=auth&lang=${lang}`)} /></AuthProvider>}
    {screen !== 'guide' && screen !== 'pilotage' && screen !== 'loading' && <main className="mx-auto max-w-[1120px] p-4 sm:p-8" dir={isAr ? 'rtl' : 'ltr'}>
      {screen === 'absences' && <AbsencesTab config={config} classes={classes} onConfigChange={onChange} visible />}
      {screen === 'evaluations' && <DevoirsView classInfo={classes[0]} config={config} onConfigChange={onChange} lessonsData={previewLessons} onLessonsChange={setPreviewLessons} />}
      {screen === 'modals' && <ModalGallery config={config} classes={classes} lessons={lessons} onChange={onChange} />}
      {screen === 'dashboard' && <AuthProvider>
        <div data-dashboard-root className="pb-24 sm:ps-[84px]" style={computeDynamicCanvasStyle(classes, params.get('active') === '1' ? [classes[0]?.id] : [])} >
          <div className="dashboard-heading mb-4" data-layout={display}>
            <DashboardActions mode={display} onModeChange={setDisplay} onCreateClass={() => setDashboardCreateOpen(true)} onOpenGuide={() => setDashboardGuideOpen(true)} />
            <h1 className="dashboard-heading__title text-2xl sm:text-3xl" style={dashboardTitleStyle(locale)}>{t('dashboard.classes')}<span aria-hidden="true">{locale === 'fr' ? '\u00A0:' : ':'}</span></h1>
          </div>
          <div className="dashboard-class-section">
          {display === 'list' ? (
            <div key={display} className="dashboard-class-collection dashboard-class-list" role="list" aria-label={t('dashboard.classList')}>
              {classes.map((classInfo, i) => <div key={classInfo.id} role="listitem"><ClassListItem classInfo={classInfo} onSelect={noop} onConfigure={noop} isActiveSession={params.get('active') === '1' && i === 0} /></div>)}
            </div>
          ) : (
            <div key={display} data-layout={display} className="dashboard-class-collection dashboard-class-grid">
              {classes.map((classInfo, i) => <ClassCard key={classInfo.id} classInfo={classInfo} index={i} onSelect={noop} onConfigure={noop} isActiveSession={params.get('active') === '1' && i === 0} />)}
              <AddClassCard onCreate={() => setDashboardCreateOpen(true)} />
            </div>
          )}
          {display === 'list' && <div className="dashboard-class-create-row"><AddClassCard variant="row" onCreate={() => setDashboardCreateOpen(true)} /></div>}
          </div>
          <TabBar activeTab="dashboard" onTabChange={noop} isExpanded={expanded} onToggleExpanded={() => setExpanded(value => !value)} />
          <CreateClassModal isOpen={dashboardCreateOpen} onClose={() => setDashboardCreateOpen(false)} onCreate={() => setDashboardCreateOpen(false)} defaultCycle="college" teacherSubjects={['Mathématiques']} teacherCycles={['college']} existingClasses={classes} />
          <GuideModal isOpen={dashboardGuideOpen} onClose={() => setDashboardGuideOpen(false)} />
        </div>
      </AuthProvider>}
      {screen === 'classes' && <>
        <h1 className="mb-6 text-xl font-semibold">{isAr ? 'أقسامي' : 'Mes classes'}</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{classes.map((classInfo, i) => <ClassCard key={classInfo.id} classInfo={classInfo} isActiveSession={i === 0} onSelect={noop} onConfigure={noop} />)}</div>
      </>}
      {screen === 'schedule' && <ScheduleTab config={config} classes={classes} onChange={onChange} />}
      {screen === 'notifications' && <NotificationsTab config={config} onChange={onChange} />}
      {screen === 'feedback' && <FeedbackPreview />}
      {screen === 'appearance' && <AppearanceTab config={config} onConfigChange={onChange} />}
      {screen === 'dates' && <AssignDateModal isOpen={open} onClose={() => setOpen(false)} onApply={noop}
        session={{ source: lessons, intent: 'date', selection: {
          targets: [{ chapterIndex: 0, itemIndex: 0 }, { chapterIndex: 0, itemIndex: 1 }],
          date: '2026-09-14', remark: '', mixedDates: false, mixedRemarks: false,
        } }} />}
      {(screen === 'editor' || screen === 'add') && <>
        <Header classInfo={classes[0]} teacherName="Enseignant" establishmentName="Collège" onClassInfoChange={noop} onBack={noop} />
        <div className="editor-toolbar-row sticky top-0 z-[50] flex items-center gap-2 print:hidden">
          {new URLSearchParams(location.search).has('back') && <EditorBackButton onBack={noop} />}
          <div className="min-w-0 flex-1">
        <Toolbar canUndo={false} canRedo={false} saveStatus="saved" onUndo={noop} onRedo={noop}
          onOpenDataTransfer={noop} onOpenManageLessons={noop} onOpenGuide={noop} onOpenAnalyse={noop}
          onOpenEvaluations={noop} onPrint={noop} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>
        </div>
        <div className="pb-40 sm:pb-24">
          <MainTable lessonsData={previewLessons} visibleRows={filterLessonRows(buildLessonRows(previewLessons), searchQuery)} contentDirection="ltr"
            onClearSearch={() => setSearchQuery('')} onOpenAddContentModal={() => setAdd(true)} searchQuery={searchQuery}
            showDescriptions selectedKeys={selectedKeys} onToggleSelect={toggleSelection} onOpenContentEditor={noop} newlyAddedIds={[]}
            onOpenDateModal={openPreviewDate}
            onReorder={previewReorder} canReorder={canPreviewReorder} />
        </div>
        {!add && <SelectionBar count={selectedKeys.size} hasDate canAdd canAssignDate canEdit
          onAdd={() => setAdd(true)} onAssignDate={noop} onAssignToday={noop} onClearDate={noop} onEdit={noop} onDelete={noop} onClear={() => setSelectedKeys(new Set())} />}
        <ContentModal isOpen={add} onClose={() => setAdd(false)} onConfirm={noop} lessonsData={lessons}
          selectedIndices={null} subject="Mathématiques" contentDirection="ltr" />
        {previewDate && <AssignDateModal isOpen onClose={() => setPreviewDate(null)} session={previewDate}
          onApply={patch => {
            setPreviewLessons(current => produce(current, draft => { applySessionEdit(draft, previewDate.selection.targets, patch); }));
            setPreviewDate(null);
          }} />}
      </>}
    </main>}
  </>;
}

if (import.meta.env.DEV) {
  const root = createRoot(document.getElementById('root')!);
  root.render(<LocaleProvider locale={locale}><Preview /></LocaleProvider>);
  import.meta.hot?.dispose(() => root.unmount());
}

