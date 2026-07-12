import React, { useState, useEffect, useCallback, useMemo, useRef, useTransition } from 'react';
import { useImmer } from 'use-immer';
import { toast } from 'sonner';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { MainTable } from './MainTable';
import { SelectionBar } from './SelectionBar';
import { EditorSkeleton } from './ui/PageSkeleton';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Plus } from './ui/icons';
import { TimetableNudgeModal } from './modals/TimetableNudgeModal';
import { useHistoryState } from '../hooks/useHistoryState';
import { useConfigManager } from '../hooks/useConfigManager';
import { useLessonSearch } from '../hooks/useLessonSearch';
import { useSelectionData } from '../hooks/useSelectionData';
import { findItem, addTopLevelItem, addSection, addSubSection, addSubSubSection, addItem, deleteSeparator, migrateLessonsData, moveWithinParent, canMoveWithinParent } from '../utils/dataUtils';
import { prepareImportedLessons } from '../utils/importPipeline';
import { markClassDirty, markClassesListDirty, touchClassSyncMeta } from '../utils/syncBus';
import { collectSessionDates, filterLessonsByDates, getNewDates, readPrintMeta, recordPrint, savePrintPrefs } from '../utils/printMeta';
import { validateSessionDate } from '../utils/dateValidation';
import { appendJournal, opLabel, readJournal, timeAgoFr } from '../utils/journal';
import { PredefinedEntry, findPredefinedFor, loadPredefinedContent } from '../utils/predefinedContent';
import { BookOpen } from './ui/icons';
import { PrintModal, PrintMode, PrintOptions } from './modals/PrintModal';
import { HistoryModal } from './modals/HistoryModal';
import { printDocument } from '../utils/printUtils';
import { LessonsData, Indices, TopLevelItem, LessonItem, Section, SubSection, SubSubSection, ClassInfo, EmbeddableTopLevelType, EmbeddableTopLevelItem, Separator } from '../types';
import { PrintView } from './PrintView';
import { EditorModals } from './EditorModals';
import { DateReviewModal } from './modals/DateReviewModal';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP, normalizeOfficialClassName } from '../constants';
import { logger } from '../utils/logger';
import { todayInMorocco } from '../utils/calendar';

