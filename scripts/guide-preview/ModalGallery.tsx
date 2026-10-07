/** Interactive review of production dialogs with fictitious, local-only data. */
import { ArrowDown } from 'lucide-react';
import { Modal } from '../../src/components/ui/modal';
import { DevoirsView } from '../../src/features/evaluations/DevoirsView';
import { useCallback, useState } from 'react';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { Button } from '../../src/components/ui/button';
import { ConfirmDialog } from '../../src/components/ui/confirm-dialog';
import { CreateClassModal } from '../../src/features/dashboard/modals/CreateClassModal';
import { ConfigModal } from '../../src/features/settings/ConfigModal';
import { ImportPlatformModal } from '../../src/features/settings/ImportPlatformModal';
import { GuideModal } from '../../src/features/guide/GuideModal';
import { AssignDateModal } from '../../src/features/editor/modals/AssignDateModal';
import { DateReviewModal } from '../../src/features/editor/modals/DateReviewModal';
import { TimetableNudgeModal } from '../../src/features/editor/modals/TimetableNudgeModal';
import { ContentModal } from '../../src/features/editor/modals/ContentModal';
import { AddContentModal } from '../../src/features/editor/modals/EditItemModal';
import { ManageLessonsModal } from '../../src/features/editor/modals/ManageLessonsModal';
import { AnalysisModal } from '../../src/features/editor/modals/AnalysisModal';
import { PrintModal } from '../../src/features/editor/modals/PrintModal';
import { DataTransferModal } from '../../src/features/editor/modals/DataTransferModal';
import { ClassEvaluationsSheet } from '../../src/features/evaluations/ClassEvaluationsSheet';
import { AdminMessageModal } from '../../src/features/messages/AdminMessageModal';
import { ClassJsonImportModal } from '../../src/admin/components/ClassJsonImportModal';
import { useLocale } from '../../src/i18n/LocaleProvider';
import type { AppConfig, ClassInfo, LessonsData } from '../../src/types';

const dialogs = {
  create: 'Créer une classe', editclass: 'Configurer une classe', dates: 'Attribuer une date',
  'date-review': 'Vérifier une date', timetable: 'Compléter les horaires', add: 'Ajouter un contenu',
  content: 'Modifier un contenu', manage: 'Organiser les leçons', analysis: 'Suivi et progression',
  print: 'Imprimer', transfer: 'Transférer un cahier', restore: 'Restaurer une sauvegarde',
  settings: 'Paramètres', guide: 'Aide', evaluations: 'Évaluations et activités',
  message: 'Message de la direction',
  'admin-import': 'Import administrateur', confirm: 'Confirmation', 'confirm-typed': 'Confirmation de suppression',
};

