import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useSelectionEngine, createSelectionState } from './hooks/useSelectionEngine';
import { useBulkOperations } from './hooks/useBulkOperations';
import { useSessionAssignment } from './hooks/useSessionAssignment';
import { useImmer } from 'use-immer';
import { readInitialNotebook, notebookStorageKey } from './initialNotebook';
import { toast } from 'sonner';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { MainTable } from './MainTable';
import { SelectionBar } from './SelectionBar';
import { AppBootSkeleton, EditorSkeleton } from '@/components/ui/PageSkeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TimetableNudgeModal } from './modals/TimetableNudgeModal';
import { useHistoryState } from '@/features/editor/hooks/useHistoryState';
import { useConfigManager } from '@/hooks/useConfigManager';
import { indicesKey, resolveAddAfterTarget } from '@/domain/notebook/lessonRows';
import { buildContentDateOrder } from '@/domain/calendar/dateOrder';
import { buildContentNumbers } from '@/domain/notebook/contentNumbering';
import { useLessonSearch } from '@/features/editor/hooks/useLessonSearch';
import { applyContentEdit, buildContentEditTargetsGrouped, buildSessionTargetsGrouped, expandContentSelection, resolveContentEditSelection } from '@/domain/notebook/contentEditing';
import type { ContentDraft } from '@/domain/notebook/contentDraft';
import { useMoroccoToday } from '@/hooks/useMoroccoToday';
import { useSelectionData } from '@/features/editor/hooks/useSelectionData';
import { findItem, addTopLevelItem, addSection, addSubSection, addSubSubSection, addItem, migrateLessonsData } from '@/domain/notebook/dataUtils';
import { prepareImportedLessons } from '@/domain/notebook/importPipeline';
import { contentLocaleFromDirection, defaultContentDirection, detectContentDirection, readStoredContentDirection } from '@/domain/notebook/contentDirection';
import { markClassDirty, markClassesListDirty, notifyClassesChanged, subscribe, touchClassSyncMeta } from '@/infrastructure/sync/syncBus';
import { collectSessionDates, createPrintSelection, getNewDates, readPrintMeta, recordPrint, savePrintPrefs, sessionPrintSignatures } from '@/infrastructure/printing/printMeta';
import { DateWarning, toDisplayWarnings, validateSessionDate } from '@/domain/calendar/dateValidation';
import { appendJournal } from '@/infrastructure/storage/journal';
import { PredefinedEntry, findPredefinedFor, loadPredefinedContent } from '@/domain/curriculum/predefinedContent';
import {
  EDITOR_MODAL_KEY,
  EditorModalPayload,
  SESSION_FOCUS_KEY,
  SessionFocusPayload,
  dateActionId,
  readIgnoredActionIds,
  writeIgnoredActionIds,
} from '@/infrastructure/notifications/notificationSignals';
import { PrintModal, PrintMode, PrintOptions } from './modals/PrintModal';
import { printDocument, preparePrintContent } from '@/infrastructure/printing/printUtils';
import { LessonsData, Indices, TopLevelItem, LessonItem, Section, SubSection, SubSubSection, ClassInfo, EmbeddableTopLevelType, EmbeddableTopLevelItem, ContentDirection } from '@/types';
import { PrintView } from './PrintView';
import { EditorModals } from './EditorModals';
import { DateReviewModal } from './modals/DateReviewModal';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP, normalizeOfficialClassName } from '@/constants';
import { insertFreeContent } from '@/domain/notebook/freeContent';
import { isFreeContent } from '@/domain/notebook/freeLineType';
import { groupLessonRows } from '@/domain/notebook/tableRows';
import { logger } from '@/lib/logger';
import { todayInMorocco } from '@/domain/calendar/calendar';
import { hasOnlyPristineStarterDiagnostic, withStarterDiagnostic } from '@/domain/notebook/starterDiagnostic';
import { useLocale } from '@/i18n/LocaleProvider';
import { captureWorkspaceLease, registerWorkspaceWriter } from '@/infrastructure/storage/accountWorkspace';
import { hasMathContent } from '@/lib/text/math';
import { useSync } from '@/contexts/SyncContext';
import { saveNotebook } from '@/infrastructure/storage/saveNotebook';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface EditorProps {
    classInfo: ClassInfo;
    /** ouvre la page Paramètres (utilisé pour renseigner l'emploi du temps) */
    onOpenSettings?: () => void;
    /** retour aux classes */
    onBack?: () => void;
}

type ActiveModal =
  | 'dataTransfer'
  | 'manageLessons'
  | 'guide'
  | 'analyse'
  | 'evaluations'
  | 'addContent'
  | 'editContent'
  | 'assignDate'
  | 'print'
  | null;