const SESSION_ASSISTANT_FOCUS_KEY = 'session_focus_v1';
interface SessionAssistantFocusPayload {
  classId: string;
  targetIndices: Indices;
  expiresAt: number;
  message: string;
}

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface EditorProps {
    classInfo: ClassInfo;
    onBack: () => void;
    /** ouvre la page Paramètres (utilisé pour renseigner l'emploi du temps) */
    onOpenSettings?: () => void;
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

interface PendingDateCommit {
  date: string;
  warnings: { message: string }[];
  commit: () => void;
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

const isDateableContentTarget = (indices: Indices, item: unknown): boolean => {
  return !!item && !indices.isSeparator;
};

export const Editor: React.FC<EditorProps> = ({ classInfo: initialClassInfo, onBack, onOpenSettings }) => {
  const { state: lessonsData, setState, resetState, undo, redo, canUndo, canRedo, operationType } = useHistoryState<LessonsData>([]);
  const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();

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
    printTextSize: 'm' as 's' | 'm' | 'l', // taille du texte imprimé
    printLineSpacing: 'normal' as 'compact' | 'normal' | 'aere', // aération des lignes
  });

  const [selectionState, setSelectionState] = useState<SelectionState>(() => createSelectionState());
  const [pendingDateCommit, setPendingDateCommit] = useState<PendingDateCommit | null>(null);
  const [isSelectionPending, startSelectionTransition] = useTransition();
  const editingIndicesRef = useRef<Indices | null>(null);
  const [sessionFocusKey, setSessionFocusKey] = useState<string | null>(null);
  const consumedSessionFocusRef = useRef<string | null>(null);

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
    printTextSize,
    printLineSpacing,
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
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
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

  const requestDateCommit = useCallback((date: string, commit: () => void) => {
    const warnings = date ? getDateWarnings(date) : [];
    if (warnings.length > 0) {
      setPendingDateCommit({ date, warnings, commit });
      return;
    }
    commit();
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
      resetState(migrateLessonsData(lessons), 'initial-load');
    } catch (error) {
      logger.error("Failed to load data from localStorage", error);
      showNotification("Erreur lors du chargement des donnees.", "error");
    } finally {
      setEditorState(draft => { draft.isClassLoading = false; });
    }
  }, [resetState, getStorageKey, showNotification, setEditorState]);

  const saveData = useCallback(() => {
    setEditorState(draft => { draft.saveStatus = 'saving'; });
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(lessonsData));
      touchClassSyncMeta(classInfo.id);
      markClassDirty(classInfo.id);
      setTimeout(() => setEditorState(draft => {
        // Une nouvelle édition peut arriver pendant le court retour visuel
        // « sauvegarde en cours ». Ne jamais l'écraser par un faux « sauvegardé ».
        if (draft.saveStatus === 'saving') draft.saveStatus = 'saved';
      }), 500);
    } catch (error) {
      logger.error("Failed to save data to localStorage", error);
      showNotification("Erreur de sauvegarde.", "error");
      setEditorState(draft => { draft.saveStatus = 'unsaved'; });
    }
  }, [lessonsData, getStorageKey, classInfo.id, showNotification, setEditorState]);

  const handleBack = useCallback(() => {
    if (!isClassLoading && !isConfigLoading && saveStatus !== 'saved') saveData();
    onBack();
  }, [isClassLoading, isConfigLoading, saveStatus, saveData, onBack]);

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
    const normalizedInfo = newInfo.name !== undefined
      ? { ...newInfo, name: normalizeOfficialClassName(newInfo.name) }
      : newInfo;
    setEditorState(draft => {
        Object.assign(draft.classInfo, normalizedInfo);
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
    if (isClassLoading) return;

    let payload: SessionAssistantFocusPayload | null = null;
    try {
      const raw = sessionStorage.getItem(SESSION_ASSISTANT_FOCUS_KEY);
      payload = raw ? (JSON.parse(raw) as SessionAssistantFocusPayload) : null;
    } catch {
      payload = null;
    }

    if (!payload || payload.classId !== classInfo.id || payload.expiresAt < Date.now()) return;

    const focusKey = indicesKey(payload.targetIndices);
    if (consumedSessionFocusRef.current === focusKey) return;

    const { item } = findItem(lessonsData, payload.targetIndices);
    if (!item) return;

    consumedSessionFocusRef.current = focusKey;
    setSelectionState(createSelectionState(payload.targetIndices));
    setSessionFocusKey(focusKey);
    toast.info(payload.message, { id: 'session-assistant-focus', duration: 9000 });

    try {
      sessionStorage.removeItem(SESSION_ASSISTANT_FOCUS_KEY);
    } catch {
      // aucune consequence : la garde consumedSessionFocusRef evite les boucles
    }

    const clearTimer = window.setTimeout(() => {
      setSessionFocusKey(current => (current === focusKey ? null : current));
    }, 3500);

    return () => window.clearTimeout(clearTimer);
  }, [classInfo.id, isClassLoading, lessonsData]);

  useEffect(() => {
    if (config.defaultTeacherName && config.defaultTeacherName !== classInfo.teacherName) {
      handleClassInfoChange({ teacherName: config.defaultTeacherName });
    }
  }, [config.defaultTeacherName, classInfo.teacherName, handleClassInfoChange]);

  useEffect(() => {
    setEditorState(draft => { draft.classInfo = initialClassInfo; });
  }, [initialClassInfo, setEditorState]);

  const handleCellUpdate = useCallback((indices: Indices, field: string, value: any) => {
    const commit = () => {
      setState(draft => {
          const { item } = findItem(draft, indices);
          if (item) (item as any)[field] = value;
      }, 'cell-edit');
      setEditorState(draft => { draft.saveStatus = 'unsaved'; });
    };
    if (field === 'date' && typeof value === 'string') requestDateCommit(value, commit);
    else commit();
  }, [setState, setEditorState, requestDateCommit]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    undo();
    setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [canUndo, undo, setEditorState]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    redo();
    setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [canRedo, redo, setEditorState]);

  const handleOpenAddContentModal = useCallback((indices?: Indices) => {
      setSelectionState(createSelectionState(indices));
      setEditorState(draft => {
        draft.activeModal = 'addContent';
      });
  }, [setEditorState]);

  const handleModalClose = useCallback(() => {
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
      setSelectionState(createSelectionState());
      handleModalClose();
  }, [selectedIndices, setState, showNotification, handleModalClose, addNewItemHighlight, setEditorState]);

  /*
   * Impression intelligente : la modale PrintModal montre ce qui a déjà été
   * imprimé (dates mémorisées par classe) et recommande le mode économique.
   */
  const printStats = useMemo(() => {
      const meta = readPrintMeta(classInfo.id);
      const allDates = collectSessionDates(lessonsData);
      return {
          totalDates: allDates.length,
          allDates,
          newDates: getNewDates(lessonsData, classInfo.id),
          printedDates: meta.printedDates,
          lastPrintedAt: meta.lastPrintedAt,
          prefs: meta.prefs ?? null,
      };
  }, [classInfo.id, lessonsData]);

  const handleSmartPrint = useCallback(() => {
      setEditorState(draft => { draft.activeModal = 'print'; });
  }, [setEditorState]);

  // Emploi du temps « en attente » : cette classe a-t-elle au moins un créneau
  // saisi ? L'invitation disparaît dès qu'un créneau existe (réactif à la config).
  const classHasTimetable = useMemo(
      () => (config.timetable ?? []).some(entry => entry.classId === classInfo.id),
      [config.timetable, classInfo.id]
  );

  // Renseigner l'emploi du temps : ouvre Paramètres directement sur l'onglet
  // « Emploi du temps » via un signal de session lu par ConfigModal au montage.
  const handleOpenTimetable = useCallback(() => {
      try { sessionStorage.setItem('config_initial_tab_v1', 'emploi'); } catch { /* stockage indisponible */ }
      onOpenSettings?.();
  }, [onOpenSettings]);

  /*
   * Invitation modale FLUIDE (une fois par session et par classe) : proposée
   * après un court délai à l'ouverture d'un cahier sans emploi du temps.
   * « Passer pour l'instant » la mémorise pour la session — jamais bloquant.
   */
  const [showTimetableNudge, setShowTimetableNudge] = useState(false);
  const timetableNudgeKey = `timetableNudge_v1_${classInfo.id}`;
  useEffect(() => {
      if (isClassLoading || isConfigLoading) return;
      if (classHasTimetable) { setShowTimetableNudge(false); return; }
      try { if (sessionStorage.getItem(timetableNudgeKey)) return; } catch { /* stockage indisponible */ }
      const timer = window.setTimeout(() => setShowTimetableNudge(true), 700);
      return () => window.clearTimeout(timer);
  }, [isClassLoading, isConfigLoading, classHasTimetable, timetableNudgeKey]);

  const dismissTimetableNudge = useCallback(() => {
      try { sessionStorage.setItem(timetableNudgeKey, '1'); } catch { /* stockage indisponible */ }
      setShowTimetableNudge(false);
  }, [timetableNudgeKey]);

  const fillTimetableFromNudge = useCallback(() => {
      dismissTimetableNudge();
      handleOpenTimetable();
  }, [dismissTimetableNudge, handleOpenTimetable]);

  const handleExecutePrint = useCallback((mode: PrintMode, options: PrintOptions, selectedDates?: string[]) => {
      const classId = classInfo.id;
      const allDates = collectSessionDates(lessonsData);
      const newDates = getNewDates(lessonsData, classId);

      // sous-ensemble à imprimer selon le mode ; null = document complet
      let selection: LessonsData | null = null;
      let datesToRecord: string[] = allDates;
      if (mode === 'new' && newDates.length > 0) {
          selection = filterLessonsByDates(lessonsData, newDates);
          datesToRecord = newDates;
      } else if (mode === 'custom' && selectedDates && selectedDates.length > 0) {
          selection = filterLessonsByDates(lessonsData, selectedDates);
          datesToRecord = selectedDates;
      }

      // mémorise les préférences de mise en page pour la prochaine impression
      savePrintPrefs(classId, {
          textSize: options.textSize,
          lineSpacing: options.lineSpacing,
          pageNumbers: options.pageNumbers,
      });

      setEditorState(draft => {
          draft.activeModal = null;
          draft.printPageNumbers = options.pageNumbers;
          draft.printTextSize = options.textSize;
          draft.printLineSpacing = options.lineSpacing;
      });

      const launchPrint = async () => {
          // garantir que TOUTES les formules LaTeX sont compilées avant
          // l'ouverture du dialogue d'impression (sinon syntaxe $...$ brute)
          try {
              await (window as unknown as { MathJax?: { typesetPromise?: () => Promise<void> } }).MathJax?.typesetPromise?.();
          } catch {
              // MathJax indisponible : on imprime tel quel
          }
          printDocument('cahier-de-textes');
          recordPrint(classId, datesToRecord);
      };

      if (selection) {
          // rendre le sous-ensemble dans PrintView avant de lancer l'impression
          setEditorState(draft => { draft.printSelection = selection; });
          setTimeout(() => {
              void launchPrint().then(() => {
                  // restaurer le rendu complet après le cycle d'impression
                  setTimeout(() => setEditorState(draft => { draft.printSelection = null; }), 500);
              });
          }, 120);
      } else {
          setTimeout(() => void launchPrint(), 60);
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
      const commit = () => {
      setState(draft => {
          if (typeof dateOrAssignments === 'string') {
              selectedIndices.forEach(idx => {
                  const { item } = findItem(draft, idx);
                  if (isDateableContentTarget(idx, item)) (item as any).date = dateOrAssignments;
              });
          } else {
              dateOrAssignments.forEach(assignment => {
                  const { item } = findItem(draft, assignment.indices);
                  if (isDateableContentTarget(assignment.indices, item)) (item as any).date = assignment.date;
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
      };
      if (typeof dateOrAssignments === 'string') requestDateCommit(dateOrAssignments, commit);
      else commit();
  }, [selectedIndices, setState, setEditorState, showNotification, requestDateCommit]);

  const handleClearSelectedDates = useCallback(() => {
      if (selectedIndices.length === 0) return;
      setState(draft => {
          selectedIndices.forEach(idx => {
              const { item } = findItem(draft, idx);
              if (item && !idx.isSeparator && typeof (item as any).date === 'string') {
                  (item as any).date = '';
              }
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
      setConfirmBulkDelete(true);
  }, [selectedIndices]);

  const executeBulkDelete = useCallback(() => {
      if (selectedIndices.length === 0) return;
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

      const commit = () => {
        setState(draft => {
            const { item } = findItem(draft, indices);
            if (item) Object.assign(item, finalItem);
        }, 'inline-edit-item');
        showNotification("Element mis a jour.", "success");
        setEditorState(draft => {
          draft.saveStatus = 'unsaved';
          draft.editingIndices = null;
        });
      };
      if (typeof finalItem.date === 'string') requestDateCommit(finalItem.date, commit);
      else commit();
  }, [setState, showNotification, setEditorState, requestDateCommit]);

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

  const selectedDates = selectedItemsData.map(item => item.date).filter(Boolean);
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

  // En-tête contextuel de la barre de sélection : type (en français) + titre.
  const selectionLabel = useMemo(() => {
    if (selectedCount !== 1 || !singleSelection?.item) return null;
    const item: any = singleSelection.item;
    const rawType: string = item.type || '';
    // libellé français : blocs de haut niveau via TOP_LEVEL_TYPE_CONFIG
    // (chapter → « Chapitre »), sinon le type est déjà un mot français.
    const typeLabel = rawType
      ? (TOP_LEVEL_TYPE_CONFIG[rawType as keyof typeof TOP_LEVEL_TYPE_CONFIG]?.name
          ?? rawType.charAt(0).toUpperCase() + rawType.slice(1))
      : '';
    const title = (item.title || item.name || '').trim();
    if (!title) return typeLabel || 'Élément sélectionné';
    // anti-redondance : si le titre commence déjà par le type, on n'ajoute pas le préfixe.
    if (typeLabel && title.toLowerCase().startsWith(typeLabel.toLowerCase())) return title;
    return typeLabel ? `${typeLabel} — ${title}` : title;
  }, [selectedCount, singleSelection]);

  // « Dater aujourd'hui » : un tap, réutilise le circuit handleAssignDates
  // (donc aussi la garde intelligente sur la date du jour).
  const handleAssignToday = useCallback(() => {
      handleAssignDates(todayInMorocco());
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

  // Offset sticky dynamique : l'en-tête de colonnes du tableau se cale juste
  // sous la barre d'outils collante (top-2 = 8 px). La hauteur de la barre
  // varie (retour à la ligne sur mobile, ouverture de la recherche) — un
  // ResizeObserver republie la variable CSS --cdt-sticky-top en temps réel.
  const isLoading = isClassLoading || isConfigLoading;

  if (isLoading) {
    return <EditorSkeleton />;
  }

  return (
    <div className="relative w-full pb-8 safe-bottom print:bg-card print:p-0" data-editor-root>
      <div className="max-w-screen-2xl mx-auto flex flex-col min-h-screen print:mx-0 print:w-full print:max-w-none print:min-h-0 print:bg-card print:p-0 print:shadow-none">
        <div className="print-hidden flex flex-col flex-1">
          <Header
            classInfo={classInfo}
            establishmentName={config.establishmentName}
            onClassInfoChange={handleClassInfoChange}
            onBack={handleBack}
          />
          {/* Barre d'outils COLLANTE : rendue en enfant direct de la colonne
              flex (pas de wrapper à sa taille, sinon le sticky serait confiné à
              cette boîte et ne dépasserait pas). Elle reste ainsi visible tout
              au long du défilement, avec l'en-tête de colonnes calé dessous. */}
          <Toolbar
            onUndo={handleUndo}
            onRedo={handleRedo}
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
          {/* Proposition de programme prédéfini (cahier vide + contenu disponible) */}
          {predefinedOffer && lessonsData.length === 0 && (
            <div className="mx-auto mb-3 flex w-full max-w-2xl flex-col items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center sm:flex-row sm:text-left print:hidden shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200 text-primary">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 font-display">{predefinedOffer.titre}</p>
                <p className="text-xs text-slate-600">
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
          {/* Bloc tableau aligne sur le padding interieur de la carte parente. */}
          <main className="flex-1 pb-24 sm:pb-20 print:mx-0" onClick={handleDeselectAll}>
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
              focusKey={sessionFocusKey}
            />
          </main>
        </div>

        <PrintView lessonsData={printSelection ?? filteredData} classInfo={classInfo} config={config} newlyAddedIds={newlyAddedIds} pageNumbers={printPageNumbers} textSize={printTextSize} lineSpacing={printLineSpacing} />
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
        allDates={printStats.allDates}
        printedDates={printStats.printedDates}
        lastPrintedAt={printStats.lastPrintedAt}
        savedPrefs={printStats.prefs}
        config={config}
        onConfigChange={updateConfig}
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
        config={config}
        onConfigChange={updateConfig}
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

      <DateReviewModal
        isOpen={pendingDateCommit !== null}
        date={pendingDateCommit?.date ?? ''}
        warnings={pendingDateCommit?.warnings ?? []}
        onModify={() => {
          setPendingDateCommit(null);
          window.requestAnimationFrame(() => document.getElementById('assign-date-input')?.focus());
        }}
        onConfirm={() => {
          const pending = pendingDateCommit;
          setPendingDateCommit(null);
          pending?.commit();
        }}
      />

      <TimetableNudgeModal
        isOpen={showTimetableNudge}
        onSkip={dismissTimetableNudge}
        onFill={fillTimetableFromNudge}
        classLabel={classInfo.name}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={`Supprimer ${selectedIndices.length} élément(s) ?`}
        description="Les éléments sélectionnés seront retirés du cahier (annulable via Annuler/Ctrl+Z)."
        confirmLabel="Supprimer"
        onConfirm={executeBulkDelete}
      />
    </div>
  );
};
