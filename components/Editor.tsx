import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition } from 'react';
import { useImmer } from 'use-immer';
import { toast } from 'sonner';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { MainTable } from './MainTable';
import { SelectionBar } from './SelectionBar';
import { EditorSkeleton } from './ui/PageSkeleton';
import { Plus } from './ui/icons';
import { useHistoryState } from '../hooks/useHistoryState';
import { useConfigManager } from '../hooks/useConfigManager';
import { useLessonSearch } from '../hooks/useLessonSearch';
import { useSelectionData } from '../hooks/useSelectionData';
import { findItem, addTopLevelItem, addSection, addSubSection, addSubSubSection, addItem, deleteSeparator, migrateLessonsData, moveWithinParent, canMoveWithinParent } from '../utils/dataUtils';
import { prepareImportedLessons } from '../utils/importPipeline';
import { markClassDirty, markClassesListDirty, touchClassSyncMeta } from '../utils/syncBus';
import { collectSessionDates, filterLessonsByDates, getNewDates, readPrintMeta, recordPrint } from '../utils/printMeta';
import { validateSessionDate, summarizeWarnings } from '../utils/dateValidation';
import { appendJournal, opLabel, readJournal, timeAgoFr } from '../utils/journal';
import { PredefinedEntry, findPredefinedFor, loadPredefinedContent } from '../utils/predefinedContent';
import { BookOpen } from './ui/icons';
import { PrintModal, PrintMode, PrintOptions } from './modals/PrintModal';
import { HistoryModal } from './modals/HistoryModal';
import { printDocument } from '../utils/printUtils';
import { LessonsData, Indices, TopLevelItem, LessonItem, Section, SubSection, SubSubSection, ClassInfo, EmbeddableTopLevelType, EmbeddableTopLevelItem, Separator } from '../types';
import { PrintView } from './PrintView';
import { EditorModals } from './EditorModals';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP } from '../constants';
import { logger } from '../utils/logger';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface EditorProps {
    classInfo: ClassInfo;
    onBack: () => void;
}

type ActiveModal =
  | 'import'
  | 'manageLessons'
  | 'guide'
  | 'analyse'
  | 'addContent'
  | 'assignDate'
  | 'description'
  | 'print'
  | 'history'
  | null;

const indicesKey = (idx: Indices): string =>
    `${idx.chapterIndex}|${idx.sectionIndex ?? ''}|${idx.subsectionIndex ?? ''}|${idx.subsubsectionIndex ?? ''}|${idx.itemIndex ?? ''}|${idx.isSeparator ? 1 : 0}`;

interface SelectionState {
  keys: Set<string>;
  items: Map<string, Indices>;
}

const createSelectionState = (indices?: Indices): SelectionState => {
  const keys = new Set<string>();
  const items = new Map<string, Indices>();
  if (indices) {
    const key = indicesKey(indices);
    keys.add(key);
    items.set(key, indices);
  }
  return { keys, items };
};

