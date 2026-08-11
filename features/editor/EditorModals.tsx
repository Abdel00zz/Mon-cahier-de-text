import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData, Indices } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';

const DataTransferModal = lazy(() => import('./modals/DataTransferModal').then(module => ({ default: module.DataTransferModal })));
const ManageLessonsModal = lazy(() => import('./modals/ManageLessonsModal').then(module => ({ default: module.ManageLessonsModal })));
const GuideModal = lazy(() => import('@/features/guide/GuideModal').then(module => ({ default: module.GuideModal })));
const AssignDateModal = lazy(() => import('./modals/AssignDateModal').then(module => ({ default: module.AssignDateModal })));
const DescriptionModal = lazy(() => import('./modals/DescriptionModal').then(module => ({ default: module.DescriptionModal })));
const AddContentModal = lazy(() => import('./modals/EditItemModal').then(module => ({ default: module.AddContentModal })));
const AnalysisModal = lazy(() => import('./modals/AnalysisModal').then(module => ({ default: module.AnalysisModal })));
const ClassEvaluationsSheet = lazy(() => import('@/features/evaluations/ClassEvaluationsSheet').then(module => ({ default: module.ClassEvaluationsSheet })));

interface EditorModalsProps {
  activeModal: string | null;
  handleModalClose: () => void;
  handleImport: (data: unknown, mode: 'replace' | 'append') => Promise<boolean> | boolean;
  handleExportData: () => void;
  lessonsData: LessonsData;
  handleUpdateLessons: (newLessons: LessonsData) => void;
  config: AppConfig;
  onConfigChange: (patch: Partial<AppConfig>) => void;
  handleAssignDates: (date: string) => void;
  selectedCount: number;
  selectedItemsData: any[];
  handleSaveDescription: (desc: string) => void;
  descriptionLabel: string;
  singleSelection: any;
  handleConfirmAddContent: (newItem: any, targetIndices: Indices | null) => void;
  selectedIndices: Indices[];
  /** validation intelligente : renvoie les alertes pour une date donnée */
  getDateWarnings?: (date: string) => { type: string; message: string }[];
  assignDateInitialDate?: string;
  classInfo: ClassInfo;
}

const ModalFallback = () => {
  const { t } = useLocale();
  return (
    <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-[3px] animate-fade-in duration-200">
      <div className="rounded-lg border border-border/80 bg-card/98 px-4 py-3 text-sm font-medium text-card-foreground shadow-[0_18px_48px_rgba(0,0,0,0.35)] animate-fade-in duration-200">
        {t('common.loading')}
      </div>
    </div>
  );
};

export const EditorModals: React.FC<EditorModalsProps> = ({
  activeModal,
  handleModalClose,
  handleImport,
  handleExportData,
  lessonsData,
  handleUpdateLessons,
  config,
  onConfigChange,
  handleAssignDates,
  selectedCount,
  selectedItemsData,
  handleSaveDescription,
  descriptionLabel,
  singleSelection,
  handleConfirmAddContent,
  selectedIndices,
  getDateWarnings,
  assignDateInitialDate,
  classInfo,
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
        return <DataTransferModal isOpen={isOpen} onClose={handleModalClose} onImport={handleImport} onExport={handleExportData} />;
      case 'manageLessons':
        return <ManageLessonsModal isOpen={isOpen} onClose={handleModalClose} lessons={lessonsData} onUpdate={handleUpdateLessons} config={config} onConfigChange={onConfigChange} />;
      case 'guide':
        return <GuideModal isOpen={isOpen} onClose={handleModalClose} />;
      case 'assignDate':
        return (
          <AssignDateModal
            isOpen={isOpen}
            onClose={handleModalClose}
            onApply={handleAssignDates}
            selectedCount={selectedCount}
            selectedItems={selectedItemsData}
            getDateWarnings={getDateWarnings}
            initialDate={assignDateInitialDate}
          />
        );
      case 'description':
        return (
          <DescriptionModal
            isOpen={isOpen}
            onClose={handleModalClose}
            onSave={handleSaveDescription}
            title={descriptionLabel}
            initialValue={singleSelection?.description ?? ''}
          />
        );
      case 'addContent':
        return (
          <AddContentModal
            isOpen={isOpen}
            onClose={handleModalClose}
            onConfirm={handleConfirmAddContent}
            lessonsData={lessonsData}
            selectedIndices={selectedIndices.length > 0 ? selectedIndices[selectedIndices.length - 1] : null}
          />
        );
      case 'analyse':
        return <AnalysisModal isOpen={isOpen} onClose={handleModalClose} lessonsData={lessonsData} getDateWarnings={getDateWarnings} />;
      case 'evaluations':
        return (
          <ClassEvaluationsSheet
            open={isOpen}
            onOpenChange={open => { if (!open) handleModalClose(); }}
            classInfo={classInfo}
            config={config}
            onConfigChange={onConfigChange}
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
