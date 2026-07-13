import React, { Suspense, lazy } from 'react';
import { AppConfig, ClassInfo, LessonsData, Indices } from '@/types';

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
  handleImport: (data: any, mode: 'replace' | 'append') => void;
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

const ModalFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
    <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground shadow-xl">
      Chargement…
    </div>
  </div>
);

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
  if (!activeModal) return null;

  let modal: React.ReactNode = null;

  switch (activeModal) {
    case 'dataTransfer':
      modal = <DataTransferModal isOpen onClose={handleModalClose} onImport={handleImport} onExport={handleExportData} />;
      break;
    case 'manageLessons':
      modal = <ManageLessonsModal isOpen onClose={handleModalClose} lessons={lessonsData} onUpdate={handleUpdateLessons} config={config} onConfigChange={onConfigChange} />;
      break;
    case 'guide':
      modal = <GuideModal isOpen onClose={handleModalClose} />;
      break;
    case 'assignDate':
      modal = (
        <AssignDateModal
          isOpen
          onClose={handleModalClose}
          onApply={handleAssignDates}
          selectedCount={selectedCount}
          selectedItems={selectedItemsData}
          getDateWarnings={getDateWarnings}
          initialDate={assignDateInitialDate}
        />
      );
      break;
    case 'description':
      modal = (
        <DescriptionModal
          isOpen
          onClose={handleModalClose}
          onSave={handleSaveDescription}
          title={descriptionLabel}
          initialValue={singleSelection?.description ?? ''}
        />
      );
      break;
    case 'addContent':
      modal = (
        <AddContentModal
          isOpen
          onClose={handleModalClose}
          onConfirm={handleConfirmAddContent}
          lessonsData={lessonsData}
          selectedIndices={selectedIndices.length > 0 ? selectedIndices[selectedIndices.length - 1] : null}
        />
      );
      break;
    case 'analyse':
      modal = <AnalysisModal isOpen onClose={handleModalClose} lessonsData={lessonsData} getDateWarnings={getDateWarnings} />;
      break;
    case 'evaluations':
      modal = (
        <ClassEvaluationsSheet
          open
          onOpenChange={open => { if (!open) handleModalClose(); }}
          classInfo={classInfo}
          config={config}
          onConfigChange={onConfigChange}
        />
      );
      break;
    default:
      return null;
  }

  return <Suspense fallback={<ModalFallback />}>{modal}</Suspense>;
};