export const Editor: React.FC<EditorProps> = ({ classInfo: initialClassInfo, onOpenSettings, onBack }) => {
  const [workspaceIsActive] = useState(() => captureWorkspaceLease());
  const { t, locale } = useLocale();
  const { syncNow } = useSync();
  // Lecture SYNCHRONE du cahier avant le premier rendu : la classe s'ouvre
  // directement sur son tableau. Une lecture illisible (`null`) retombe sur le
  // chargement différé et son écran d'attente, jamais sur un cahier vide.
  const [initialNotebook] = useState(() => readInitialNotebook({ classId: initialClassInfo.id, locale }));
  const initialNotebookRef = useRef<{ classId: string } | null>(initialNotebook ? { classId: initialClassInfo.id } : null);
  const { state: lessonsData, setState, resetState, undo, redo, canUndo, canRedo, operationType, historyAction } = useHistoryState<LessonsData>(initialNotebook?.lessons ?? []);
  const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();

  const [editorState, setEditorState] = useImmer({
    classInfo: initialClassInfo,
    // Faux quand la lecture synchrone a réussi : plus aucun squelette à l'ouverture.
    isClassLoading: !initialNotebook,
    saveStatus: 'saved' as 'saved' | 'saving' | 'unsaved',
    activeModal: null as ActiveModal,
    editingIndices: null as Indices | null,
    searchQuery: '',
    // La langue du contenu est indépendante de celle de l'interface : un
    // enseignant peut conserver l'UI française avec un cahier arabe, ou inversement.
    // La direction ENREGISTRÉE dans le cahier prime sur la langue de l'interface :
    // c'est elle qui garde un texte latin lisible de gauche à droite dans un
    // cahier arabe (et l'inverse).
    contentDirection: (initialNotebook?.direction ?? defaultContentDirection(locale)) as ContentDirection,
    newlyAddedIds: [] as string[],
  });

  // Un cahier vierge reçoit son diagnostic de départ : la version corrigée est
  // persistée dès l'ouverture, comme avant la lecture synchrone, pour qu'elle
  // survive au retour au tableau de bord et parte vers les autres appareils.
  useEffect(() => {
    if (!initialNotebook?.repaired || !workspaceIsActive()) return;
    try {
      localStorage.setItem(notebookStorageKey(initialClassInfo.id), JSON.stringify({
        lessonsData: initialNotebook.lessons,
        contentDirection: initialNotebook.direction,
      }));
      touchClassSyncMeta(initialClassInfo.id);
      markClassDirty(initialClassInfo.id);
    } catch { /* stockage plein : le cahier reste en mémoire */ }
    // Une seule fois, pour la classe ouverte : les changements de classe passent par loadData.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editingIndicesRef = useRef<Indices | null>(null);
  const [sessionFocusKey, setSessionFocusKey] = useState<string | null>(null);
  const consumedSessionFocusRef = useRef<string | null>(null);
  const [printMetaVersion, setPrintMetaVersion] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [initialMathTypesetComplete, setInitialMathTypesetComplete] = useState(false);
  const isPrintingRef = useRef(false);
  const [printSnapshot, setPrintSnapshot] = useState<React.ComponentProps<typeof PrintView> | null>(null);
  const [pendingPrintConfirmation, setPendingPrintConfirmation] = useState<{ classId: string; signatures: Record<string, string> } | null>(null);
  useEffect(() => { setPrintSnapshot(null); setPendingPrintConfirmation(null); }, [initialClassInfo.id]);
  const lessonsDataRef = useRef<LessonsData>(lessonsData);
  /*
   * Ordre chronologique : chaque contenu daté connaît son plus proche
   * voisin daté (avant / après). Le contrôle est mémoïsé : passé à
   * MainTable (React.memo), une lambda par rendu casserait la table.
   */
  const contentDateOrder = useMemo(() => buildContentDateOrder(lessonsData), [lessonsData]);
  const getDateOrder = useCallback(
    (indices: Indices) => contentDateOrder.get(indicesKey(indices)),
    [contentDateOrder],
  );
  // Numérotation par chapitre : « définition 1 », « exemple 2 »… Un numéro
  // saisi à la main reste prioritaire sur le calcul (activé par défaut).
  const contentNumbers = useMemo(
    () => buildContentNumbers(lessonsData, config.contentNumbering?.enabled !== false),
    [lessonsData, config.contentNumbering?.enabled],
  );
  const getContentNumber = useCallback(
    (indices: Indices) => contentNumbers.get(indicesKey(indices)),
    [contentNumbers],
  );
  const contentDirectionRef = useRef<ContentDirection>(editorState.contentDirection);
  const saveStatusRef = useRef<'saved' | 'saving' | 'unsaved'>(editorState.saveStatus);

  useEffect(() => () => {
    isPrintingRef.current = false;
  }, []);

  const {
    classInfo,
    isClassLoading,
    saveStatus,
    activeModal,
    editingIndices,
    searchQuery,
    contentDirection,
    newlyAddedIds,
  } = editorState;
  // Les événements pagehide/démontage doivent toujours voir le dernier rendu,
  // sans dépendre du délai d'autosauvegarde de 1,5 seconde.
  lessonsDataRef.current = lessonsData;
  contentDirectionRef.current = contentDirection;
  saveStatusRef.current = saveStatus;
  const isNotebookAwaitingContent = lessonsData.length === 0 || hasOnlyPristineStarterDiagnostic(lessonsData);
  const notebookHasMath = useMemo(() => hasMathContent(lessonsData), [lessonsData]);

  useEffect(() => {
    if (initialMathTypesetComplete || isClassLoading || isConfigLoading) return;
    if (!notebookHasMath) {
      setInitialMathTypesetComplete(true);
      return;
    }
    // KaTeX compose les formules pendant le rendu. Laisser deux frames pour
    // leur première peinture, sans moteur asynchrone ni attente artificielle.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setInitialMathTypesetComplete(true));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [initialMathTypesetComplete, isClassLoading, isConfigLoading, notebookHasMath]);

  useEffect(() => {
    editingIndicesRef.current = editingIndices;
  }, [editingIndices]);

  // Une recherche lancée depuis « Mes classes » continue dans le tableau du
  // cahier : mêmes mots, mêmes lignes filtrées et surlignées, sans ressaisie.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('dashboard_search_handoff_v1');
      if (!raw) return;
      const pending = JSON.parse(raw) as { classId?: string; query?: string };
      if (pending.classId !== classInfo.id || !pending.query?.trim()) return;
      setEditorState(draft => { draft.searchQuery = pending.query!.trim(); });
      sessionStorage.removeItem('dashboard_search_handoff_v1');
    } catch {
      sessionStorage.removeItem('dashboard_search_handoff_v1');
    }
  }, [classInfo.id, setEditorState]);

  /*
   * Contenu prédéfini : si le cahier est vide et qu'un programme officiel
   * existe pour ce niveau × matière, on le propose (utiliser tel quel,
   * puis modifier librement, ou l'ignorer et créer son propre contenu).
  */
  const [predefinedOffer, setPredefinedOffer] = useState<PredefinedEntry | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  useEffect(() => {
      let cancelled = false;
      if (isClassLoading || !isNotebookAwaitingContent) {
          setPredefinedOffer(null);
          return;
      }
      findPredefinedFor(classInfo).then(entry => {
          if (!cancelled) setPredefinedOffer(entry);
      });
      return () => { cancelled = true; };
  }, [isClassLoading, isNotebookAwaitingContent, classInfo]);

  const handleLoadPredefined = useCallback(async () => {
      if (!predefinedOffer) return;
      try {
          const prepared = await loadPredefinedContent(predefinedOffer);
          if (!workspaceIsActive()) return;
          setState(
            () => withStarterDiagnostic(
              prepared.lessonsData,
              contentLocaleFromDirection(prepared.direction.direction),
            ),
            'import-data',
          );
          setEditorState(draft => {
            draft.contentDirection = prepared.direction.direction;
            draft.saveStatus = 'unsaved';
          });
          toast.success(t('editorNotice.predefinedLoaded'));
      } catch {
          if (workspaceIsActive()) toast.error(t('editorNotice.predefinedLoadError'));
      }
  }, [predefinedOffer, setState, setEditorState, t, workspaceIsActive]);

  /*
   * Journal des actions : chaque opération d'édition (operationType du
   * useHistoryState) est consignée avec son horodatage → alimente la ligne
   * « Dernière modification » et le centre global d’activité.
   */
  useEffect(() => {
    if (!workspaceIsActive()) return;
    const journalOp = historyAction === 'undo'
      ? 'undo'
      : historyAction === 'redo'
        ? 'redo'
        : historyAction === 'edit'
          ? operationType
          : null;
    if (journalOp && journalOp !== 'initial' && journalOp !== 'initial-load') {
      appendJournal(classInfo.id, journalOp);
    }
    // La donnée change à chaque édition/annulation/rétablissement. Ne pas
    // dépendre de classInfo.id : lors d'un changement de classe, l'ancien
    // snapshot ne doit jamais être journalisé dans le nouveau cahier.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonsData]);

  // Échap : efface la sélection (si aucune modale/édition n'est ouverte, elles gèrent leur propre Échap)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (editingIndicesRef.current !== null) return;
      setSelectionState(current => (current.keys.size === 0 ? current : createSelectionState()));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const { rows: visibleRows, allRows, query: displayedQuery } = useLessonSearch(lessonsData, searchQuery);
  // UN SEUL groupement pour tout l'écran : les cibles d'édition et les cibles
  // de séance en dérivent, au lieu de refaire le parcours de fusion deux fois.
  const groupedRows = useMemo(() => groupLessonRows(allRows).renderRows, [allRows]);
  const contentEditTargets = useMemo(() => buildContentEditTargetsGrouped(groupedRows), [groupedRows]);
  /** Même moteur de fusion, autre intention : une séance fusionnée est UNE
   *  ligne pour la remarque et pour le déplacement. */
  const sessionTargets = useMemo(() => buildSessionTargetsGrouped(groupedRows), [groupedRows]);
  /** Lignes libres : la relocalisation ne les concerne qu'elles. */
  const freeKeys = useMemo(() => new Set(allRows.filter(row => isFreeContent(row.data)).map(row => row.key)), [allRows]);
  const {
    selectionState,
    selectedIndices,
    selectedCount,
    isSelectionPending,
    canMoveUp,
    canMoveDown,
    handleMoveSelected,
    handleToggleSelectRow,
    handleToggleSelectGroup,
    handleDeselectAll,
    setSelectionState
  } = useSelectionEngine({
    lessonsData,
    moveTargets: sessionTargets,
    freeKeys,
    setState,
    setEditorState
  });

  const { handleBulkDelete, executeBulkDelete } = useBulkOperations({
    selectedIndices,
    setState,
    setEditorState,
    setSelectionState,
    setConfirmBulkDelete
  });


  const getStorageKey = useCallback(() => `classData_v1_${classInfo.id}`, [classInfo.id]);

  const showNotification = useCallback((message: string, type: NotificationType) => {
    toast[type](message);
  }, []);

  /*
   * Garde intelligente : à chaque affectation de date, croise la date avec
   * l'emploi du temps de la classe, les jours fériés, les vacances et les
   * absences du prof. Alerte non bloquante (toast), le prof reste maître.
   * `getDateWarnings` est mémoïsé : passé à MainTable (React.memo), une
   * lambda inline casserait la mémoïsation de toute la table.
   */
  const getDateWarnings = useCallback(
    (date: string) => validateSessionDate(date, classInfo, config, locale),
    [classInfo, config, locale]
  );

  /*
   * Affichage du tableau : une séance déjà passée ne doit plus être repeinte
   * en orange parce que l'emploi du temps a changé depuis l'affectation des
   * dates. Les dates elles-mêmes ne sont jamais modifiées ; seule la couleur
   * rétroactive disparaît. La saisie d'une date (requestDateCommit) continue
   * d'utiliser la validation complète, y compris pour une saisie rétroactive.
   */
  const today = useMoroccoToday();
  const getDisplayDateWarnings = useCallback(
    (date: string) => toDisplayWarnings(getDateWarnings(date), date, today),
    [getDateWarnings, today]
  );

  const sessionAssignment = useSessionAssignment({
    lessonsData, locale, setState, getDateWarnings, isActive: workspaceIsActive,
    onOpen: () => setEditorState(draft => { draft.activeModal = 'assignDate'; }),
    onClose: () => setEditorState(draft => { draft.activeModal = null; }),
    onSaved: () => {
      setSelectionState(createSelectionState());
      setEditorState(draft => { draft.saveStatus = 'unsaved'; });
    },
    onStale: () => showNotification(t('editorNotice.selectionUnavailable'), 'info'),
  });
  const { open: openSession, assignDate: assignSessionDate, cancel: cancelSession } = sessionAssignment;
  const handleOpenRemark = useCallback((indices: Indices) => {
    const targets = sessionTargets.get(indicesKey(indices));
    if (targets) openSession(targets, 'remark');
  }, [sessionTargets, openSession]);

  /*
   * Exception de date : « Ignorer » dans la vérification de date enregistre
   * le point dans la même mémoire que le centre de notifications de
   * l'accueil (mêmes identifiants), il y devient réactivable.
   */
  const ignoreDateException = useCallback((date: string, warnings: DateWarning[]) => {
    if (!workspaceIsActive()) return;
    const ids = readIgnoredActionIds(classInfo.id);
    ids.add(dateActionId(classInfo.id, date, warnings));
    writeIgnoredActionIds(classInfo.id, ids);
  }, [classInfo.id, workspaceIsActive]);

  const addNewItemHighlight = useCallback((id: string) => {
    setEditorState(draft => { draft.newlyAddedIds.push(id); });
    setTimeout(() => {
        setEditorState(draft => { draft.newlyAddedIds = draft.newlyAddedIds.filter(i => i !== id); });
    }, 2500);
  }, [setEditorState]);

  const loadData = useCallback(() => {
    // Cahier déjà en mémoire (lecture synchrone du premier rendu) : recharger
    // réinitialiserait l'historique d'annulation sans rien apporter.
    if (initialNotebookRef.current?.classId === classInfo.id) {
      initialNotebookRef.current = null;
      return;
    }
    setEditorState(draft => { draft.isClassLoading = true; });
    try {
      const raw = localStorage.getItem(getStorageKey());
      const savedData = raw ? JSON.parse(raw) : [];
      const lessons = Array.isArray(savedData) ? savedData : (savedData.lessonsData ?? []);
      const migratedLessons = migrateLessonsData(lessons);
      // Les anciens cahiers (simple tableau) sont analysés une fois ; les
      // nouveaux gardent une décision explicite dans le même instantané.
      const fallback = defaultContentDirection(locale);
      const storedDirection = readStoredContentDirection(savedData);
      const detectedDirection = detectContentDirection(lessons, fallback).direction;
      const nextDirection = storedDirection ?? detectedDirection;
      // Un cahier VIERGE reçoit son diagnostic de départ ; un cahier qui a du
      // contenu est pris tel quel : supprimer le diagnostic doit tenir.
      const normalizedLessons = migratedLessons.length === 0
        ? withStarterDiagnostic(migratedLessons, contentLocaleFromDirection(nextDirection))
        : migratedLessons;
      resetState(normalizedLessons, 'initial-load');
      setEditorState(draft => { draft.contentDirection = nextDirection; });

      // Répare une fois les cahiers existants créés avant cette règle. La
      // correction est persistée immédiatement afin qu'elle survive au retour
      // Dashboard et soit propagée aux autres appareils.
      if (normalizedLessons !== migratedLessons && workspaceIsActive()) {
        localStorage.setItem(getStorageKey(), JSON.stringify({
          lessonsData: normalizedLessons,
          contentDirection: nextDirection,
        }));
        touchClassSyncMeta(classInfo.id);
        markClassDirty(classInfo.id);
      }
    } catch (error) {
      logger.error("Failed to load data from localStorage", error);
      showNotification(t('editorNotice.loadError'), "error");
    } finally {
      setEditorState(draft => { draft.isClassLoading = false; });
    }
  }, [resetState, getStorageKey, showNotification, setEditorState, t, locale, workspaceIsActive, classInfo.id]);

  const persistCurrentData = useCallback((withVisualStatus: boolean): boolean => {
    if (!workspaceIsActive()) return false;
    if (saveStatusRef.current === 'saved') return true;
    if (withVisualStatus) setEditorState(draft => { draft.saveStatus = 'saving'; });
    try {
      saveNotebook(classInfo.id, lessonsDataRef.current, contentDirectionRef.current);
      saveStatusRef.current = 'saved';
      if (withVisualStatus) {
        setEditorState(draft => { draft.saveStatus = 'saved'; });
      }
      return true;
    } catch (error) {
      logger.error("Failed to save data to localStorage", error);
      saveStatusRef.current = 'unsaved';
      if (withVisualStatus) {
        showNotification(t('editorNotice.saveError'), "error");
        setEditorState(draft => { draft.saveStatus = 'unsaved'; });
      }
      return false;
    }
  }, [classInfo.id, showNotification, setEditorState, t, workspaceIsActive]);

  useEffect(() => registerWorkspaceWriter(() => (
    workspaceIsActive() ? persistCurrentData(false) : true
  )), [persistCurrentData, workspaceIsActive]);

  const saveData = useCallback(() => {
    if (persistCurrentData(true)) void syncNow();
  }, [persistCurrentData, syncNow]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (!activeModal) saveData();
      }
    };
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [saveData, activeModal]);

  // Garantie locale : quitter rapidement après une édition ne peut plus annuler
  // la dernière saisie avant que l'autosauvegarde différée ait eu le temps de partir.
  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') persistCurrentData(false);
    };
    const flushOnPageHide = () => { persistCurrentData(false); };
    document.addEventListener('visibilitychange', flushWhenHidden);
    window.addEventListener('pagehide', flushOnPageHide);
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden);
      window.removeEventListener('pagehide', flushOnPageHide);
      persistCurrentData(false);
    };
  }, [persistCurrentData]);

  const handleExportData = useCallback(() => {
    if (!workspaceIsActive()) return;
    try {
        const dataToExport = { classInfo, lessonsData, contentDirection };
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
        appendJournal(classInfo.id, 'export-data');
        showNotification(t('editorNotice.exportSuccess'), "success");
    } catch (error) {
        logger.error("Failed to export data", error);
        showNotification(t('editorNotice.exportError'), "error");
    }
  }, [classInfo, lessonsData, contentDirection, showNotification, t, workspaceIsActive]);

  const handleClassInfoChange = useCallback((newInfo: Partial<ClassInfo>) => {
    if (!workspaceIsActive()) return;
    const normalizedInfo = newInfo.name !== undefined
      ? { ...newInfo, name: normalizeOfficialClassName(newInfo.name) }
      : newInfo;
    setEditorState(draft => {
        if (!workspaceIsActive()) return;
        Object.assign(draft.classInfo, normalizedInfo);
        try {
            const allClasses: ClassInfo[] = JSON.parse(localStorage.getItem('classManager_v1') || '[]');
            const updatedClasses = allClasses.map(c =>
                c.id === draft.classInfo.id ? { ...c, ...normalizedInfo } : c
            );
            localStorage.setItem('classManager_v1', JSON.stringify(updatedClasses));
            markClassesListDirty();
            notifyClassesChanged();
        } catch (e) {
            logger.error("Failed to update class info in storage", e);
            showNotification(t('editorNotice.classUpdateError'), "error");
        }
    });
  }, [setEditorState, showNotification, t, workspaceIsActive]);

  useEffect(() => {
    if (isClassLoading || isConfigLoading || saveStatus !== 'unsaved') return;
    const handler = setTimeout(() => {
      persistCurrentData(true);
    }, 1500);
    return () => clearTimeout(handler);
  }, [lessonsData, contentDirection, isClassLoading, isConfigLoading, saveStatus, persistCurrentData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // A newer cloud notebook must also refresh derived chapter boundaries on screen.
  // Do not reset undo history for metadata-only pulls or overwrite an in-flight local edit.
  useEffect(() => subscribe('pull-applied', () => {
    if (!workspaceIsActive() || saveStatusRef.current !== 'saved') return;
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (!raw) return;
      const stored = JSON.parse(raw);
      const incoming = migrateLessonsData(Array.isArray(stored) ? stored : (stored.lessonsData ?? []));
      const incomingDirection = readStoredContentDirection(stored);
      if (JSON.stringify(incoming) === JSON.stringify(lessonsDataRef.current)
        && (!incomingDirection || incomingDirection === contentDirectionRef.current)) return;
      loadData();
      setSelectionState(createSelectionState());
      setEditorState(draft => {
        draft.editingIndices = null;
        if (draft.activeModal === 'editContent') draft.activeModal = null;
      });
    } catch (error) { logger.error('Failed to refresh the cloud notebook', error); }
  }), [getStorageKey, loadData, setEditorState, workspaceIsActive]);

  useEffect(() => {
    if (isClassLoading) return;

    let payload: SessionFocusPayload | null = null;
    try {
      const raw = sessionStorage.getItem(SESSION_FOCUS_KEY);
      payload = raw ? (JSON.parse(raw) as SessionFocusPayload) : null;
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
      sessionStorage.removeItem(SESSION_FOCUS_KEY);
    } catch {
      // aucune consequence : la garde consumedSessionFocusRef evite les boucles
    }

    const clearTimer = window.setTimeout(() => {
      setSessionFocusKey(current => (current === focusKey ? null : current));
    }, 3500);

    return () => window.clearTimeout(clearTimer);
  }, [classInfo.id, isClassLoading, lessonsData]);

  /*
   * Deep-link du centre de notifications : ouvre directement la modale visée
   * (évaluations, impression, import/export) à l'arrivée dans le cahier.
   */
  useEffect(() => {
    if (isClassLoading) return;
    let payload: EditorModalPayload | null = null;
    try {
      const raw = sessionStorage.getItem(EDITOR_MODAL_KEY);
      payload = raw ? (JSON.parse(raw) as EditorModalPayload) : null;
    } catch {
      payload = null;
    }
    if (!payload || payload.classId !== classInfo.id || payload.expiresAt < Date.now()) return;
    try {
      sessionStorage.removeItem(EDITOR_MODAL_KEY);
    } catch { /* déjà consommé au prochain rendu grâce au retrait ci-dessus */ }
    const modal = payload.modal;
    if (modal === 'evaluations' || modal === 'dataTransfer' || modal === 'print') {
      setEditorState(draft => { draft.activeModal = modal; });
    }
  }, [classInfo.id, isClassLoading, setEditorState]);

  useEffect(() => {
    if (config.defaultTeacherName && config.defaultTeacherName !== classInfo.teacherName) {
      handleClassInfoChange({ teacherName: config.defaultTeacherName });
    }
  }, [config.defaultTeacherName, classInfo.teacherName, handleClassInfoChange]);

  useEffect(() => {
    setEditorState(draft => { draft.classInfo = initialClassInfo; });
  }, [initialClassInfo, setEditorState]);

  useEffect(() => {
    const reloadMetadata = () => {
      if (!workspaceIsActive()) return;
      try {
        const latest = (JSON.parse(localStorage.getItem('classManager_v1') ?? '[]') as ClassInfo[]).find(item => item.id === initialClassInfo.id);
        if (latest) setEditorState(draft => { draft.classInfo = latest; });
      } catch { /* Preserve the current notebook if storage is temporarily unavailable. */ }
    };
    const unsubscribers = [subscribe('classes-changed', reloadMetadata), subscribe('pull-applied', reloadMetadata)];
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [initialClassInfo.id, setEditorState, workspaceIsActive]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    undo();
    setSelectionState(createSelectionState());
    setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [canUndo, undo, setEditorState]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    redo();
    setSelectionState(createSelectionState());
    setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [canRedo, redo, setEditorState]);

  // Raccourcis d'historique : Ctrl/Cmd+Z annule, Ctrl/Cmd+Maj+Z (ou Ctrl+Y)
  // rétablit. Ils sont ignorés pendant une saisie, pour ne pas voler
  // l'annulation native d'un champ ni l'édition en cours.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;
      const key = event.key.toLowerCase();
      const wantsRedo = key === 'y' || (key === 'z' && event.shiftKey);
      if (wantsRedo) {
        if (!canRedo) return;
        event.preventDefault();
        handleRedo();
        return;
      }
      if (key !== 'z' || !canUndo) return;
      event.preventDefault();
      handleUndo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUndo, canRedo, handleRedo, handleUndo]);

  const handleOpenAddContentModal = useCallback((indices?: Indices) => {
      setSelectionState(createSelectionState(indices));
      setEditorState(draft => {
        draft.activeModal = 'addContent';
      });
  }, [setEditorState]);

  const handleClearSearch = useCallback(() => setEditorState(draft => { draft.searchQuery = ""; }), [setEditorState]);

  const handleModalClose = useCallback(() => {
    cancelSession();
    setEditorState(draft => {
      draft.activeModal = null;
      draft.editingIndices = null;
    });
  }, [setEditorState, cancelSession]);

  const handleConfirmAddContent = useCallback((type: string, data: any) => {
      let notificationMessage = '';
      const newId = crypto.randomUUID();
      const anchor = selectedIndices[selectedIndices.length - 1];
      const anchorCanReceiveEmbeddedBlock =
          !!anchor &&
          (anchor.sectionIndex !== undefined ||
           anchor.subsectionIndex !== undefined ||
           anchor.subsubsectionIndex !== undefined);

      if (type === 'free') {
          setState(draft => insertFreeContent(draft, anchor, data, newId), 'add-free-content');
          notificationMessage = t('editorNotice.itemAdded');
          addNewItemHighlight(newId);
      } else if (TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(type) && type !== 'chapter' && anchorCanReceiveEmbeddedBlock) {
          let parentLevelIndices: Indices = { chapterIndex: anchor.chapterIndex };
          if (anchor.sectionIndex !== undefined) parentLevelIndices.sectionIndex = anchor.sectionIndex;
          if (anchor.subsectionIndex !== undefined) parentLevelIndices.subsectionIndex = anchor.subsectionIndex;
          if (anchor.subsubsectionIndex !== undefined) parentLevelIndices.subsubsectionIndex = anchor.subsubsectionIndex;
          const insertAfterIndex = anchor.itemIndex;
          const newItem: EmbeddableTopLevelItem = { type: type as EmbeddableTopLevelType, title: data.title, _tempId: newId };
          setState(draft => addItem(draft, parentLevelIndices, newItem, insertAfterIndex), 'add-embedded-item');
          notificationMessage = t('editorNotice.blockInserted');
          addNewItemHighlight(newId);
      } else if (TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(type)) {
          const insertAfterIndex = anchor?.chapterIndex;
          const newItem: TopLevelItem = { type: type as TopLevelItem['type'], title: data.title, _tempId: newId };
          setState(draft => addTopLevelItem(draft, newItem, insertAfterIndex), 'add-top-level');
          notificationMessage = t('editorNotice.topLevelAdded');
          addNewItemHighlight(newId);
      } else if (type === 'section' && anchor) {
          const parentIndices = { chapterIndex: anchor.chapterIndex };
          const insertAfterIndex = anchor.sectionIndex;
          const newSection: Section = { name: data.name, items: [], _tempId: newId };
          setState(draft => addSection(draft, parentIndices, newSection, insertAfterIndex), 'add-section');
          notificationMessage = t('editorNotice.sectionAdded');
          addNewItemHighlight(newId);
      } else if (type === 'subsection' && anchor && anchor.sectionIndex !== undefined) {
          const parentIndices = { chapterIndex: anchor.chapterIndex, sectionIndex: anchor.sectionIndex };
          const insertAfterIndex = anchor.subsectionIndex;
          const newSubSection: SubSection = { name: data.name, items: [], _tempId: newId };
          setState(draft => addSubSection(draft, parentIndices, newSubSection, insertAfterIndex), 'add-subsection');
          notificationMessage = t('editorNotice.subsectionAdded');
          addNewItemHighlight(newId);
      } else if (type === 'subsubsection' && anchor && anchor.sectionIndex !== undefined && anchor.subsectionIndex !== undefined) {
          const parentIndices = { chapterIndex: anchor.chapterIndex, sectionIndex: anchor.sectionIndex, subsectionIndex: anchor.subsectionIndex };
          const insertAfterIndex = anchor.subsubsectionIndex;
          const newSubSubSection: SubSubSection = { name: data.name, items: [], _tempId: newId };
          setState(draft => addSubSubSection(draft, parentIndices, newSubSubSection, insertAfterIndex), 'add-subsubsection');
          notificationMessage = t('editorNotice.subsubsectionAdded');
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
          notificationMessage = t('editorNotice.itemAdded');
          addNewItemHighlight(newId);
      }

      if (notificationMessage) {
        showNotification(notificationMessage, "success");
        setEditorState(draft => { draft.saveStatus = 'unsaved'; });
      }
      setSelectionState(createSelectionState());
      handleModalClose();
  }, [selectedIndices, lessonsData, contentDirection, setState, showNotification, handleModalClose, addNewItemHighlight, setEditorState, t]);

  /*
   * Impression intelligente : la modale PrintModal montre ce qui a déjà été
   * imprimé (dates mémorisées par classe) et recommande le mode économique.
   */
  const printStats = useMemo(() => {
      const meta = readPrintMeta(classInfo.id);
      const allDates = collectSessionDates(lessonsData);
      const newDates = getNewDates(lessonsData, classInfo.id, meta);
      return {
          totalDates: allDates.length,
          allDates,
          // Évite une seconde lecture/parsing du même printMeta local.
          newDates,
          printedDates: allDates.filter(date => !newDates.includes(date)),
          lastPrintedAt: meta.lastPrintedAt,
          prefs: meta.prefs ?? null,
      };
  }, [classInfo.id, lessonsData, printMetaVersion]);

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
   * Ancien rappel conservé pour les comptes sans checklist de démarrage.
   * Le nouveau parcours guide les horaires depuis le dashboard : ouvrir le
   * premier cahier ou masquer sa checklist ne doit pas déclencher de modale.
   */
  const [showTimetableNudge, setShowTimetableNudge] = useState(false);
  const timetableNudgeKey = `timetableNudge_v1_${classInfo.id}`;
  useEffect(() => {
      if (isClassLoading || isConfigLoading) return;
      if (classHasTimetable || config.showGettingStarted !== undefined) { setShowTimetableNudge(false); return; }
      try { if (sessionStorage.getItem(timetableNudgeKey)) return; } catch { /* stockage indisponible */ }
      const timer = window.setTimeout(() => setShowTimetableNudge(true), 700);
      return () => window.clearTimeout(timer);
  }, [isClassLoading, isConfigLoading, classHasTimetable, config.showGettingStarted, timetableNudgeKey]);

  const dismissTimetableNudge = useCallback(() => {
      try { sessionStorage.setItem(timetableNudgeKey, '1'); } catch { /* stockage indisponible */ }
      setShowTimetableNudge(false);
  }, [timetableNudgeKey]);

  const fillTimetableFromNudge = useCallback(() => {
      dismissTimetableNudge();
      handleOpenTimetable();
  }, [dismissTimetableNudge, handleOpenTimetable]);

  const handleExecutePrint = useCallback((mode: PrintMode, options: PrintOptions, selectedDates?: string[]) => {
      if (isPrintingRef.current || !workspaceIsActive()) return;

      const classId = classInfo.id;
      if (isNotebookAwaitingContent) {
          showNotification(t('editorNotice.noPrintContent'), 'info');
          return;
      }
      const allDates = collectSessionDates(lessonsData);
      const newDates = getNewDates(lessonsData, classId);

      // sous-ensemble à imprimer selon le mode ; null = document complet
      let selection: LessonsData | null = null;
      let datesToRecord: string[] = allDates;
      if (mode === 'new') {
          if (newDates.length === 0) {
              showNotification(t('editorNotice.noNewSession'), 'info');
              return;
          }
          selection = createPrintSelection(lessonsData, newDates, config.contentNumbering?.enabled !== false);
          datesToRecord = newDates;
      } else if (mode === 'custom') {
          if (!selectedDates || selectedDates.length === 0) {
              showNotification(t('editorNotice.selectSession'), 'info');
              return;
          }
          // La modale peut être restée ouverte pendant une synchronisation ou
          // une suppression : ne jamais enregistrer une date disparue.
          const currentDates = new Set(allDates);
          const validSelectedDates = Array.from(new Set(selectedDates.filter(date => currentDates.has(date)))).sort();
          if (validSelectedDates.length === 0) {
              showNotification(t('editorNotice.selectionUnavailable'), 'info');
              return;
          }
          selection = createPrintSelection(lessonsData, validSelectedDates, config.contentNumbering?.enabled !== false);
          datesToRecord = validSelectedDates;
      }

      // Capture the content being printed, not edits received while the
      // system dialog or a remote printer is still processing the job.
      const currentSignatures = sessionPrintSignatures(lessonsData);
      const signatures = Object.fromEntries(datesToRecord.map(date => [date, currentSignatures[date]]));

      isPrintingRef.current = true;
      setIsPrinting(true);

      // mémorise les préférences de mise en page pour la prochaine impression
      savePrintPrefs(classId, {
      textSize: options.textSize,
      lineSpacing: options.lineSpacing,
      pageNumbers: options.pageNumbers,
      headerMode: options.headerMode,
      });

      // Commit the frozen document before preparing fonts and formula layout.
      flushSync(() => {
          setPrintSnapshot({ lessonsData: selection ?? lessonsData, classInfo, config, contentDirection, newlyAddedIds: [], ...options });
          setEditorState(draft => { draft.activeModal = null; });
      });

      const launchPrint = async () => {
          try {
              const root = document.querySelector<HTMLElement>('.print-document.print-only');
              if (!root) throw new Error('Print document missing');
              await preparePrintContent(root);
              if (!workspaceIsActive()) return;

              const outcome = await printDocument('cahier-de-textes');
              if (!workspaceIsActive()) return;
              if (outcome === 'cancelled') { setPrintSnapshot(null); return; }
              if (outcome === 'failed') {
                  setPrintSnapshot(null);
                  showNotification(t('editorNotice.printUnavailable'), 'error');
                  return;
              }

              if (outcome === 'confirmation-required') {
                  setPendingPrintConfirmation({ classId, signatures });
                  return;
              }
              const historySaved = recordPrint(classId, signatures);
              if (!historySaved) {
                  showNotification(t('editorNotice.printHistoryError'), 'warning');
              }
          } catch (error) {
              setPrintSnapshot(null);
              if (!workspaceIsActive()) return;
              logger.error('Échec inattendu du circuit d’impression.', error);
              showNotification(t('editorNotice.printPrepareError'), 'error');
          } finally {
              isPrintingRef.current = false;
              setIsPrinting(false);
              // Refresh preferences even when the preview was cancelled.
              setPrintMetaVersion(version => version + 1);
              // Keep the frozen surface for queued jobs awaiting confirmation.
          }
      };

      void launchPrint();
  }, [classInfo, config, contentDirection, lessonsData, isNotebookAwaitingContent, setEditorState, showNotification, t, workspaceIsActive]);


  /* Ouvrir l'editeur de contenu NE TOUCHE PAS la selection : un double-clic
   * sur un titre (ou « Modifier » dans la barre) ne doit pas effacer le
   * travail de selection en cours. La barre reparaît telle quelle a la
   * fermeture de la modale, et Échap reste le seul raccourci qui efface. */
  const handleOpenContentEditor = useCallback((indices: Indices) => {
    const targets = contentEditTargets.get(indicesKey(indices));
    if (!targets?.length) return;
    setEditorState(draft => {
      draft.editingIndices = targets[0];
      draft.activeModal = 'editContent';
    });
  }, [setEditorState, contentEditTargets]);


  const handleOpenDateModal = useCallback((indices: Indices) => {
    const targets = sessionTargets.get(indicesKey(indices));
    if (targets) openSession(targets);
  }, [sessionTargets, openSession]);



  const handleClearSelectedDates = useCallback(() => {
      if (selectedIndices.length === 0) return;
      setState(draft => {
          selectedIndices.forEach(idx => {
              const { item } = findItem(draft, idx);
              if (item && typeof (item as any).date === 'string') {
                  (item as any).date = '';
              }
          });
      }, 'clear-date');
      setSelectionState(createSelectionState());
      setEditorState(draft => {
        draft.saveStatus = 'unsaved';
      });
      showNotification(t('editorNotice.dateUnassigned'), "success");
  }, [selectedIndices, setState, setEditorState, showNotification, t]);



  const handleConfirmContentEdit = useCallback((indices: Indices, updatedData: ContentDraft) => {
      const targets = contentEditTargets.get(indicesKey(indices));
      if (!targets?.length) return;
      const normalizedType = updatedData.type ? (TYPE_MAP[updatedData.type.toLowerCase()] || updatedData.type) : undefined;
      const finalItem = { ...updatedData };
      if (normalizedType) {
          finalItem.type = normalizedType;
      }

      setState(draft => {
          applyContentEdit(draft, targets, finalItem);
      }, targets.length > 1 ? 'edit-merged-content' : 'edit-content-item');
      showNotification(t('editorNotice.contentUpdated'), "success");
      setEditorState(draft => {
        draft.saveStatus = 'unsaved';
        draft.editingIndices = null;
        draft.activeModal = null;
      });
  }, [setState, showNotification, setEditorState, contentEditTargets, t]);

  const handleImport = useCallback(async (data: unknown, mode: 'replace' | 'append'): Promise<boolean> => {
      if (!workspaceIsActive()) return false;
      try {
        const { lessonsData: preparedLessons, report, direction } = prepareImportedLessons(data);
        if (preparedLessons.length === 0) {
          showNotification(t('editorNotice.importNoLessons'), "error");
          return false;
        }

        // Ajouter à un cahier déjà structuré ne doit pas inverser brusquement
        // toutes ses colonnes. Un import de remplacement (ou le premier import)
        // adopte immédiatement l'écriture détectée à partir du titre.
        const shouldAdoptImportedDirection = mode === 'replace' || isNotebookAwaitingContent;
        const nextDirection = shouldAdoptImportedDirection ? direction.direction : contentDirectionRef.current;
        const combined = mode === 'replace' ? preparedLessons : [...lessonsDataRef.current, ...preparedLessons];
        const nextLessons = withStarterDiagnostic(combined, contentLocaleFromDirection(nextDirection));
        // Persist before closing the import dialog or announcing success. On failure,
        // keep both the existing editor and the dialog available for recovery.
        try {
          saveNotebook(classInfo.id, nextLessons, nextDirection);
        } catch (error) {
          logger.error('Failed to store imported notebook', error);
          showNotification(t('editorNotice.saveError'), 'error');
          return false;
        }
        lessonsDataRef.current = nextLessons;
        contentDirectionRef.current = nextDirection;
        saveStatusRef.current = 'saved';
        setSelectionState(createSelectionState());
        setState(() => nextLessons, 'import-data');
        setEditorState(draft => {
          draft.contentDirection = nextDirection;
          draft.saveStatus = 'saved';
        });
        void syncNow();
        handleModalClose();
        const directionNotice = shouldAdoptImportedDirection
          ? t('editorNotice.importDirection', { direction: direction.direction.toUpperCase() })
          : '';
        showNotification(t('editorNotice.importSummary', {
          blocks: report.topLevelCount,
          items: report.itemCount,
          dates: report.normalizedDates,
          direction: directionNotice,
        }), "success");
        return true;
      } catch (error) {
        logger.error('Failed to prepare imported JSON', error);
        showNotification(t('editorNotice.importInvalidStructure'), "error");
        return false;
      }
  }, [setState, showNotification, handleModalClose, setEditorState, isNotebookAwaitingContent, t, workspaceIsActive, classInfo.id, syncNow]);

  const handleUpdateLessons = useCallback((newLessons: LessonsData) => {
      setSelectionState(createSelectionState());
      setState(() => newLessons.length > 0
        ? withStarterDiagnostic(newLessons, contentLocaleFromDirection(contentDirection))
        : newLessons, 'manage-lessons');
      handleModalClose();
      showNotification(t('editorNotice.lessonsUpdated'), 'success');
      setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [setState, showNotification, handleModalClose, setEditorState, t, contentDirection]);

  const addAfterTarget = useMemo(
    () => resolveAddAfterTarget(allRows, expandContentSelection(contentEditTargets, selectionState.keys)),
    [allRows, contentEditTargets, selectionState.keys],
  );

  const editingItem = useMemo(() => {
    if (!editingIndices) return null;
    try {
      const { item } = findItem(lessonsData, editingIndices);
      return item as LessonItem | TopLevelItem | Section | SubSection | SubSubSection | null;
    } catch {
      return null;
    }
  }, [editingIndices, lessonsData]);

  const editingTitleField: 'title' | 'name' = editingItem && 'name' in editingItem ? 'name' : 'title';
  const editingTitleOnly = Boolean(editingItem && (
    'name' in editingItem
    || ('type' in editingItem && String(editingItem.type) in TOP_LEVEL_TYPE_CONFIG)
  ));

  const selectedItemsData = useSelectionData(selectedIndices, lessonsData);

  const selectedDates = selectedItemsData.map(item => item.date).filter(Boolean);
  const hasSelectedDate = selectedDates.length > 0;
  const canAddAfterSelection = addAfterTarget !== null;
  const canAssignDateSelection = selectedCount > 0 && selectedItemsData.every(item => item.canDate);
  const editSelectionTargets = useMemo(
    () => resolveContentEditSelection(contentEditTargets, selectionState.keys),
    [contentEditTargets, selectionState.keys],
  );
  const canEditSelection = editSelectionTargets !== null;


  // « Dater aujourd'hui » : un tap, réutilise le circuit handleAssignDates
  // (donc aussi la garde intelligente sur la date du jour).
  const handleAssignToday = useCallback(() => {
      assignSessionDate(selectedIndices, todayInMorocco());
  }, [assignSessionDate, selectedIndices]);

  // Offset sticky dynamique : l'en-tête de colonnes du tableau se cale juste
  // sous la barre d'outils collante (top-2 = 8 px). La hauteur de la barre
  // varie (retour à la ligne sur mobile, ouverture de la recherche), un
  // ResizeObserver republie la variable CSS --cdt-sticky-top en temps réel.
  const isLoading = isClassLoading || isConfigLoading;
  const isInitialMathPreparing = notebookHasMath && !initialMathTypesetComplete;

  if (isLoading) {
    return <EditorSkeleton />;
  }

  return (
    <div className="relative w-full pb-8 safe-bottom print:bg-card print:p-0" data-editor-root data-pwa-update-blocked={editorState.saveStatus !== 'saved'}>
      <div className="max-w-screen-2xl mx-auto flex min-h-dvh w-full flex-col px-3 sm:px-5 lg:px-8 print:mx-0 print:w-full print:max-w-none print:min-h-0 print:bg-card print:p-0 print:shadow-none">
        <div className="print-hidden flex flex-col flex-1">
          <Header
            classInfo={classInfo}
            establishmentName={config.establishmentName}
            onClassInfoChange={handleClassInfoChange}
            onBack={onBack}
          />
          {/* Barre d'outils COLLANTE : masquée tant que le cahier est vide
              en attente du choix de démarrage (importer le programme ou créer un chapitre).
              Elle s'affiche dès que du contenu est créé ou importé. */}
          {!isNotebookAwaitingContent && (
            <Toolbar
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              onSave={saveData}
              saveStatus={saveStatus}
              onOpenDataTransfer={() => setEditorState(draft => { draft.activeModal = 'dataTransfer'; })}
              onOpenManageLessons={() => setEditorState(draft => { draft.activeModal = 'manageLessons'; })}
              onOpenGuide={() => setEditorState(draft => { draft.activeModal = 'guide'; })}
              onOpenAnalyse={() => setEditorState(draft => { draft.activeModal = 'analyse'; })}
              onOpenEvaluations={() => setEditorState(draft => { draft.activeModal = 'evaluations'; })}
              onPrint={handleSmartPrint}
              searchQuery={searchQuery}
              setSearchQuery={value => setEditorState(draft => { draft.searchQuery = value; })}
            />
          )}
          {/* Bloc tableau aligne sur le padding interieur de la carte parente. */}
          <main className="flex-1 pb-24 sm:pb-20 print:mx-0" onClick={handleDeselectAll}>
            <MainTable
              lessonsData={lessonsData}
              visibleRows={visibleRows}
              onClearSearch={handleClearSearch}
              contentDirection={contentDirection}
              onOpenAddContentModal={handleOpenAddContentModal}
              showDescriptions={config.screenDescriptionMode === 'all' ? true : config.screenDescriptionMode === 'none' ? false : undefined}
              descriptionTypes={config.screenDescriptionTypes}
              selectedKeys={selectionState.keys}
              onToggleSelect={handleToggleSelectRow}
              onToggleSelectGroup={handleToggleSelectGroup}
              onOpenContentEditor={handleOpenContentEditor}
              onOpenDateModal={handleOpenDateModal}
              onOpenRemark={handleOpenRemark}
              newlyAddedIds={newlyAddedIds}
              editingKey={editingIndices ? indicesKey(editingIndices) : undefined}
              getDateWarnings={getDisplayDateWarnings}
              getDateOrder={getDateOrder}
              getContentNumber={getContentNumber}
              searchQuery={displayedQuery}
              focusKey={sessionFocusKey}
              predefinedProgramTitle={predefinedOffer?.titre}
              onLoadPredefined={predefinedOffer ? handleLoadPredefined : undefined}
            />
          </main>
        </div>

        {printSnapshot && <PrintView {...printSnapshot} />}
      </div>


      {!activeModal && !sessionAssignment.review && (
        <SelectionBar
          count={selectedCount}
          hasDate={hasSelectedDate}
          canAdd={canAddAfterSelection}
          canAssignDate={canAssignDateSelection}
          onAdd={() => { if (addAfterTarget) handleOpenAddContentModal(addAfterTarget); }}
          onAssignDate={() => openSession(selectedIndices)}
          onAssignToday={handleAssignToday}
          onClearDate={handleClearSelectedDates}
          onEdit={() => { if (editSelectionTargets?.length) handleOpenContentEditor(editSelectionTargets[0]); }}
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
        classId={classInfo.id}
        isOpen={activeModal === 'print'}
        onClose={handleModalClose}
        totalDates={printStats.totalDates}
        newDates={printStats.newDates}
        allDates={printStats.allDates}
        printedDates={printStats.printedDates}
        lastPrintedAt={printStats.lastPrintedAt}
        savedPrefs={printStats.prefs}
        isPrinting={isPrinting}
        config={config}
        onConfigChange={updateConfig}
        onPrint={handleExecutePrint}
      />
      <EditorModals
        activeModal={activeModal}
        handleModalClose={handleModalClose}
        handleImport={handleImport}
        handleExportData={handleExportData}
        lessonsData={lessonsData}
        handleUpdateLessons={handleUpdateLessons}
        config={config}
        onConfigChange={updateConfig}
        sessionEditor={sessionAssignment.editor}
        onApplySession={sessionAssignment.apply}
        handleConfirmAddContent={handleConfirmAddContent}
        selectedIndices={selectedIndices}
        getDateWarnings={getDateWarnings}
        getDisplayDateWarnings={getDisplayDateWarnings}
        classInfo={classInfo}
        contentDirection={contentDirection}
        editingItem={editingItem}
        editingTitleOnly={editingTitleOnly}
        editingTitleField={editingTitleField}
        editingCount={editingIndices ? contentEditTargets.get(indicesKey(editingIndices))?.length ?? 1 : 1}
        handleConfirmContentEdit={value => {
          if (editingIndices) handleConfirmContentEdit(editingIndices, value);
        }}
      />

      <DateReviewModal
        isOpen={sessionAssignment.review !== null}
        date={sessionAssignment.review?.date ?? ''}
        warnings={sessionAssignment.review?.warnings ?? []}
        onModify={() => {
          sessionAssignment.modify();
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => document.getElementById('assign-date-input')?.focus());
          });
        }}
        onConfirm={sessionAssignment.confirm}
        onIgnore={() => {
          const pending = sessionAssignment.review;
          if (!pending) return;
          ignoreDateException(pending.date, pending.warnings);
          sessionAssignment.confirm();
          toast.info(t('editorNotice.exceptionKept'));
        }}
      />

      <TimetableNudgeModal
        isOpen={showTimetableNudge}
        onSkip={dismissTimetableNudge}
        onFill={fillTimetableFromNudge}
        className={classInfo.name}
      />

      <ConfirmDialog
        open={pendingPrintConfirmation !== null}
        onOpenChange={open => { if (!open) setPendingPrintConfirmation(null); }}
        title={t('print.confirmTitle')}
        description={t('print.confirmDescription')}
        confirmLabel={t('print.confirmDone')}
        cancelLabel={t('print.confirmNotDone')}
        variant="default"
        onConfirm={() => {
          if (!pendingPrintConfirmation || !workspaceIsActive()) return;
          if (!recordPrint(pendingPrintConfirmation.classId, pendingPrintConfirmation.signatures)) {
            showNotification(t('editorNotice.printHistoryError'), 'warning');
          }
          setPrintMetaVersion(version => version + 1);
        }}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={t(selectedIndices.length === 1 ? 'bulkDelete.titleOne' : 'bulkDelete.titleMany', { count: selectedIndices.length })}
        description={t('bulkDelete.description')}
        confirmLabel={t('selection.delete')}
        onConfirm={executeBulkDelete}
      />

      {isInitialMathPreparing && <AppBootSkeleton stage="latex" overlay />}
    </div>
  );
};
