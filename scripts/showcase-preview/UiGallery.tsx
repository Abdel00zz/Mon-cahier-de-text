import { useState } from 'react';
import type { AppConfig, ClassInfo, LessonsData } from '../../src/types';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { AuthPage } from '../../src/features/auth/AuthPage';
import { LandingPage } from '../../src/features/auth/LandingPage';
import { OnboardingPage } from '../../src/features/dashboard/OnboardingPage';
import { CreateClassModal } from '../../src/features/dashboard/modals/CreateClassModal';
import { ConfigModal } from '../../src/features/settings/ConfigModal';
import { ImportPlatformModal } from '../../src/features/settings/ImportPlatformModal';
import { GuideModal } from '../../src/features/guide/GuideModal';
import { ContentModal } from '../../src/features/editor/modals/ContentModal';
import { AssignDateModal } from '../../src/features/editor/modals/AssignDateModal';
import { DateReviewModal } from '../../src/features/editor/modals/DateReviewModal';
import { DataTransferModal } from '../../src/features/editor/modals/DataTransferModal';
import { ManageLessonsModal } from '../../src/features/editor/modals/ManageLessonsModal';
import { AnalysisModal } from '../../src/features/editor/modals/AnalysisModal';
import { PrintModal } from '../../src/features/editor/modals/PrintModal';
import { TimetableNudgeModal } from '../../src/features/editor/modals/TimetableNudgeModal';
import { ContentDocumentModal } from '../../src/features/evaluations/components/ContentDocumentModal';
import { StudentNamesEditor } from '../../src/features/evaluations/components/StudentNamesEditor';
import { StudentReviewDialog } from '../../src/features/evaluations/components/StudentReviewDialog';
import { AdminMessageModal } from '../../src/features/messages/AdminMessageModal';
import { ClassRosterModal } from '../../src/admin/components/ClassRosterModal';
import { ClassJsonImportModal } from '../../src/admin/components/ClassJsonImportModal';
import { AdminDocumentPreview } from '../../src/admin/components/AdminDocumentPreview';
import { TimetableClockManager } from '../../src/admin/components/TimetableClockManager';
import { CalendarManager } from '../../src/admin/components/CalendarManager';
import { OfficialBulletinManager } from '../../src/admin/components/OfficialBulletinManager';
import { CommandPalette } from '../../src/components/ui/CommandPalette';
import { ConfirmDialog } from '../../src/components/ui/confirm-dialog';
import { readSessionSelection } from '../../src/domain/notebook/sessionEditing';

const noop = () => {};
const names = ['أحمد العلوي', 'سلمى الفاسي', 'يوسف العمراني', 'مريم العلمي', 'Ahmed Alami', 'Sara Fassi'];
const roster = { names, version: 1, updatedAt: '2026-10-08T08:00:00Z' };
const document = { source: '**تمرين 1**\n\nادرس الدالة $f(x)=x^2-3x+2$.\n\n**التوجيه:** فسّر النتيجة باستعمال التمثيل البياني.', updatedAt: roster.updatedAt };