export function ModalGallery({ config, classes, lessons, onChange }: {
  config: AppConfig; classes: ClassInfo[]; lessons: LessonsData; onChange: (patch: Partial<AppConfig>) => void;
}) {
  const { locale, t } = useLocale();
  const [back, setBack] = useState<(() => void) | null>(null);
  const updateBack = useCallback((action: (() => void) | null) => setBack(() => action), []);
  const params = new URLSearchParams(location.search);
  const current = params.get('modal') ?? 'settings';
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);
  const common = { isOpen: open, onClose: close };
  const classInfo = classes[0];
  const l = (fr: string, ar: string, en: string) => locale === 'ar' ? ar : locale === 'en' ? en : fr;
  const confirm = current.startsWith('confirm');
  return <>
    <header className="mb-6 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{l('Atelier visuel · données fictives', 'معاينة الواجهة · بيانات تجريبية', 'Visual workshop · fictitious data')}</p>
      <h1 className="text-2xl font-semibold">{l('Les interfaces en harmonie', 'واجهات متناسقة', 'A consistent interface')}</h1>
      <div className="flex flex-wrap gap-2">
        {['fr', 'ar', 'en'].map(lang => <a key={lang} className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm" href={`?screen=modals&modal=${current}&lang=${lang}&theme=${params.get('theme') ?? 'light'}`}>{lang.toUpperCase()}</a>)}
        <a className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm" href={`?screen=modals&modal=${current}&lang=${locale}&theme=${params.get('theme') === 'dark' ? 'light' : 'dark'}`}>{l('Clair / sombre', 'فاتح / داكن', 'Light / dark')}</a>
        <Button onClick={() => setOpen(true)}>{l('Ouvrir la modale', 'فتح النافذة', 'Open dialog')}</Button>
      </div>
    </header>
    <nav aria-label="Galerie des modales" className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {Object.entries(dialogs).map(([id, label]) => <a key={id} aria-current={current === id ? 'page' : undefined} className="inline-flex min-h-12 items-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent aria-[current=page]:border-primary" href={`?screen=modals&modal=${id}&lang=${locale}&theme=${params.get('theme') ?? 'light'}`}>{label}</a>)}
      <a href={`?screen=feedback&lang=${locale}`} className="inline-flex min-h-12 items-center rounded-xl border border-border bg-card px-4 text-sm">Notifications et retours d’état</a>
    </nav>
    {current === 'create' && <CreateClassModal {...common} defaultCycle="college" teacherSubjects={['Mathématiques']} teacherCycles={['college']} existingClasses={classes} onCreate={close} />}
    {current === 'editclass' && <CreateClassModal {...common} editingClass={classInfo} teacherSubjects={['Mathématiques']} teacherCycles={['college']} onCreate={close} onUpdate={close} onDelete={close} />}
    {current === 'dates' && <AssignDateModal {...common} onApply={close} session={{ source: lessons, intent: 'date', selection: { targets: [{ chapterIndex: 0, itemIndex: 0 }], date: '2026-09-14', remark: '', mixedDates: false, mixedRemarks: false } }} />}
    {current === 'date-review' && <DateReviewModal isOpen={open} date="2026-09-14" warnings={[{ message: l('Aucun créneau prévu pour cette classe ce jour-là.', 'لا توجد حصة مبرمجة لهذا القسم في هذا اليوم.', 'No lesson is scheduled for this class on that day.') }]} onModify={close} onConfirm={close} onIgnore={close} />}
    {current === 'timetable' && <TimetableNudgeModal isOpen={open} className={classInfo.name} onSkip={close} onFill={close} />}
    {current === 'add' && <AddContentModal {...common} onConfirm={close} lessonsData={lessons} selectedIndices={null} subject="Mathématiques" contentDirection="ltr" />}
    {current === 'content' && <ContentModal {...common} mode="edit" item={{ type: 'définition', title: 'Nombre rationnel', description: '$a/b, b \\ne 0$' }} onSave={close} subject="Mathématiques" contentDirection="ltr" />}
    {current === 'manage' && <ManageLessonsModal {...common} lessons={lessons} onUpdate={close} config={config} onConfigChange={onChange} />}
    {current === 'analysis' && <AnalysisModal {...common} lessonsData={lessons} classInfo={classInfo} config={config} />}
    {current === 'print' && <PrintModal {...common} classId="visual-review-print" totalDates={2} newDates={['2026-09-14']} allDates={['2026-09-07', '2026-09-14']} printedDates={['2026-09-07']} lastPrintedAt="2026-09-07T10:00:00Z" config={config} onConfigChange={onChange} onPrint={close} />}
    {current === 'transfer' && <DataTransferModal {...common} onExport={close} onImport={() => false} />}
    {current === 'restore' && <ImportPlatformModal {...common} onImport={close} />}
    {current === 'settings' && <AuthProvider><ConfigModal {...common} config={config} onConfigChange={onChange} classes={classes} onOpenGuide={close} onExportPlatform={close} onOpenImport={close} /></AuthProvider>}
    {current === 'guide' && <GuideModal {...common} />}
    {current === 'evaluations-global' && <Modal {...common} className="evaluation-modal evaluation-reference" title={<span className="evaluation-header-title">{back && <button type="button" className="evaluation-header-back" onClick={back} aria-label={t('evaluations.allClasses')}><ArrowDown aria-hidden="true" className="h-5 w-5" /></button>}<span>{t('evaluationsSheet.title')}</span></span>}><DevoirsView classes={classes} config={config} onConfigChange={onChange} onBackToClassesChange={updateBack} /></Modal>}
    {current === 'evaluations' && <ClassEvaluationsSheet open={open} onOpenChange={setOpen} classInfo={classInfo} config={config} onConfigChange={onChange} />}
    {current === 'message' && open && <AdminMessageModal message={{ id: 'visual-review', title: l('Bienvenue pour cette rentrée', 'مرحبًا بكم في هذا الموسم الدراسي', 'Welcome to the new school year'), body: l('Votre espace est prêt. Vous pouvez commencer à préparer vos premières séances.', 'فضاؤكم جاهز. يمكنكم الآن إعداد حصصكم الأولى.', 'Your workspace is ready. You can start preparing your first lessons.'), createdAt: '2026-09-01T08:00:00Z' }} onAcknowledge={async () => close()} />}
    {current === 'admin-import' && <ClassJsonImportModal {...common} phone="0600000000" classInfo={classInfo} onImported={close} />}
    {confirm && <ConfirmDialog open={open} onOpenChange={setOpen} variant={current === 'confirm' ? 'default' : 'destructive'} title={l('Confirmer votre choix', 'تأكيد اختيارك', 'Confirm your choice')} description={l('Vérifiez les éléments sélectionnés avant de continuer.', 'راجع العناصر المختارة قبل المتابعة.', 'Review your selection before continuing.')} confirmationPhrase={current === 'confirm-typed' ? classInfo.name : undefined} confirmationHint={current === 'confirm-typed' ? l('Saisissez le nom de la classe.', 'أدخل اسم القسم.', 'Enter the class name.') : undefined} onConfirm={close} />}
  </>;
}
