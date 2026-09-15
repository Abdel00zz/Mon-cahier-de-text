/** Development-only capture entry. Real components, fictitious data, no account provider. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { GuideModal } from '../../features/guide/GuideModal';
import { ClassCard } from '../../features/dashboard/ClassCard';
import { NotificationsPage } from '../../features/dashboard/NotificationsPage';
import { ScheduleTab } from '../../features/settings/components/ScheduleTab';
import { NotificationsTab } from '../../features/settings/components/NotificationsTab';
import { AppearanceTab } from '../../features/settings/components/AppearanceTab';
import { AssignDateModal } from '../../features/editor/modals/AssignDateModal';
import { MainTable } from '../../features/editor/MainTable';
import { SelectionBar } from '../../features/editor/SelectionBar';
import { AddContentModal } from '../../features/editor/modals/EditItemModal';
import { MathProvider } from '../../components/ui/math-provider';
import { useNotificationFeed } from '../../hooks/useNotificationFeed';
import { defaultNotificationSettings } from '../../hooks/useConfigManager';
import { buildLessonRows } from '../../utils/lessonRows';
import { deriveSchedules } from '../../utils/timetable';
import type { AppConfig, ClassInfo, LessonsData } from '../../types';

const params = new URLSearchParams(location.search);
const locale = params.get('lang') === 'ar' ? 'ar' : 'fr';
const screen = params.get('screen') ?? 'guide';
if (params.get('theme') === 'dark') document.documentElement.classList.add('dark');
const classes: ClassInfo[] = ['1AC 1', '2AC 2', '3AC 1'].map((name, i) => ({
  id: `guide-demo-${i}`, name, cycle: 'college', teacherName: '', subject: 'Mathématiques',
  createdAt: '2026-09-01T08:00:00Z', color: '#8b7355',
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
  const [config, setConfig] = useState(initialConfig);
  const [open, setOpen] = useState(true);
  const [add, setAdd] = useState(screen === 'add');
  const onChange = (patch: Partial<AppConfig>) => setConfig(current => ({ ...current, ...patch }));
  const feed = useNotificationFeed(classes, config, locale);
  return <>
    {screen === 'guide' && <><button className="m-6 p-3" onClick={() => setOpen(true)}>Ouvrir le guide / فتح الدليل</button><GuideModal isOpen={open} onClose={() => setOpen(false)} /></>}
    {screen === 'pilotage' && <NotificationsPage classes={classes} config={config} feed={feed} onSelectClass={noop} onOpenSettings={noop} onBack={noop} />}
    {screen !== 'guide' && screen !== 'pilotage' && <main className="mx-auto max-w-[1120px] p-8" dir={isAr ? 'rtl' : 'ltr'}>
      {screen === 'classes' && <><h1 className="mb-6 text-xl font-semibold">{isAr ? 'أقسامي' : 'Mes classes'}</h1><div className="grid grid-cols-3 gap-4">{classes.map((classInfo, i) => <ClassCard key={classInfo.id} classInfo={classInfo} isActiveSession={i === 0} onSelect={noop} onConfigure={noop} />)}</div></>}
      {screen === 'schedule' && <ScheduleTab config={config} classes={classes} onChange={onChange} />}
      {screen === 'notifications' && <NotificationsTab config={config} onChange={onChange} />}
      {screen === 'appearance' && <AppearanceTab config={config} onConfigChange={onChange} />}
      {screen === 'dates' && <AssignDateModal isOpen={open} onClose={() => setOpen(false)} onApply={noop}
        initialDate="2026-09-14" selectedCount={2} selectedItems={[]} />}
      {(screen === 'editor' || screen === 'add') && <>
        <h1 className="mb-6 text-xl font-semibold">{isAr ? 'دفتر النصوص — الرياضيات' : 'Cahier de textes — Mathématiques'}</h1>
        <MainTable lessonsData={lessons} visibleRows={buildLessonRows(lessons)} contentDirection="ltr"
          onClearSearch={noop} onCellUpdate={noop} onDeleteSeparator={noop} onOpenAddContentModal={() => setAdd(true)}
          showDescriptions selectedKeys={new Set()} onToggleSelect={noop} onOpenContentEditor={noop} newlyAddedIds={[]} />
        <SelectionBar count={2} hasDate canAdd canAssignDate canEdit canMoveUp canMoveDown onMoveUp={noop} onMoveDown={noop}
          onAdd={() => setAdd(true)} onAssignDate={noop} onAssignToday={noop} onClearDate={noop} onEdit={noop} onDelete={noop} onClear={noop} />
        <AddContentModal isOpen={add} onClose={() => setAdd(false)} onConfirm={noop} lessonsData={lessons}
          selectedIndices={null} subject="Mathématiques" contentDirection="ltr" />
      </>}
    </main>}
  </>;
}

if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(
  <LocaleProvider locale={locale}><MathProvider><Preview /></MathProvider></LocaleProvider>,
);
