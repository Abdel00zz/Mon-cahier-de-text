import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData, Indices, ContentDirection, LessonItem, TopLevelItem, Section, SubSection, SubSubSection } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import type { ContentDraft } from '@/domain/notebook/contentDraft';
import { Skeleton } from '@/components/ui/skeleton';
import type { SessionPatch } from '@/domain/notebook/sessionEditing';
import type { SessionEditorState } from './hooks/useSessionAssignment';
import type { ExportableChapterOption } from './modals/DataTransferModal';

const DataTransferModal = lazy(() => import('./modals/DataTransferModal').then(module => ({ default: module.DataTransferModal })));
const ManageLessonsModal = lazy(() => import('./modals/ManageLessonsModal').then(module => ({ default: module.ManageLessonsModal })));
const GuideModal = lazy(() => import('@/features/guide/GuideModal').then(module => ({ default: module.GuideModal })));
const AssignDateModal = lazy(() => import('./modals/AssignDateModal').then(module => ({ default: module.AssignDateModal })));
const ContentModal = lazy(() => import('./modals/ContentModal').then(module => ({ default: module.ContentModal })));
const AnalysisModal = lazy(() => import('./modals/AnalysisModal').then(module => ({ default: module.AnalysisModal })));
const ClassEvaluationsSheet = lazy(() => import('@/features/evaluations/ClassEvaluationsSheet').then(module => ({ default: module.ClassEvaluationsSheet })));

interface EditorModalsProps {
  activeModal: string | null;
  handleModalClose: () => void;
  handleImport: (data: unknown, mode: 'replace' | 'append') => Promise<boolean> | boolean;
  /** `null` = tout le cahier ; sinon, les positions des blocs cochés. */
  handleExportData: (chapters: number[] | null) => void;
  /** Blocs de premier niveau du cahier ouvert, pour la liste d'export. */
  exportChapters: ExportableChapterOption[];
  lessonsData: LessonsData;
  handleUpdateLessons: (newLessons: LessonsData) => void;
  handleEvaluationsLessonsChange?: (newLessons: LessonsData) => void;
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
  sessionEditor: SessionEditorState | null;
  onApplySession: (patch: SessionPatch) => void;
  handleConfirmAddContent: (type: string, data: ContentDraft) => void;
  selectedIndices: Indices[];
  /** validation intelligente : renvoie les alertes pour une date donnée */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  /** même validation, filtrée pour l'affichage : jamais d'alerte sur une séance passée */
  getDisplayDateWarnings?: (date: string) => { type: string; message: string }[];
  classInfo: ClassInfo;
  contentDirection?: ContentDirection;
  editingItem: LessonItem | TopLevelItem | Section | SubSection | SubSubSection | null;
  editingTitleOnly: boolean;
  editingTitleField: 'title' | 'name';
  editingCount: number;
  handleConfirmContentEdit: (value: Partial<LessonItem> & { name?: string }) => void;
  /** remarque de la séance : valeur courante, nombre de lignes combinées, écriture */
}

/**
 * Chargement d'une modale : un squelette à la FORME de la feuille (titre, corps,
 * pied d'actions) au lieu d'un texte d'attente. La place occupée est déjà celle
 * du contenu, donc aucun décalage de mise en page à l'arrivée (CLS = 0).
 */