/** Development-only atlas using the application's actual components and synthetic data. */
export function UiGallery({ page, config, classes, lessons }: { page: string; config: AppConfig; classes: ClassInfo[]; lessons: LessonsData }) {
    const [draft, setDraft] = useState<AppConfig>({ theme: 'light', printShowDescriptions: true, screenDescriptionMode: 'all', printDescriptionMode: 'all', selectedCycles: ['lycee'], ...config, defaultTeacherName: 'أستاذ تجريبي', establishmentName: 'ثانوية تجريبية', ...(page === 'onboarding' ? { selectedSubjects: [], selectedCycles: [] } : {}) });
    const change = (patch: Partial<AppConfig>) => setDraft(previous => ({ ...previous, ...patch }));
    const common = { isOpen: true, onClose: noop };
    const classInfo = classes[0];
    const [onboardingClasses, setOnboardingClasses] = useState<ClassInfo[]>([]);
    const isAr = config.applicationLocale === 'ar';
    const tracking = page === 'notebook-review' || page === 'oral-review';
    let view;
    switch (page) {
        case 'landing': view = <LandingPage locale={config.applicationLocale ?? 'ar'} onLogin={noop} onRegister={noop}/>; break;
        case 'auth': view = <AuthPage locale={config.applicationLocale ?? 'ar'} onLocaleChange={locale => change({ applicationLocale: locale })}/>; break;
        case 'onboarding': view = <OnboardingPage config={draft} classes={onboardingClasses} onConfigChange={change} onCreateClass={() => { setOnboardingClasses([classInfo]); return classInfo; }} onDeleteClass={id => setOnboardingClasses(previous => previous.filter(item => item.id !== id))} onComplete={noop} onSkip={noop}/>; break;
        case 'create-class': view = <CreateClassModal {...common} onCreate={noop} teacherSubjects={['Mathématiques']} teacherCycles={['lycee']}/>; break;
        case 'edit-class': view = <CreateClassModal {...common} onCreate={noop} onUpdate={noop} editingClass={classInfo} teacherSubjects={['Mathématiques']} teacherCycles={['lycee']}/>; break;
        case 'settings': view = <ConfigModal {...common} config={draft} classes={classes} onConfigChange={change} onOpenGuide={noop} onExportPlatform={noop} onOpenImport={noop}/>; break;
        case 'platform-import': view = <ImportPlatformModal {...common} onImport={noop}/>; break;
        case 'guide': view = <GuideModal {...common}/>; break;
        case 'add-content': view = <ContentModal {...common} lessonsData={lessons} selectedIndices={{ chapterIndex: 0 }} onConfirm={noop} subject={classInfo.subject} contentDirection={isAr ? 'rtl' : 'ltr'}/>; break;
        case 'edit-content': view = <ContentModal {...common} mode="edit" item={lessons[0].items![0]} onSave={noop} subject={classInfo.subject} contentDirection={isAr ? 'rtl' : 'ltr'}/>; break;
        case 'assign-date': case 'session-remark': view = <AssignDateModal {...common} onApply={noop} session={{ selection: readSessionSelection(lessons, [{ chapterIndex: 0, itemIndex: 0 }])!, source: lessons, intent: page === 'session-remark' ? 'remark' : 'date' }}/>; break;
        case 'date-review': view = <DateReviewModal isOpen date="2026-10-08" warnings={[{ message: isAr ? 'هذا التاريخ خارج الحصص المبرمجة لهذا القسم.' : 'Cette date est en dehors des séances prévues.' }]} onModify={noop} onConfirm={noop} onIgnore={noop}/>; break;
        case 'data-transfer': view = <DataTransferModal {...common} onImport={() => true} onExport={noop} chapters={lessons.map((item, index) => ({ index, type: item.type, title: item.title ?? '', date: '2026-09-21', items: item.items?.length ?? 0, bytes: 1200 }))}/>; break;
        case 'manage-lessons': view = <ManageLessonsModal {...common} lessons={lessons} onUpdate={noop} config={draft} onConfigChange={change}/>; break;
        case 'analysis': view = <AnalysisModal {...common} lessonsData={lessons} classInfo={classInfo} config={draft}/>; break;
        case 'print-options': view = <PrintModal {...common} classId={classInfo.id} config={draft} onConfigChange={change} totalDates={3} allDates={['2026-09-21','2026-09-22','2026-09-23']} newDates={['2026-09-22','2026-09-23']} printedDates={['2026-09-21']} lastPrintedAt="2026-09-21T12:00:00Z" onPrint={noop}/>; break;
        case 'timetable-nudge': view = <TimetableNudgeModal isOpen className={classInfo.name} onSkip={noop} onFill={noop}/>; break;
        case 'assessment-document': view = <ContentDocumentModal {...common} title={isAr ? 'فرض محروس 1' : 'Devoir surveillé 1'} subtitle={classInfo.name} document={document} onSave={noop}/>; break;
        case 'notebook-review': case 'oral-review': case 'assessment-absences': case 'activity-participants': view = <StudentReviewDialog {...common} title={isAr ? (page === 'notebook-review' ? 'تتبع الدفاتر' : page === 'oral-review' ? 'تتبع التقويم الشفهي' : page === 'assessment-absences' ? 'الغائبون في الفرض' : 'المشاركون في النشاط') : page} context={classInfo.name} tracking={tracking}>
            <StudentNamesEditor initialNames={names} variant={page === 'assessment-absences' ? 'absent' : 'checked'} trackNotebookCondition={page === 'notebook-review'} trackOral={page === 'oral-review'} initialNotebookConditions={{ [names[0]]: 'good', [names[1]]: 'average', [names[2]]: 'needs_work' }} initialOralOutcomes={{ [names[0]]: 'mastered', [names[1]]: 'developing', [names[2]]: 'needs_support' }} roster={roster} onSave={noop} onCancel={noop}/>
        </StudentReviewDialog>; break;
        case 'admin-message': view = <AdminMessageModal message={{ id: 'capture-message', title: 'تذكير تربوي', body: 'يرجى مراجعة تخطيط حصص هذا الأسبوع وتحيين دفتر النصوص.', createdAt: roster.updatedAt }} onAcknowledge={async () => {}}/>; break;
        case 'admin-roster-modal': view = <ClassRosterModal phone="0600000000" classInfo={classInfo} roster={roster} onClose={noop} onPublished={noop}/>; break;
        case 'admin-json-import': view = <ClassJsonImportModal {...common} phone="0600000000" classInfo={classInfo} onImported={noop}/>; break;
        case 'admin-document-preview': view = <AdminDocumentPreview {...common} title="Devoir surveillé 1" subtitle={classInfo.name} source={document.source}/>; break;
        case 'admin-clock': view = <TimetableClockManager onBack={noop}/>; break;
        case 'admin-calendar': view = <CalendarManager onBack={noop}/>; break;
        case 'admin-bulletin': view = <OfficialBulletinManager onBack={noop}/>; break;
        case 'command-palette': view = <CommandPalette {...common} classes={classes} onSelectClass={noop} onCreateClass={noop} onOpenSettings={noop} onOpenGuide={noop} onOpenTimetable={noop} onToggleDarkMode={noop}/>; break;
        case 'delete-confirmation': view = <ConfirmDialog open onOpenChange={noop} title={isAr ? 'حذف القسم؟' : 'Supprimer la classe ?'} description={classInfo.name} onConfirm={noop}/>; break;
        default: view = <p role="alert">Écran de capture inconnu : {page}</p>;
    }
    return <AuthProvider><div data-ui-gallery={page}>{view}</div></AuthProvider>;
}