export const Editor: React.FC<EditorProps> = ({ classInfo: initialClassInfo, onBack }) => {
  const { state: lessonsData, setState, undo, redo, canUndo, canRedo, operationType } = useHistoryState<LessonsData>([]);
  const { config, isLoading: isConfigLoading } = useConfigManager();

  const [editorState, setEditorState] = useImmer({
    classInfo: initialClassInfo,
    isClassLoading: true,
    saveStatus: 'saved' as 'saved' | 'saving' | 'unsaved',
    activeModal: null as ActiveModal,
    editingIndices: null as Indices | null,
    searchQuery: '',
    newlyAddedIds: [] as string[],
    printSelection: null as LessonsData | null, // sous-ensemble à imprimer (nouveautés seulement)
    printPageNumbers: true, // numérotation des pages à l'impression
  });

  const [selectionState, setSelectionState] = useState<SelectionState>(() => createSelectionState());
  const [isSelectionPending, startSelectionTransition] = useTransition();
  const editingIndicesRef = useRef<Indices | null>(null);

  const {
    classInfo,
    isClassLoading,
    saveStatus,
    activeModal,
    editingIndices,
    searchQuery,
    newlyAddedIds,
    printSelection,
    printPageNumbers,
  } = editorState;

  useEffect(() => {
    editingIndicesRef.current = editingIndices;
  }, [editingIndices]);

  /*
   * Contenu prédéfini : si le cahier est vide et qu'un programme officiel
   * existe pour ce niveau × matière, on le propose (utiliser tel quel,
   * puis modifier librement — ou l'ignorer et créer son propre contenu).
   */
  const [predefinedOffer, setPredefinedOffer] = useState<PredefinedEntry | null>(null);
  useEffect(() => {
      let cancelled = false;
      if (isClassLoading || lessonsData.length > 0) {
          setPredefinedOffer(null);
          return;
      }
      findPredefinedFor(classInfo).then(entry => {
          if (!cancelled) setPredefinedOffer(entry);
      });
      return () => { cancelled = true; };
  }, [isClassLoading, lessonsData.length, classInfo]);

  const handleLoadPredefined = useCallback(async () => {
      if (!predefinedOffer) return;
      try {
          const content = await loadPredefinedContent(predefinedOffer);
          setState(() => content, 'import-data');
          setEditorState(draft => { draft.saveStatus = 'unsaved'; });
          toast.success('Programme prédéfini chargé — adaptez-le librement.');
      } catch {
          toast.error('Impossible de charger le contenu prédéfini.');
      }
  }, [predefinedOffer, setState, setEditorState]);

  /*
   * Journal des actions : chaque opération d'édition (operationType du
   * useHistoryState) est consignée avec son horodatage → alimente la ligne
   * « Dernière modification » et la modale Historique.
   */
  const [journalVersion, setJournalVersion] = useState(0);
  const lastLoggedOpRef = useRef<string | null>(null);
  useEffect(() => {
    if (!operationType || operationType === lastLoggedOpRef.current) {
      // même snapshot (undo/redo pointent sur un état existant) : on ne journalise
      // que les nouvelles opérations, détectées par le changement de lessonsData.
    }
    lastLoggedOpRef.current = operationType ?? null;
    if (operationType && operationType !== 'initial' && operationType !== 'initial-load') {
      appendJournal(classInfo.id, operationType);
      setJournalVersion(v => v + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonsData]);

  const journalEntries = useMemo(() => readJournal(classInfo.id), [classInfo.id, journalVersion]);
  const lastJournalEntry = journalEntries[0] ?? null;

  // Échap : efface la sélection (si aucune modale/édition n'est ouverte — elles gèrent leur propre Échap)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (editingIndicesRef.current !== null) return;
      setSelectionState(current => (current.keys.size === 0 ? current : createSelectionState()));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectedIndices = useMemo(() => Array.from(selectionState.items.values()), [selectionState]);

  const getStorageKey = useCallback(() => `classData_v1_${classInfo.id}`, [classInfo.id]);

  const showNotification = useCallback((message: string, type: NotificationType) => {
    toast[type](message);
  }, []);

  /*
   * Garde intelligente : à chaque affectation de date, croise la date avec
   * l'emploi du temps de la classe, les jours fériés, les vacances et les
   * absences du prof. Alerte non bloquante (toast) — le prof reste maître.
   * `getDateWarnings` est mémoïsé : passé à MainTable (React.memo), une
   * lambda inline casserait la mémoïsation de toute la table.
   */
  const getDateWarnings = useCallback(
    (date: string) => validateSessionDate(date, classInfo, config),
    [classInfo, config]
  );

  const checkSessionDate = useCallback((date: string) => {
    if (!date) return;
    const message = summarizeWarnings(getDateWarnings(date));
    if (message) {
      toast.warning(message, { duration: 15000 });
    }
  }, [getDateWarnings]);

  const addNewItemHighlight = useCallback((id: string) => {
    setEditorState(draft => { draft.newlyAddedIds.push(id); });
    setTimeout(() => {
        setEditorState(draft => { draft.newlyAddedIds = draft.newlyAddedIds.filter(i => i !== id); });
    }, 2500);
  }, [setEditorState]);

  const loadData = useCallback(() => {
    setEditorState(draft => { draft.isClassLoading = true; });
    try {
      const raw = localStorage.getItem(getStorageKey());
      const savedData = raw ? JSON.parse(raw) : [];
      const lessons = Array.isArray(savedData) ? savedData : (savedData.lessonsData ?? []);
      setState(() => migrateLessonsData(lessons), 'initial-load');
    } catch (error) {
      logger.error("Failed to load data from localStorage", error);
      showNotification("Erreur lors du chargement des donnees.", "error");
    } finally {
      setEditorState(draft => { draft.isClassLoading = false; });
    }
  }, [setState, getStorageKey, showNotification, setEditorState]);

  const saveData = useCallback(() => {
    setEditorState(draft => { draft.saveStatus = 'saving'; });
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(lessonsData));
      touchClassSyncMeta(classInfo.id);
      markClassDirty(classInfo.id);
      setTimeout(() => setEditorState(draft => { draft.saveStatus = 'saved'; }), 500);
    } catch (error) {
      logger.error("Failed to save data to localStorage", error);
      showNotification("Erreur de sauvegarde.", "error");
      setEditorState(draft => { draft.saveStatus = 'unsaved'; });
    }
  }, [lessonsData, getStorageKey, classInfo.id, showNotification, setEditorState]);

  const handleExportData = useCallback(() => {
    try {
        const dataToExport = { classInfo, lessonsData };
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cahier-de-textes-${classInfo.name}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification("Donnees exportees avec succes!", "success");
    } catch (error) {
        logger.error("Failed to export data", error);
        showNotification("Erreur lors de l'exportation.", "error");
    }
  }, [classInfo, lessonsData, showNotification]);

  const handleClassInfoChange = useCallback((newInfo: Partial<ClassInfo>) => {
    setEditorState(draft => {
        Object.assign(draft.classInfo, newInfo);
        try {
            const allClasses: ClassInfo[] = JSON.parse(localStorage.getItem('classManager_v1') || '[]');
            const updatedClasses = allClasses.map(c =>
                c.id === draft.classInfo.id ? { ...draft.classInfo } : c
            );
            localStorage.setItem('classManager_v1', JSON.stringify(updatedClasses));
            markClassesListDirty();
        } catch (e) {
            logger.error("Failed to update class info in storage", e);
            showNotification("Erreur de mise a jour des infos de la classe", "error");
        }
    });
  }, [setEditorState, showNotification]);

  useEffect(() => {
    if (isClassLoading || isConfigLoading || saveStatus === 'saved') return;
    const handler = setTimeout(() => {
      saveData();
    }, 1500);
    return () => clearTimeout(handler);
  }, [lessonsData, isClassLoading, isConfigLoading, saveStatus, saveData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (config.defaultTeacherName && config.defaultTeacherName !== classInfo.teacherName) {
      handleClassInfoChange({ teacherName: config.defaultTeacherName });
    }
  }, [config.defaultTeacherName, classInfo.teacherName, handleClassInfoChange]);

  useEffect(() => {
    setEditorState(draft => { draft.classInfo = initialClassInfo; });
  }, [initialClassInfo, setEditorState]);

  const handleCellUpdate = useCallback((indices: Indices, field: string, value: any) => {
    setState(draft => {
        const { item } = findItem(draft, indices);
        if (item) {
            (item as any)[field] = value;
        }
    }, 'cell-edit');
    setEditorState(draft => { draft.saveStatus = 'unsaved'; });
    if (field === 'date' && typeof value === 'string') {
        checkSessionDate(value);
    }
  }, [setState, setEditorState, checkSessionDate]);

  const handleOpenAddContentModal = useCallback((indices?: Indices) => {
      setSelectionState(createSelectionState(indices));
      setEditorState(draft => {
        draft.activeModal = 'addContent';
      });
  }, [setEditorState]);

  const handleModalClose = useCallback(() => {
    setSelectionState(current => current.keys.size === 0 ? current : createSelectionState());
    setEditorState(draft => {
      draft.activeModal = null;
    });
  }, [setEditorState]);

  const handleConfirmAddContent = useCallback((type: string, data: any) => {
      let notificationMessage = '';
      const newId = crypto.randomUUID();
      const anchor = selectedIndices[selectedIndices.length - 1];
      const anchorCanReceiveEmbeddedBlock =
          !!anchor &&
          (anchor.sectionIndex !== undefined ||
           anchor.subsectionIndex !== undefined ||
           anchor.subsubsectionIndex !== undefined);

      if (TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(type) && type !== 'chapter' && anchorCanReceiveEmbeddedBlock) {
          let parentLevelIndices: Indices = { chapterIndex: anchor.chapterIndex };
          if (anchor.sectionIndex !== undefined) parentLevelIndices.sectionIndex = anchor.sectionIndex;
          if (anchor.subsectionIndex !== undefined) parentLevelIndices.subsectionIndex = anchor.subsectionIndex;
          if (anchor.subsubsectionIndex !== undefined) parentLevelIndices.subsubsectionIndex = anchor.subsubsectionIndex;
          const insertAfterIndex = anchor.itemIndex;
          const newItem: EmbeddableTopLevelItem = { type: type as EmbeddableTopLevelType, title: data.title, _tempId: newId };
          setState(draft => addItem(draft, parentLevelIndices, newItem, insertAfterIndex), 'add-embedded-item');
          notificationMessage = "Bloc insere.";
          addNewItemHighlight(newId);
      } else if (TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(type)) {
          const insertAfterIndex = anchor?.chapterIndex;
          const newItem: TopLevelItem = { type: type as TopLevelItem['type'], title: data.title, _tempId: newId };
          setState(draft => addTopLevelItem(draft, newItem, insertAfterIndex), 'add-top-level');
          notificationMessage = "Element principal ajoute.";
          addNewItemHighlight(newId);
      } else if (type === 'section' && anchor) {
          const parentIndices = { chapterIndex: anchor.chapterIndex };
          const insertAfterIndex = anchor.sectionIndex;
          const newSection: Section = { name: data.name, items: [], _tempId: newId };
          setState(draft => addSection(draft, parentIndices, newSection, insertAfterIndex), 'add-section');
          notificationMessage = "Section ajoutee.";
          addNewItemHighlight(newId);
      } else if (type === 'subsection' && anchor && anchor.sectionIndex !== undefined) {
          const parentIndices = { chapterIndex: anchor.chapterIndex, sectionIndex: anchor.sectionIndex };
          const insertAfterIndex = anchor.subsectionIndex;
          const newSubSection: SubSection = { name: data.name, items: [], _tempId: newId };
          setState(draft => addSubSection(draft, parentIndices, newSubSection, insertAfterIndex), 'add-subsection');
          notificationMessage = "Sous-section ajoutee.";
          addNewItemHighlight(newId);
      } else if (type === 'subsubsection' && anchor && anchor.sectionIndex !== undefined && anchor.subsectionIndex !== undefined) {
          const parentIndices = { chapterIndex: anchor.chapterIndex, sectionIndex: anchor.sectionIndex, subsectionIndex: anchor.subsectionIndex };
          const insertAfterIndex = anchor.subsubsectionIndex;
          const newSubSubSection: SubSubSection = { name: data.name, items: [], _tempId: newId };
          setState(draft => addSubSubSection(draft, parentIndices, newSubSubSection, insertAfterIndex), 'add-subsubsection');
          notificationMessage = "Sous-sous-section ajoutee.";
          addNewItemHighlight(newId);
      } else if (type === 'item' && anchor) {
          let parentLevelIndices: Indices = { chapterIndex: anchor.chapterIndex };
          if (anchor.sectionIndex !== undefined) parentLevelIndices.sectionIndex = anchor.sectionIndex;
          if (anchor.subsectionIndex !== undefined) parentLevelIndices.subsectionIndex = anchor.subsectionIndex;
          if (anchor.subsubsectionIndex !== undefined) parentLevelIndices.subsubsectionIndex = anchor.subsubsectionIndex;
          const insertAfterIndex = anchor.itemIndex;

          const normalizedType = TYPE_MAP[data.type.toLowerCase()] || data.type;
          const newItem: LessonItem = { ...data, type: normalizedType, _tempId: newId };
          setState(draft => addItem(draft, parentLevelIndices, newItem, insertAfterIndex), 'add-item');
          notificationMessage = "Element ajoute.";
          addNewItemHighlight(newId);
      } else if (type === 'separator' && anchor) {
          setState(draft => {
              const { item } = findItem(draft, anchor);
              if (item) {
                  if (item.separatorAfter) {
                      showNotification("Un separateur existe deja a cet endroit.", "info");
                      return;
                  }
                  const newSeparator: Separator = { content: data.content || '---', date: data.date || item.date || '', manual: true, _tempId: newId };
                  item.separatorAfter = newSeparator;
                  notificationMessage = "Separateur ajoute.";
                  addNewItemHighlight(newId);
              }
          }, 'add-separator');
      }

      if (notificationMessage) {
        showNotification(notificationMessage, "success");
        setEditorState(draft => { draft.saveStatus = 'unsaved'; });
      }
      if (type === 'separator' && typeof data?.date === 'string' && data.date) {
        checkSessionDate(data.date);
      }
      handleModalClose();
  }, [selectedIndices, setState, showNotification, handleModalClose, addNewItemHighlight, setEditorState, checkSessionDate]);

  /*
   * Impression intelligente : la modale PrintModal montre ce qui a déjà été
   * imprimé (dates mémorisées par classe) et recommande le mode économique.
   */
  const printStats = useMemo(() => {
      const meta = readPrintMeta(classInfo.id);
      return {
          totalDates: collectSessionDates(lessonsData).length,
          newDates: getNewDates(lessonsData, classInfo.id),
          lastPrintedAt: meta.lastPrintedAt,
      };
  }, [classInfo.id, lessonsData]);

  const handleSmartPrint = useCallback(() => {
      setEditorState(draft => { draft.activeModal = 'print'; });
  }, [setEditorState]);

  const handleExecutePrint = useCallback((mode: PrintMode, options: PrintOptions) => {
      const classId = classInfo.id;
      const allDates = collectSessionDates(lessonsData);
      const newDates = getNewDates(lessonsData, classId);

      const selection = mode === 'new' && newDates.length > 0
          ? filterLessonsByDates(lessonsData, newDates)
          : null;
      const datesToRecord = mode === 'new' ? newDates : allDates;

      setEditorState(draft => {
          draft.activeModal = null;
          draft.printPageNumbers = options.pageNumbers;
      });

      const launchPrint = () => {
          printDocument('cahier-de-textes');
          recordPrint(classId, datesToRecord);
      };

      if (selection) {
          // rendre le sous-ensemble dans PrintView avant de lancer l'impression
          setEditorState(draft => { draft.printSelection = selection; });
          setTimeout(() => {
              launchPrint();
              // restaurer le rendu complet après le cycle d'impression
              setTimeout(() => setEditorState(draft => { draft.printSelection = null; }), 500);
          }, 120);
      } else {
          setTimeout(launchPrint, 60);
      }
  }, [classInfo.id, lessonsData, setEditorState]);

  const handleMoveSelected = useCallback((direction: 'up' | 'down') => {
      if (selectedIndices.length !== 1) return;
      const target = selectedIndices[0];
      let movedTo: Indices | null = null;
      setState(draft => {
          movedTo = moveWithinParent(draft, target, direction);
      }, 'reorder');
      if (movedTo) {
          setSelectionState(createSelectionState(movedTo));
          setEditorState(draft => { draft.saveStatus = 'unsaved'; });
      }
  }, [selectedIndices, setState, setEditorState]);

  const handleInitiateInlineEdit = useCallback((indices: Indices) => {
    setSelectionState(current => current.keys.size === 0 ? current : createSelectionState());
    setEditorState(draft => {
      draft.editingIndices = indices;
    });
  }, [setEditorState]);

  const handleCancelInlineEdit = useCallback(() => {
    setEditorState(draft => { draft.editingIndices = null; });
  }, [setEditorState]);

  const handleToggleSelectRow = useCallback((indices: Indices) => {
      startSelectionTransition(() => {
        setSelectionState(current => {
            const key = indicesKey(indices);
            const keys = new Set(current.keys);
            const items = new Map(current.items);
            if (keys.has(key)) {
                keys.delete(key);
                items.delete(key);
                return { keys, items };
            }
            keys.add(key);
            items.set(key, indices);
            return { keys, items };
        });
      });
      if (editingIndicesRef.current !== null) {
        setEditorState(draft => {
            draft.editingIndices = null;
        });
      }
  }, [setEditorState, startSelectionTransition]);

  const handleDeselectAll = useCallback(() => {
      startSelectionTransition(() => {
        setSelectionState(current => current.keys.size === 0 ? current : createSelectionState());
      });
      // clic en dehors : annule aussi l'édition en ligne en cours (comportement attendu d'une modale)
      if (editingIndicesRef.current !== null) {
        setEditorState(draft => { draft.editingIndices = null; });
      }
  }, [startSelectionTransition, setEditorState]);

  const handleAssignDates = useCallback((dateOrAssignments: string | { indices: Indices; date: string }[]) => {
      setState(draft => {
          if (typeof dateOrAssignments === 'string') {
              selectedIndices.forEach(idx => {
                  const { item } = findItem(draft, idx);
                  if (item) (item as any).date = dateOrAssignments;
              });
          } else {
              dateOrAssignments.forEach(assignment => {
                  const { item } = findItem(draft, assignment.indices);
                  if (item) (item as any).date = assignment.date;
              });
          }
      }, 'assign-date');
      setSelectionState(createSelectionState());
      setEditorState(draft => {
        draft.saveStatus = 'unsaved';
        draft.activeModal = null;
      });
      showNotification("Date(s) affectée(s).", "success");
      // garde intelligente sur les dates distinctes affectées
      const assignedDates = typeof dateOrAssignments === 'string'
          ? [dateOrAssignments]
          : Array.from(new Set(dateOrAssignments.map(a => a.date)));
      assignedDates.filter(Boolean).forEach(checkSessionDate);
  }, [selectedIndices, setState, setEditorState, showNotification, checkSessionDate]);

  const handleClearSelectedDates = useCallback(() => {
      if (selectedIndices.length === 0) return;
      setState(draft => {
          selectedIndices.forEach(idx => {
              const { item } = findItem(draft, idx);
              if (item) (item as any).date = '';
          });
      }, 'clear-date');
      setSelectionState(createSelectionState());
      setEditorState(draft => {
        draft.saveStatus = 'unsaved';
      });
      showNotification("Date dissociee.", "success");
  }, [selectedIndices, setState, setEditorState, showNotification]);

  const handleBulkDelete = useCallback(() => {
      if (selectedIndices.length === 0) return;
      if (!window.confirm(`Supprimer ${selectedIndices.length} element(s) selectionne(s) ?`)) return;
      const sorted = [...selectedIndices].sort((a, b) => {
          if (a.chapterIndex !== b.chapterIndex) return b.chapterIndex - a.chapterIndex;
          if ((a.sectionIndex ?? -1) !== (b.sectionIndex ?? -1)) return (b.sectionIndex ?? -1) - (a.sectionIndex ?? -1);
          if ((a.subsectionIndex ?? -1) !== (b.subsectionIndex ?? -1)) return (b.subsectionIndex ?? -1) - (a.subsectionIndex ?? -1);
          if ((a.subsubsectionIndex ?? -1) !== (b.subsubsectionIndex ?? -1)) return (b.subsubsectionIndex ?? -1) - (a.subsubsectionIndex ?? -1);
          return (b.itemIndex ?? -1) - (a.itemIndex ?? -1);
      });
      setState(draft => {
          sorted.forEach(idx => {
              const { parent, targetIndex } = findItem(draft, idx);
              if (parent && typeof targetIndex === 'number' && Array.isArray(parent)) {
                  parent.splice(targetIndex, 1);
              }
          });
      }, 'bulk-delete');
      setSelectionState(createSelectionState());
      setEditorState(draft => {
        draft.saveStatus = 'unsaved';
      });
      showNotification(`${selectedIndices.length} element(s) supprime(s).`, 'success');
  }, [selectedIndices, setState, setEditorState, showNotification]);

  const handleConfirmInlineEdit = useCallback((indices: Indices, updatedData: Partial<LessonItem>) => {
      const normalizedType = updatedData.type ? (TYPE_MAP[updatedData.type.toLowerCase()] || updatedData.type) : undefined;
      const finalItem = { ...updatedData };
      if (normalizedType) {
          finalItem.type = normalizedType;
      }

      setState(draft => {
          const { item } = findItem(draft, indices);
          if (item) {
              Object.assign(item, finalItem);
          }
      }, 'inline-edit-item');
      showNotification("Element mis a jour.", "success");
      setEditorState(draft => {
        draft.saveStatus = 'unsaved';
        draft.editingIndices = null;
      });
      if (typeof finalItem.date === 'string' && finalItem.date) {
          checkSessionDate(finalItem.date);
      }
  }, [setState, showNotification, setEditorState, checkSessionDate]);

  const handleImport = useCallback((data: any, mode: 'replace' | 'append') => {
      try {
        const { lessonsData: preparedLessons, report } = prepareImportedLessons(data);
        if (preparedLessons.length === 0) {
          showNotification("Import refuse: aucun tableau de lecons exploitable.", "error");
          return;
        }

        setState(currentData => (mode === 'replace' ? preparedLessons : [...currentData, ...preparedLessons]), 'import-data');
        handleModalClose();
        showNotification(
          `Import maitrise: ${report.topLevelCount} bloc(s), ${report.itemCount} element(s), ${report.normalizedDates} date(s) normalisee(s).`,
          "success",
        );
        setEditorState(draft => { draft.saveStatus = 'unsaved'; });
      } catch (error) {
        logger.error('Failed to prepare imported JSON', error);
        showNotification("Import refuse: structure JSON non compatible avec le tableau.", "error");
      }
  }, [setState, showNotification, handleModalClose, setEditorState]);

  const handleUpdateLessons = useCallback((newLessons: LessonsData) => {
      setState(() => newLessons, 'manage-lessons');
      handleModalClose();
      showNotification(`Lecons mises a jour.`, 'success');
      setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [setState, showNotification, handleModalClose, setEditorState]);

  const handleDeleteSeparator = useCallback((indices: Indices) => {
    setState(draft => deleteSeparator(draft, indices), 'delete-separator');
    showNotification("Separateur supprime.", "success");
    setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [setState, showNotification, setEditorState]);

  const filteredData = useLessonSearch(lessonsData, searchQuery);

  const selectedItemsData = useSelectionData(selectedIndices, lessonsData);

  const selectedDates = selectedItemsData.filter(item => item.canDate).map(item => item.date).filter(Boolean);
  const hasSelectedDate = selectedDates.length > 0;
  const sharedSelectedDate = selectedDates.length > 0 && selectedDates.every(date => date === selectedDates[0])
      ? selectedDates[0]
      : null;
  const selectedCount = selectedIndices.length;
  const singleSelection = selectedItemsData[0];
  const canAddAfterSelection = selectedCount === 1 && !!singleSelection?.canAddAfter;
  const canAssignDateSelection = selectedCount > 0 && selectedItemsData.every(item => item.canDate);
  const canEditSelection = selectedCount === 1 && !!singleSelection?.canInlineEdit;
  const canDescribeSelection = selectedCount === 1 && !!singleSelection?.canDescription;
  const descriptionLabel = singleSelection?.description ? 'Modifier description' : 'Ajouter description';

  const reorderTarget = selectedCount === 1 && !selectedIndices[0]?.isSeparator ? selectedIndices[0] : null;
  const canMoveUp = !!reorderTarget && canMoveWithinParent(lessonsData, reorderTarget, 'up');
  const canMoveDown = !!reorderTarget && canMoveWithinParent(lessonsData, reorderTarget, 'down');

  // En-tête contextuel de la barre de sélection : type + titre de l'élément.
  const selectionLabel = useMemo(() => {
    if (selectedCount !== 1 || !singleSelection?.item) return null;
    const item: any = singleSelection.item;
    const rawType: string = item.type || '';
    const typeLabel = rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : '';
    const title = item.title || item.name || '';
    if (typeLabel && title) return `${typeLabel} — ${title}`;
    return title || typeLabel || 'Élément sélectionné';
  }, [selectedCount, singleSelection]);

  // « Dater aujourd'hui » : un tap, réutilise le circuit handleAssignDates
  // (donc aussi la garde intelligente sur la date du jour).
  const handleAssignToday = useCallback(() => {
      const today = new Date();
      const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      handleAssignDates(iso);
  }, [handleAssignDates]);

  const handleSaveDescription = useCallback((description: string) => {
      const target = selectedIndices[0];
      if (!target) return;
      setState(draft => {
          const { item } = findItem(draft, target);
          if (item) {
              const trimmed = description.trim();
              if (trimmed) {
                  (item as any).description = trimmed;
              } else {
                  delete (item as any).description;
              }
          }
      }, 'description-edit');
      setEditorState(draft => {
          draft.activeModal = null;
          draft.saveStatus = 'unsaved';
      });
      showNotification(description.trim() ? "Description mise a jour." : "Description effacee.", "success");
  }, [selectedIndices, setState, setEditorState, showNotification]);

  const isLoading = isClassLoading || isConfigLoading;

  if (isLoading) {
    return <EditorSkeleton />;
  }

  return (
    <div className="relative p-1.5 sm:p-5 bg-[#F5EDE8] safe-bottom print:bg-white print:p-0" data-editor-root>
      <div className="container mx-auto max-w-7xl bg-[#FFFDF7] rounded-[24px] border border-[#E4D3AC]/60 shadow-md p-2 sm:p-6 min-h-[calc(100vh-2.5rem)] flex flex-col print:mx-0 print:w-full print:max-w-none print:min-h-0 print:rounded-none print:border-none print:bg-white print:p-0 print:shadow-none">
        <div className="print-hidden flex flex-col flex-1">
          <Header
            classInfo={classInfo}
            establishmentName={config.establishmentName}
            onClassInfoChange={handleClassInfoChange}
            onBack={onBack}
          />
          <div className="sticky bottom-0 sm:static z-30 bg-[#FFFDF7]/70 sm:bg-transparent backdrop-blur supports-[backdrop-filter]:backdrop-blur print:hidden">
            <Toolbar
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              onSave={saveData}
              saveStatus={saveStatus}
              onOpenImport={() => setEditorState(draft => { draft.activeModal = 'import'; })}
              onOpenManageLessons={() => setEditorState(draft => { draft.activeModal = 'manageLessons'; })}
              onOpenGuide={() => setEditorState(draft => { draft.activeModal = 'guide'; })}
              onOpenAnalyse={() => setEditorState(draft => { draft.activeModal = 'analyse'; })}
              onExportData={handleExportData}
              onPrint={handleSmartPrint}
              searchQuery={searchQuery}
              setSearchQuery={value => setEditorState(draft => { draft.searchQuery = value; })}
              lastModifiedLabel={lastJournalEntry ? `${opLabel(lastJournalEntry.op)} · ${timeAgoFr(lastJournalEntry.at)}` : null}
              onOpenHistory={() => setEditorState(draft => { draft.activeModal = 'history'; })}
            />
          </div>
          {/* Proposition de programme prédéfini (cahier vide + contenu disponible) */}
          {predefinedOffer && lessonsData.length === 0 && (
            <div className="mx-auto mb-3 flex w-full max-w-2xl flex-col items-center gap-2 rounded-2xl border border-[#E4D3AC] bg-[#FFFDF7] p-4 text-center sm:flex-row sm:text-left print:hidden shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCF6EA] text-[#B8935A]">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#2B241D] font-display">{predefinedOffer.titre}</p>
                <p className="text-xs text-[#69604F]">
                  Un programme prêt à l'emploi existe pour cette classe — chargez-le puis adaptez-le, ou ignorez-le.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadPredefined}
                className="h-10 shrink-0 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Charger le programme
              </button>
            </div>
          )}
          {/* §G tableau serré : annule le padding horizontal de la carte parente
              (p-2 sm:p-6) pour que la table coure de bord à bord */}
          <main className="-mx-2 flex-1 pb-24 sm:-mx-6 sm:pb-20 print:mx-0" onClick={handleDeselectAll}>
            <MainTable
              lessonsData={filteredData}
              onCellUpdate={handleCellUpdate}
              onDeleteSeparator={handleDeleteSeparator}
              onOpenAddContentModal={handleOpenAddContentModal}
              showDescriptions={config.screenDescriptionMode === 'all' ? true : config.screenDescriptionMode === 'none' ? false : undefined}
              descriptionTypes={config.screenDescriptionTypes}
              selectedKeys={selectionState.keys}
              onToggleSelect={handleToggleSelectRow}
              editingIndices={editingIndices}
              onInitiateInlineEdit={handleInitiateInlineEdit}
              onConfirmInlineEdit={handleConfirmInlineEdit}
              onCancelInlineEdit={handleCancelInlineEdit}
              newlyAddedIds={newlyAddedIds}
              getDateWarnings={getDateWarnings}
              searchQuery={searchQuery}
            />
          </main>
        </div>

        <PrintView lessonsData={printSelection ?? filteredData} classInfo={classInfo} config={config} newlyAddedIds={newlyAddedIds} pageNumbers={printPageNumbers} />
      </div>

      {/* FAB mobile : ajout rapide de contenu (masqué quand la barre de sélection est ouverte) */}
      {!activeModal && selectedCount === 0 && (
        <button
          type="button"
          onClick={() => handleOpenAddContentModal()}
          className="fab-safe fixed right-4 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 transition-transform active:scale-95 sm:hidden print:hidden"
          aria-label="Ajouter du contenu"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {!activeModal && (
        <SelectionBar
          count={selectedCount}
          selectionLabel={selectionLabel}
          hasDate={hasSelectedDate}
          sharedDate={sharedSelectedDate}
          canAdd={canAddAfterSelection}
          canAssignDate={canAssignDateSelection}
          canDescription={canDescribeSelection}
          descriptionLabel={descriptionLabel}
          onAdd={() => handleOpenAddContentModal(selectedIndices[selectedIndices.length - 1])}
          onAssignDate={() => setEditorState(draft => { draft.activeModal = 'assignDate'; })}
          onAssignToday={handleAssignToday}
          onClearDate={handleClearSelectedDates}
          onDescription={() => setEditorState(draft => { draft.activeModal = 'description'; })}
          onEdit={() => canEditSelection && handleInitiateInlineEdit(selectedIndices[0])}
          onDelete={handleBulkDelete}
          onClear={handleDeselectAll}
          canEdit={canEditSelection}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMoveUp={() => handleMoveSelected('up')}
          onMoveDown={() => handleMoveSelected('down')}
          isPending={isSelectionPending}
        />
      )}

      <PrintModal
        isOpen={activeModal === 'print'}
        onClose={handleModalClose}
        totalDates={printStats.totalDates}
        newDates={printStats.newDates}
        lastPrintedAt={printStats.lastPrintedAt}
        onPrint={handleExecutePrint}
      />
      <HistoryModal
        isOpen={activeModal === 'history'}
        onClose={handleModalClose}
        entries={journalEntries}
      />

      <EditorModals
        activeModal={activeModal}
        handleModalClose={handleModalClose}
        handleImport={handleImport}
        lessonsData={lessonsData}
        handleUpdateLessons={handleUpdateLessons}
        handleAssignDates={handleAssignDates}
        selectedCount={selectedCount}
        selectedItemsData={selectedItemsData}
        handleSaveDescription={handleSaveDescription}
        descriptionLabel={descriptionLabel}
        singleSelection={singleSelection}
        handleConfirmAddContent={handleConfirmAddContent}
        selectedIndices={selectedIndices}
        getDateWarnings={getDateWarnings}
      />
    </div>
  );
};