const ModalFallback = () => {
  const { t } = useLocale();
  return (
    <div role="status" aria-live="polite" className="dialog-overlay fixed inset-0 z-[100] flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-[3px] animate-fade-in duration-200">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card/98 shadow-[0_18px_48px_rgba(0,0,0,0.35)] animate-fade-in duration-200">
        <span className="sr-only">{t('common.loading')}</span>
        <div className="flex items-center gap-3 px-5 py-4 sm:px-7">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-4 w-40 rounded-full" />
        </div>
        <div className="space-y-3 px-5 pb-5 sm:px-7 sm:pb-6">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3 rounded-full" />
        </div>
        <div className="flex justify-end gap-3 border-t border-border/50 px-5 py-4 sm:px-7">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export const EditorModals: React.FC<EditorModalsProps> = ({
  activeModal,
  handleModalClose,
  handleImport,
  handleExportData,
  exportChapters,
  lessonsData,
  handleUpdateLessons,
  handleEvaluationsLessonsChange,
  config,
  onConfigChange,
  sessionEditor,
  onApplySession,
  handleConfirmAddContent,
  selectedIndices,
  getDateWarnings,
  getDisplayDateWarnings,
  classInfo,
  contentDirection,
  editingItem,
  editingTitleOnly,
  editingTitleField,
  editingCount,
  handleConfirmContentEdit,
}) => {
  // Garde la dernière modale montée (isOpen=false) le temps de l'animation de
  // sortie : Radix démonte alors son contenu après la transition. Les props
  // restent fraîches (rebuilt à chaque rendu pendant que la modale est active).
  const [lastType, setLastType] = useState<string | null>(null);
  const lastTypeRef = useRef<string | null>(null);
  lastTypeRef.current = lastType;

  useEffect(() => {
    if (activeModal) {
      setLastType(activeModal);
      return;
    }
    if (!lastTypeRef.current) return;
    const timer = window.setTimeout(() => setLastType(null), 380);
    return () => window.clearTimeout(timer);
  }, [activeModal]);

  const buildModal = (type: string, isOpen: boolean): React.ReactNode => {
    switch (type) {
      case 'dataTransfer':
        return <DataTransferModal isOpen={isOpen} onClose={handleModalClose} onImport={handleImport} onExport={handleExportData} chapters={exportChapters} />;
      case 'manageLessons':
        return <ManageLessonsModal isOpen={isOpen} onClose={handleModalClose} lessons={lessonsData} onUpdate={handleUpdateLessons} config={config} onConfigChange={onConfigChange} />;
      case 'guide':
        return <GuideModal isOpen={isOpen} onClose={handleModalClose} />;
      case 'assignDate':
        if (!sessionEditor) return null;
        return (
          <AssignDateModal
            isOpen={isOpen}
            onClose={handleModalClose}
            onApply={onApplySession}
            session={sessionEditor}
            getDateWarnings={getDateWarnings}
          />
        );
      case 'addContent':
        return (
          <ContentModal key="create"
            isOpen={isOpen}
            onClose={handleModalClose}
            onConfirm={handleConfirmAddContent}
            lessonsData={lessonsData}
            selectedIndices={selectedIndices.length > 0 ? selectedIndices[selectedIndices.length - 1] : null}
            subject={classInfo.subject}
            contentDirection={contentDirection}
          />
        );
      case 'editContent':
        return (
          <ContentModal key="edit" mode="edit"
            isOpen={isOpen}
            onClose={handleModalClose}
            item={editingItem}
            onSave={handleConfirmContentEdit}
            subject={classInfo.subject}
            contentDirection={contentDirection}
            titleOnly={editingTitleOnly}
            titleField={editingTitleField}
            affectedCount={editingCount}
          />
        );
      case 'analyse':
        return <AnalysisModal isOpen={isOpen} onClose={handleModalClose} lessonsData={lessonsData} getDateWarnings={getDisplayDateWarnings ?? getDateWarnings} classInfo={classInfo} config={config} />;
      case 'evaluations':
        return (
          <ClassEvaluationsSheet
            open={isOpen}
            onOpenChange={open => { if (!open) handleModalClose(); }}
            classInfo={classInfo}
            config={config}
            onConfigChange={onConfigChange}
            lessonsData={lessonsData}
            onLessonsChange={handleEvaluationsLessonsChange ?? handleUpdateLessons}
          />
        );
      default:
        return null;
    }
  };

  const renderedType = activeModal ?? lastType;
  if (!renderedType) return null;

  const isOpen = activeModal === renderedType;

  return (
    <Suspense fallback={<ModalFallback />}>
      {buildModal(renderedType, isOpen)}
    </Suspense>
  );
};
