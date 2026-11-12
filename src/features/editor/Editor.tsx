import { assignHomeworkPatch, restoreSessionRemarkSettings, sessionRemarkSettingsPatch } from '@/domain/evaluations/sessionRemarkChanges';
import { dequal } from 'dequal';
import { uniq } from 'es-toolkit';
import { homeworkMoments } from '@/domain/evaluations/homeworkCycle';
import { updateClassMetadata } from '@/domain/classes/classMetadata';
import type { AppConfig } from '@/types';
import { buildAbsenceSessions, groupRowsWithAbsences } from '@/domain/notebook/absenceSessions';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useSelectionEngine, createSelectionState } from './hooks/useSelectionEngine';
import { useBulkOperations } from './hooks/useBulkOperations';
import { useSessionAssignment } from './hooks/useSessionAssignment';
import { useImmer } from 'use-immer';
import { readInitialNotebook, notebookStorageKey } from './initialNotebook';
import { storedNotebookChanged } from './notebookRefresh';
import { toast } from 'sonner';
import { Header } from './Header';
import { EditorOverlays } from './EditorOverlays';
import { Toolbar } from './Toolbar';
import { MainTable } from './MainTable';
import { AppBootSkeleton, EditorSkeleton } from '@/components/ui/PageSkeleton';
import { preloadEditorFonts } from './editorFontLoading';
import { useHistoryState } from '@/features/editor/hooks/useHistoryState';
import { useConfigManager } from '@/hooks/useConfigManager';
import { indicesKey, resolveAddAfterTarget } from '@/domain/notebook/lessonRows';
import { useNotebookOpeningFocus } from './hooks/useNotebookOpeningFocus';
import { buildContentDateOrder } from '@/domain/calendar/dateOrder';
import { buildContentNumbers } from '@/domain/notebook/contentNumbering';
import { useLessonSearch } from '@/features/editor/hooks/useLessonSearch';
import { applyContentEdit, buildContentEditTargetsGrouped, buildSessionTargetsGrouped, expandContentSelection, resolveContentEditSelection } from '@/domain/notebook/contentEditing';
import type { ContentDraft } from '@/domain/notebook/contentDraft';
import { useMoroccoToday } from '@/hooks/useMoroccoToday';
import { useSelectionData } from '@/features/editor/hooks/useSelectionData';
import { findItem, addTopLevelItem, insertAssessmentBlock, addSection, addSubSection, addSubSubSection, addItem, migrateLessonsData } from '@/domain/notebook/dataUtils';
import { prepareImportedLessons } from '@/domain/notebook/importPipeline';
import { listExportableChapters, selectExportableChapters } from '@/domain/notebook/chapterExport';
import { MAX_JSON_FILE_BYTES } from '@/domain/notebook/jsonInput';
import { contentLocaleFromDirection, defaultContentDirection, detectContentDirection, readStoredContentDirection } from '@/domain/notebook/contentDirection';
import { sessionRemarkTextMap, buildSessionRemarkEntries, remarksForSessionDates } from '@/domain/evaluations/sessionActivityRemarks';
import { documentsForSessionDates } from '@/domain/evaluations/activityDocumentPreviews';
import { sessionDateKey } from '@/domain/evaluations/homeworkPlacement';
import { extractHomeworkNumber, getChronologicalHomeworkNumber } from '@/domain/evaluations/homeworkNumbering';
import { useClassAssessments } from '@/hooks/useAssessments';
import { produce, type Draft } from 'immer';
import { applySessionEdit } from '@/domain/notebook/sessionEditing';
import { evaluationSlots, newEvaluationWarnings } from '@/domain/evaluations/evaluationConflicts';
import { syncNotebookToEvaluations, formatPedagogicalDateCell } from '@/domain/evaluations/notebookSyncBridge';
import { materializeContentAssessments } from '@/domain/evaluations/homeworkCorrectionContent';
import { resolveClassSessionDatesInRange } from '@/domain/notebook/classSessionDates';
import type { NotebookDocumentPreview } from '@/domain/evaluations/assessmentSync';
import { useNotebookDocumentPreviews } from './hooks/useNotebookDocumentPreviews';
import { dateTimeFormat } from '@/lib/formatters';
import { commitClassMutation, markClassDirty, markClassesListDirty, notifyClassesChanged, subscribe, touchClassSyncMeta } from '@/infrastructure/sync/syncBus';
import { collectSessionDates, createPrintSelection, getNewDates, readPrintMeta, recordPrint, savePrintPrefs, sessionPrintSignatures, type PrintPrefs } from '@/infrastructure/printing/printMeta';
import { toDisplayWarnings, createSessionDateValidator } from '@/domain/calendar/dateValidation';
import { PredefinedEntry, findPredefinedFor, loadPredefinedContent } from '@/domain/curriculum/predefinedContent';
import { PrintMode, PrintOptions } from './modals/PrintModal';
import { printDocument, preparePrintContent } from '@/infrastructure/printing/printUtils';
import { LessonsData, Indices, TopLevelItem, LessonItem, Section, SubSection, SubSubSection, ClassInfo, ContentDirection } from '@/types';
import { PrintView } from './PrintView';
import { EditorSyncFab } from './EditorSyncFab';
import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP, formatLocalizedClassDisplayName, normalizeOfficialClassName } from '@/constants';
import { insertFreeContent } from '@/domain/notebook/freeContent';
import { logger } from '@/lib/logger';
import { todayInMorocco } from '@/domain/calendar/calendar';
import { hasOnlyPristineStarterDiagnostic, withStarterDiagnostic, withoutPristineStarterDiagnostic } from '@/domain/notebook/starterDiagnostic';
import { useLocale } from '@/i18n/LocaleProvider';
import { captureWorkspaceLease, registerWorkspaceWriter } from '@/infrastructure/storage/accountWorkspace';
import { hasMathContent } from '@/lib/text/math';
import { useSync } from '@/contexts/SyncContext';
import { saveNotebook } from '@/infrastructure/storage/saveNotebook';
import { recordNotebookOrigin } from '@/infrastructure/storage/notebookOrigin';
import { rememberNotebookActivity } from '@/infrastructure/storage/companionActivity';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

const DOCUMENT_UPDATED_FORMAT: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
};

const EMPTY_PRINT_STATS = {
    totalDates: 0,
    allDates: [] as string[],
    newDates: [] as string[],
    printedDates: [] as string[],
    lastPrintedAt: null as string | null,
    prefs: null as PrintPrefs | null,
};

export interface EditorProps {
    classInfo: ClassInfo;
    /** ouvre la page Paramètres (utilisé pour renseigner l'emploi du temps) */
    onOpenSettings?: () => void;
    onOpenGuide?: () => void;
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

export const Editor: React.FC<EditorProps> = ({ classInfo: initialClassInfo, onOpenSettings, onOpenGuide, onBack }) => {
  const [workspaceIsActive] = useState(() => captureWorkspaceLease());
  const { t, locale } = useLocale();
  const { syncNow } = useSync();
  const [initialNotebook] = useState(() => readInitialNotebook({ classId: initialClassInfo.id, locale }));
  const initialNotebookRef = useRef<{ classId: string } | null>(initialNotebook ? { classId: initialClassInfo.id } : null);
  const { state: lessonsData, setState, resetState, undo, redo, canUndo, canRedo, operationType, historyAction } = useHistoryState<LessonsData>(initialNotebook?.lessons ?? []);
  const historyContext = useRef({ operationType, historyAction });
  historyContext.current = { operationType, historyAction };
  const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
  const [editorFontsReady, setEditorFontsReady] = useState(false);

  useEffect(() => {
    let active = true;
    let ceiling = 0;
    const timeout = new Promise<void>(resolve => { ceiling = window.setTimeout(resolve, 1500); });
    void Promise.race([preloadEditorFonts(), timeout])
      .catch((error: unknown) => {
        logger.error('Failed to load notebook fonts; using browser fallbacks.', error);
        if (active) toast.error(t('editorNotice.fontLoadFallback'));
      })
      .finally(() => {
        window.clearTimeout(ceiling);
        if (active) setEditorFontsReady(true);
      });
    return () => { active = false; window.clearTimeout(ceiling); };
  }, [t]);

  const [editorState, setEditorState] = useImmer({
    classInfo: initialClassInfo,
    isClassLoading: !initialNotebook,
    saveStatus: 'saved' as 'saved' | 'saving' | 'unsaved',
    activeModal: null as ActiveModal,
    editingIndices: null as Indices | null,
    searchQuery: '',
    contentDirection: (initialNotebook?.direction ?? defaultContentDirection(locale)) as ContentDirection,
    newlyAddedIds: [] as string[],
  });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editingIndicesRef = useRef<Indices | null>(null);
  const [sessionFocusKey, setSessionFocusKey] = useState<string | null>(null);
  const placementTimerRef = useRef<number | null>(null);
  const [printMetaVersion, setPrintMetaVersion] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [initialMathTypesetComplete, setInitialMathTypesetComplete] = useState(false);
  const isPrintingRef = useRef(false);
  const [printSnapshot, setPrintSnapshot] = useState<React.ComponentProps<typeof PrintView> | null>(null);
  const [pendingPrintConfirmation, setPendingPrintConfirmation] = useState<{ classId: string; signatures: Record<string, string> } | null>(null);
  useEffect(() => { setPrintSnapshot(null); setPendingPrintConfirmation(null); }, [initialClassInfo.id]);
  const lessonsDataRef = useRef<LessonsData>(lessonsData);
  const evaluationsBaseline = useRef(lessonsData);
  const eventArchive = useRef(new Map<string, import('@/types').PedagogicalEvent>());
  const { assessments: syncAssessments } = useClassAssessments(initialClassInfo, config);
  const evaluationContext = useRef({ config, assessments: syncAssessments });
  evaluationContext.current = { config, assessments: syncAssessments };

  const contentDateOrder = useMemo(() => buildContentDateOrder(lessonsData), [lessonsData]);
  const contentDateOrderRef = useRef(contentDateOrder);
  contentDateOrderRef.current = contentDateOrder;
  const getDateOrder = useCallback(
    (indices: Indices) => contentDateOrderRef.current.get(indicesKey(indices)),
    [],
  );

  const contentNumbers = useMemo(
    () => buildContentNumbers(lessonsData, config.contentNumbering ?? true),
    [lessonsData, config.contentNumbering],
  );
  const contentNumbersRef = useRef(contentNumbers);
  contentNumbersRef.current = contentNumbers;
  const getContentNumber = useCallback(
    (indices: Indices) => contentNumbersRef.current.get(indicesKey(indices)),
    [],
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
  lessonsDataRef.current = lessonsData;
  contentDirectionRef.current = contentDirection;
  saveStatusRef.current = saveStatus;
  const isNotebookAwaitingContent = useMemo(
    () => lessonsData.length === 0 || hasOnlyPristineStarterDiagnostic(lessonsData),
    [lessonsData],
  );
  const notebookHasMath = useMemo(
    () => (initialMathTypesetComplete ? false : hasMathContent(lessonsData)),
    [initialMathTypesetComplete, lessonsData],
  );

  const sessionRemarkEntries = useMemo(() => buildSessionRemarkEntries(config, classInfo.id, t, locale === 'ar' ? '، ' : ', ', lessonsData), [config, classInfo.id, t, locale, lessonsData]);
  const sessionAnnotationTexts = useMemo(() => sessionRemarkTextMap(sessionRemarkEntries), [sessionRemarkEntries]);
  const sessionAnnotationTextsRef = useRef(sessionAnnotationTexts);
  sessionAnnotationTextsRef.current = sessionAnnotationTexts;
  const getSessionAnnotation = useCallback(
    (date?: string) => remarksForSessionDates(sessionAnnotationTextsRef.current, date),
    [],
  );
  const sessionRemarkEntriesRef = useRef(sessionRemarkEntries);
  sessionRemarkEntriesRef.current = sessionRemarkEntries;
  const getSessionRemarkEntries = useCallback(
    (date?: string) => sessionRemarkEntriesRef.current.get(sessionDateKey(date)) ?? [],
    [],
  );

  const documentPreviews = useNotebookDocumentPreviews(classInfo, config, lessonsData);
  const documentPreviewsRef = useRef(documentPreviews);
  documentPreviewsRef.current = documentPreviews;
  const [openDocument, setOpenDocument] = useState<NotebookDocumentPreview | null>(null);
  const getDocumentPreview = useCallback(
    (rowKey: string) => documentPreviewsRef.current.rows.get(rowKey),
    [],
  );
  const getSessionDocuments = useCallback(
    (date: string) => documentsForSessionDates(documentPreviewsRef.current.sessions, date),
    [],
  );
  const handleOpenDocumentPreview = useCallback(
    (preview: NotebookDocumentPreview) => setOpenDocument(preview),
    [],
  );
  const closeDocumentPreview = useCallback(() => setOpenDocument(null), []);
  const documentUpdatedLabel = useMemo(() => {
    const updatedAt = openDocument?.document.updatedAt;
    if (!updatedAt) return undefined;
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return undefined;
    return t('documentPreview.updated', { date: dateTimeFormat(locale, DOCUMENT_UPDATED_FORMAT).format(date) });
  }, [openDocument, locale, t]);

  useEffect(() => {
    if (initialMathTypesetComplete || isClassLoading || isConfigLoading) return;
    if (!notebookHasMath) {
      setInitialMathTypesetComplete(true);
      return;
    }
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
          recordNotebookOrigin(classInfo.id, 'predefined', workspaceIsActive);
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
  }, [predefinedOffer, setState, setEditorState, t, workspaceIsActive, classInfo.id]);

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
  const absenceSessions = useMemo(() => buildAbsenceSessions(config, classInfo.id, lessonsData),
    [config.absences, config.timetable, config.timetableClock, classInfo.id, lessonsData]);
  const groupedRows = useMemo(() => groupRowsWithAbsences(allRows, absenceSessions).renderRows, [allRows, absenceSessions]);
  const contentEditTargets = useMemo(() => buildContentEditTargetsGrouped(groupedRows), [groupedRows]);
  const contentEditTargetsRef = useRef(contentEditTargets);
  contentEditTargetsRef.current = contentEditTargets;
  const sessionTargets = useMemo(() => buildSessionTargetsGrouped(groupedRows), [groupedRows]);
  const sessionTargetsRef = useRef(sessionTargets);
  sessionTargetsRef.current = sessionTargets;

  const {
    selectionState,
    selectedIndices,
    selectedCount,
    handleDropRow,
    canDropRow,
    handleToggleSelectRow,
    handleToggleSelectGroup,
    handleDeselectAll,
    setSelectionState
  } = useSelectionEngine({
    lessonsData,
    moveTargets: contentEditTargets,
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

  const getDateWarnings = useMemo(
    () => createSessionDateValidator(classInfo, config, locale),
    [classInfo.id, classInfo.name, classInfo.cycle, classInfo.subject, config.schedules, config.absences, config.schoolYearStart, locale]
  );

  const today = useMoroccoToday();
  const getDisplayDateWarnings = useCallback(
    (date: string) => toDisplayWarnings(getDateWarnings(date), date, today),
    [getDateWarnings, today]
  );

  const recordSessionSettings = useCallback((patch: Partial<AppConfig>) => {
    const before = Object.fromEntries(Object.keys(patch).map(key => [key, config[key as keyof AppConfig]])) as Partial<AppConfig>;
    if (dequal(before, patch)) return undefined;
    updateConfig(patch);
    const restore = (from: Partial<AppConfig>, to: Partial<AppConfig>) => {
      if (!workspaceIsActive()) return;
      const restored = restoreSessionRemarkSettings(evaluationContext.current.config, classInfo.id, from, to);
      if (Object.keys(restored).length) updateConfig(restored);
    };
    return { undo: () => restore(patch, before), redo: () => restore(before, patch) };
  }, [config, classInfo.id, updateConfig, workspaceIsActive]);

  const sessionAssignment = useSessionAssignment({
    lessonsData, locale, setState, getDateWarnings, revision: config, isActive: workspaceIsActive,
    getSelectionWarnings: (source, targets, patch) => {
      const events = config.pedagogicalEvents?.[classInfo.id] ?? [];
      const next = produce(source, draft => { applySessionEdit(draft, targets, patch); });
      return newEvaluationWarnings(evaluationSlots(source, syncAssessments, events), evaluationSlots(next, syncAssessments, events), locale);
    },
    onOpen: () => setEditorState(draft => { draft.activeModal = 'assignDate'; }),
    onClose: () => setEditorState(draft => { draft.activeModal = null; }),
    onSaved: () => {
      setSelectionState(createSelectionState());
      setEditorState(draft => { draft.saveStatus = 'unsaved'; });
    },
    onStale: () => showNotification(t('editorNotice.selectionUnavailable'), 'info'),
    onActivityRemarks: (patch, session) => {
      const result = sessionRemarkSettingsPatch(config, classInfo.id, session.source, session.selection.targets, patch, sessionRemarkEntries);
      return recordSessionSettings(result);
    },
    onAbsenceRemark: (date: string, remark: string) => {
      const classId = classInfo.id;
      const currentClassRemarks = { ...(config.absenceRemarks?.[classId] ?? {}) };
      if (remark.trim()) {
        currentClassRemarks[date] = remark.trim();
      } else {
        delete currentClassRemarks[date];
      }
      updateConfig({
        absenceRemarks: {
          ...(config.absenceRemarks ?? {}),
          [classId]: currentClassRemarks,
        },
      });
      showNotification(t('remark.savedNotification') || 'Remarque enregistrée', 'success');
    },
  });
  const { open: openSession, openAbsenceRemark, assignDate: assignSessionDate, cancel: cancelSession } = sessionAssignment;
  const openSessionRef = useRef(openSession);
  openSessionRef.current = openSession;

  const handleOpenRemark = useCallback((indices: Indices) => {
    const targets = sessionTargetsRef.current.get(indicesKey(indices)) ?? [indices];
    openSessionRef.current(targets, 'remark');
  }, []);

  const handleOpenAbsenceRemark = useCallback((date: string) => {
    const currentRemark = config.absenceRemarks?.[classInfo.id]?.[date] ?? '';
    openAbsenceRemark(date, currentRemark);
  }, [config.absenceRemarks, classInfo.id, openAbsenceRemark]);

  const getAbsenceRemark = useCallback((date: string) => {
    return config.absenceRemarks?.[classInfo.id]?.[date];
  }, [config.absenceRemarks, classInfo.id]);

  const addNewItemHighlight = useCallback((id: string) => {
    setEditorState(draft => { draft.newlyAddedIds.push(id); });
    setTimeout(() => {
        setEditorState(draft => { draft.newlyAddedIds = draft.newlyAddedIds.filter(i => i !== id); });
    }, 2500);
  }, [setEditorState]);

  const loadData = useCallback(() => {
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
      const fallback = defaultContentDirection(locale);
      const storedDirection = readStoredContentDirection(savedData);
      const detectedDirection = detectContentDirection(lessons, fallback).direction;
      const nextDirection = storedDirection ?? detectedDirection;
      const normalizedLessons = materializeContentAssessments(migratedLessons, evaluationContext.current.config, classInfo.id, locale);
      resetState(normalizedLessons, 'initial-load');
      evaluationsBaseline.current = normalizedLessons;
      setEditorState(draft => { draft.contentDirection = nextDirection; });

      if (normalizedLessons.length > 0 && workspaceIsActive()) {
        const latest = evaluationContext.current;
        (latest.config.pedagogicalEvents?.[classInfo.id] ?? []).forEach(event => eventArchive.current.set(event.id, event));
        const { patch, updated } = syncNotebookToEvaluations(classInfo.id, latest.config, normalizedLessons, {
          planned: latest.assessments,
          eventArchive: eventArchive.current,
          policy: latest.config.evaluationPolicy,
        });
        if (updated) updateConfig(patch);
      }

      if (normalizedLessons !== migratedLessons && workspaceIsActive()) {
        localStorage.setItem(getStorageKey(), JSON.stringify({
          lessonsData: normalizedLessons,
          contentDirection: nextDirection,
        }));
        commitClassMutation(classInfo.id);
      }
    } catch (error) {
      logger.error("Failed to load data from localStorage", error);
      showNotification(t('editorNotice.loadError'), "error");
    } finally {
      setEditorState(draft => { draft.isClassLoading = false; });
    }
  }, [resetState, getStorageKey, showNotification, setEditorState, t, locale, workspaceIsActive, classInfo.id, updateConfig]);

  const isSelfPersistingRef = useRef(false);
  const persistCurrentData = useCallback((withVisualStatus: boolean): boolean => {
    if (!workspaceIsActive()) return false;
    if (saveStatusRef.current === 'saved') return true;
    if (withVisualStatus) setEditorState(draft => { draft.saveStatus = 'saving'; });
    try {
      isSelfPersistingRef.current = true;
      try {
        saveNotebook(classInfo.id, lessonsDataRef.current, contentDirectionRef.current);
      } finally {
        queueMicrotask(() => {
          isSelfPersistingRef.current = false;
        });
      }
      rememberNotebookActivity(classInfo.id, historyContext.current.operationType, historyContext.current.historyAction);
      saveStatusRef.current = 'saved';
      if (withVisualStatus) {
        setEditorState(draft => { draft.saveStatus = 'saved'; });
      }

      const capturedLessons = lessonsDataRef.current;
      const capturedConfig = evaluationContext.current;
      const scheduleIdle = typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? window.requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 100);

      scheduleIdle(() => {
        if (lessonsDataRef.current !== capturedLessons || !workspaceIsActive()) return;
        (capturedConfig.config.pedagogicalEvents?.[classInfo.id] ?? []).forEach(event => eventArchive.current.set(event.id, event));
        const { patch, updated } = syncNotebookToEvaluations(classInfo.id, capturedConfig.config, capturedLessons, {
          previousLessons: evaluationsBaseline.current,
          planned: capturedConfig.assessments,
          eventArchive: eventArchive.current,
          policy: capturedConfig.config.evaluationPolicy,
        });
        if (updated) {
          updateConfig(patch);
        }
        evaluationsBaseline.current = capturedLessons;
      });

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
  }, [classInfo.id, showNotification, setEditorState, t, workspaceIsActive, updateConfig]);

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

  const exportChapters = useMemo(
    () => (activeModal === 'dataTransfer' ? listExportableChapters(lessonsData) : []),
    [activeModal, lessonsData],
  );

  const handleExportData = useCallback((chapters: number[] | null) => {
    if (!workspaceIsActive()) return;
    try {
        const selected = chapters === null ? lessonsData : selectExportableChapters(lessonsData, chapters);
        if (Array.isArray(selected) && selected.length === 0) {
          showNotification(t('editorNotice.exportEmpty'), 'error');
          return;
        }
        const dataToExport = { classInfo, lessonsData: selected, contentDirection };
        const jsonString = JSON.stringify(dataToExport, null, 2);
        if (new TextEncoder().encode(jsonString).byteLength > MAX_JSON_FILE_BYTES) {
          showNotification(t('editorNotice.exportTooLarge'), 'error');
          return;
        }
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const scopeSuffix = chapters === null ? '' : `-${chapters.length}blocs`;
        a.download = `cahier-de-textes-${classInfo.name}${scopeSuffix}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
        Object.assign(draft.classInfo, updateClassMetadata(draft.classInfo as ClassInfo, normalizedInfo));
        try {
            const allClasses: ClassInfo[] = JSON.parse(localStorage.getItem('classManager_v1') || '[]');
            const updatedClasses = allClasses.map(c =>
                c.id === draft.classInfo.id ? updateClassMetadata(c, normalizedInfo) : c
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

  const reloadStoredNotebook = useCallback(() => {
    if (isSelfPersistingRef.current || !workspaceIsActive() || saveStatusRef.current !== 'saved') return;
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (!storedNotebookChanged(raw, { lessons: lessonsDataRef.current, direction: contentDirectionRef.current })) return;
      loadData();
      setSelectionState(createSelectionState());
      setEditorState(draft => {
        draft.editingIndices = null;
        if (draft.activeModal === 'editContent') draft.activeModal = null;
      });
    } catch (error) { logger.error('Failed to refresh the notebook from storage', error); }
  }, [getStorageKey, loadData, setEditorState, workspaceIsActive, setSelectionState]);

  useEffect(() => {
    const unsubscribers = [
      subscribe('pull-applied', reloadStoredNotebook),
      subscribe('dirty', reloadStoredNotebook),
    ];
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [reloadStoredNotebook]);

  useNotebookOpeningFocus(classInfo.id, allRows,
    !isClassLoading && !isConfigLoading && initialMathTypesetComplete,
    setSessionFocusKey);

  useEffect(() => () => {
    if (placementTimerRef.current !== null) window.clearTimeout(placementTimerRef.current);
  }, []);

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
  }, [canUndo, undo, setEditorState, setSelectionState]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    redo();
    setSelectionState(createSelectionState());
    setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [canRedo, redo, setEditorState, setSelectionState]);

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
  }, [setEditorState, setSelectionState]);

  const handleClearSearch = useCallback(() => setEditorState(draft => { draft.searchQuery = ""; }), [setEditorState]);
  const handleSetSearchQuery = useCallback((value: string) => setEditorState(draft => { draft.searchQuery = value; }), [setEditorState]);
  const handleOpenDataTransfer = useCallback(() => setEditorState(draft => { draft.activeModal = 'dataTransfer'; }), [setEditorState]);
  const handleOpenManageLessons = useCallback(() => setEditorState(draft => { draft.activeModal = 'manageLessons'; }), [setEditorState]);
  const handleOpenGuideModal = useCallback(() => {
    if (onOpenGuide) onOpenGuide();
    else setEditorState(draft => { draft.activeModal = 'guide'; });
  }, [onOpenGuide, setEditorState]);
  const handleOpenAnalyse = useCallback(() => setEditorState(draft => { draft.activeModal = 'analyse'; }), [setEditorState]);
  const handleOpenEvaluations = useCallback(() => {
    persistCurrentData(false);
    setEditorState(draft => { draft.activeModal = 'evaluations'; });
  }, [persistCurrentData, setEditorState]);

  const handleModalClose = useCallback(() => {
    cancelSession();
    setEditorState(draft => {
      draft.activeModal = null;
      draft.editingIndices = null;
    });
  }, [setEditorState, cancelSession]);

  const [pendingEvaluationEdit, setPendingEvaluationEdit] = useState<{ message: string; commit: () => void } | null>(null);
  const reviewNotebookChange = useCallback((source: LessonsData, next: LessonsData, commit: () => void) => {
    if (!workspaceIsActive()) return;
    const events = config.pedagogicalEvents?.[classInfo.id] ?? [];
    const warnings = newEvaluationWarnings(evaluationSlots(source, syncAssessments, events), evaluationSlots(next, syncAssessments, events), locale);
    const blocking = warnings.find(warning => warning.blocking);
    if (blocking) { showNotification(blocking.message, 'error'); return; }
    if (!warnings.length) { commit(); return; }
    setPendingEvaluationEdit({ message: warnings.map(warning => warning.message).join('\n'), commit: () => {
      setPendingEvaluationEdit(null);
      if (!workspaceIsActive() || lessonsDataRef.current !== source || evaluationContext.current.config !== config) {
        showNotification(t('evaluations.conflict.stale'), 'info');
        return;
      }
      commit();
    } });
  }, [classInfo.id, config, locale, syncAssessments, workspaceIsActive, showNotification, t]);

  const handleConfirmAddContent = useCallback((type: string, data: any) => {
      let notificationMessage = '';
      let nextLessons = lessonsData;
      let action = 'add-content';
      const prepare = (recipe: (draft: Draft<LessonsData>) => void, label: string) => {
        nextLessons = produce(nextLessons, draft => { recipe(draft); });
        action = label;
      };
      const newId = crypto.randomUUID();
      const anchor = selectedIndices[selectedIndices.length - 1];

      const effectiveLocale = contentDirection === 'rtl' ? 'ar' : (locale === 'ar' || locale === 'en' ? locale : 'fr');
      const rawStart = typeof data.date === 'string' ? data.date.trim() : undefined;
      const rawEnd = typeof data.endDate === 'string' ? data.endDate.trim() : undefined;
      const intersecting = rawStart && rawEnd && rawEnd > rawStart
        ? resolveClassSessionDatesInRange(rawStart, rawEnd, classInfo.id, config.timetable, config.timetableClock, lessonsData)
        : undefined;
      const formattedDate = rawStart ? (rawEnd && rawEnd > rawStart ? formatPedagogicalDateCell(rawStart, rawEnd, effectiveLocale, intersecting) : rawStart) : undefined;

      if (type === 'devoir_maison') {
          const date = rawStart && /^\d{4}-\d{2}-\d{2}$/.test(rawStart) ? rawStart : todayInMorocco();
          const moments = homeworkMoments(config, classInfo.id);
          const declared = extractHomeworkNumber(typeof data.title === 'string' ? data.title : '');
          const num = declared && declared > 0 ? declared : getChronologicalHomeworkNumber({
            lessons: lessonsData,
            targetDate: date,
            manualAssessments: moments.map(moment => ({ id: moment.id, type: 'maison', num: moment.num, dateISO: moment.givenDateISO })),
            assessmentDates: Object.fromEntries(moments.map(moment => [moment.id, moment.givenDateISO ?? ''])),
          });
          const effects = recordSessionSettings(assignHomeworkPatch(config, classInfo.id, date, num));
          if (effects) setState(() => lessonsData, 'assign-homework', effects);
          showNotification(t('editorNotice.homeworkAssigned', { num, date: date.split('-').reverse().join('/') }), 'success');
          setSelectionState(createSelectionState());
          handleModalClose();
          return;
      }

      if (type === 'free') {
          prepare(draft => insertFreeContent(draft, anchor, data, newId), 'add-free-content');
          notificationMessage = t('editorNotice.itemAdded');
      } else if (TOP_LEVEL_TYPE_CONFIG.hasOwnProperty(type) && type !== 'chapter') {
          const newItem: TopLevelItem = { type: type as TopLevelItem['type'], title: data.title, ...(formattedDate ? { date: formattedDate } : {}), _tempId: newId };
          prepare(draft => {
              insertAssessmentBlock(draft, anchor, newItem);
          }, 'add-top-level');
          notificationMessage = t('editorNotice.topLevelAdded');
      } else if (type === 'chapter') {
          const newChapter: TopLevelItem = { type: 'chapter', title: data.title, ...(formattedDate ? { date: formattedDate } : {}), _tempId: newId };
          prepare(draft => addTopLevelItem(draft, newChapter, anchor?.chapterIndex), 'add-top-level');
          notificationMessage = t('editorNotice.topLevelAdded');
      } else if (type === 'section' && anchor) {
          const parentIndices = { chapterIndex: anchor.chapterIndex };
          const insertAfterIndex = anchor.sectionIndex;
          const newSection: Section = { name: data.name, items: [], _tempId: newId };
          prepare(draft => addSection(draft, parentIndices, newSection, insertAfterIndex), 'add-section');
          notificationMessage = t('editorNotice.sectionAdded');
      } else if (type === 'subsection' && anchor && anchor.sectionIndex !== undefined) {
          const parentIndices = { chapterIndex: anchor.chapterIndex, sectionIndex: anchor.sectionIndex };
          const insertAfterIndex = anchor.subsectionIndex;
          const newSubSection: SubSection = { name: data.name, items: [], _tempId: newId };
          prepare(draft => addSubSection(draft, parentIndices, newSubSection, insertAfterIndex), 'add-subsection');
          notificationMessage = t('editorNotice.subsectionAdded');
      } else if (type === 'subsubsection' && anchor && anchor.sectionIndex !== undefined && anchor.subsectionIndex !== undefined) {
          const parentIndices = { chapterIndex: anchor.chapterIndex, sectionIndex: anchor.sectionIndex, subsectionIndex: anchor.subsectionIndex };
          const insertAfterIndex = anchor.subsubsectionIndex;
          const newSubSubSection: SubSubSection = { name: data.name, items: [], _tempId: newId };
          prepare(draft => addSubSubSection(draft, parentIndices, newSubSubSection, insertAfterIndex), 'add-subsubsection');
          notificationMessage = t('editorNotice.subsubsectionAdded');
      } else if (type === 'item' && anchor) {
          let parentLevelIndices: Indices = { chapterIndex: anchor.chapterIndex };
          if (anchor.sectionIndex !== undefined) parentLevelIndices.sectionIndex = anchor.sectionIndex;
          if (anchor.subsectionIndex !== undefined) parentLevelIndices.subsectionIndex = anchor.subsectionIndex;
          if (anchor.subsubsectionIndex !== undefined) parentLevelIndices.subsubsectionIndex = anchor.subsubsectionIndex;
          const insertAfterIndex = anchor.itemIndex;

          const normalizedType = TYPE_MAP[data.type.toLowerCase()] || data.type;
          const newItem: LessonItem = { ...data, type: normalizedType, ...(formattedDate ? { date: formattedDate } : {}), _tempId: newId };
          prepare(draft => addItem(draft, parentLevelIndices, newItem, insertAfterIndex), 'add-item');
          notificationMessage = t('editorNotice.itemAdded');
      }

      if (isNotebookAwaitingContent && type !== 'evaluation_diagnostic' && nextLessons !== lessonsData) {
        nextLessons = withoutPristineStarterDiagnostic(nextLessons);
      }

      if (nextLessons === lessonsData) {
        showNotification(t('editorNotice.contentNotAdded'), 'error');
        return;
      }

      reviewNotebookChange(lessonsData, nextLessons, () => {
        if (isNotebookAwaitingContent) recordNotebookOrigin(classInfo.id, 'personal', workspaceIsActive);
        setState(() => nextLessons, action);
        if (notificationMessage) {
          addNewItemHighlight(newId);
          showNotification(notificationMessage, "success");
          setEditorState(draft => { draft.saveStatus = 'unsaved'; });
        }
        setSelectionState(createSelectionState());
        handleModalClose();
      });
  }, [selectedIndices, lessonsData, contentDirection, setState, showNotification, handleModalClose, addNewItemHighlight, setEditorState, t, locale, config, classInfo.id, reviewNotebookChange, recordSessionSettings, isNotebookAwaitingContent, workspaceIsActive, setSelectionState]);

  const printStats = useMemo(() => {
      if (activeModal !== 'print') return EMPTY_PRINT_STATS;
      const meta = readPrintMeta(classInfo.id);
      const allDates = collectSessionDates(lessonsData, absenceSessions);
      const newDates = getNewDates(lessonsData, classInfo.id, meta, absenceSessions, sessionAnnotationTexts);
      return {
          totalDates: allDates.length,
          allDates,
          newDates,
          printedDates: allDates.filter(date => !newDates.includes(date)),
          lastPrintedAt: meta.lastPrintedAt,
          prefs: meta.prefs ?? null,
      };
  }, [activeModal, classInfo.id, lessonsData, absenceSessions, sessionAnnotationTexts, printMetaVersion]);

  const handleSmartPrint = useCallback(() => {
      setEditorState(draft => { draft.activeModal = 'print'; });
  }, [setEditorState]);

  const classHasTimetable = useMemo(
      () => (config.timetable ?? []).some(entry => entry.classId === classInfo.id),
      [config.timetable, classInfo.id]
  );

  const handleOpenTimetable = useCallback(() => {
      try { sessionStorage.setItem('config_initial_tab_v1', 'emploi'); } catch { /* stockage indisponible */ }
      onOpenSettings?.();
  }, [onOpenSettings]);

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
      if (isNotebookAwaitingContent && absenceSessions.length === 0) {
          showNotification(t('editorNotice.noPrintContent'), 'info');
          return;
      }
      const allDates = collectSessionDates(lessonsData, absenceSessions);
      const newDates = getNewDates(lessonsData, classId, undefined, absenceSessions, sessionAnnotationTexts);

      let selection: LessonsData | null = null;
      let datesToRecord: string[] = allDates;
      if (mode === 'new') {
          if (newDates.length === 0) {
              showNotification(t('editorNotice.noNewSession'), 'info');
              return;
          }
          selection = createPrintSelection(lessonsData, newDates, config.contentNumbering ?? true);
          datesToRecord = newDates;
      } else if (mode === 'custom') {
          if (!selectedDates || selectedDates.length === 0) {
              showNotification(t('editorNotice.selectSession'), 'info');
              return;
          }
          const currentDates = new Set(allDates);
          const validSelectedDates = uniq(selectedDates.filter(date => currentDates.has(date))).sort();
          if (validSelectedDates.length === 0) {
              showNotification(t('editorNotice.selectionUnavailable'), 'info');
              return;
          }
          selection = createPrintSelection(lessonsData, validSelectedDates, config.contentNumbering ?? true);
          datesToRecord = validSelectedDates;
      }

      const currentSignatures = sessionPrintSignatures(lessonsData, absenceSessions, sessionAnnotationTexts);
      const signatures = Object.fromEntries(datesToRecord.map(date => [date, currentSignatures[date]]));

      isPrintingRef.current = true;
      setIsPrinting(true);

      savePrintPrefs(classId, {
        textSize: options.textSize,
        lineSpacing: options.lineSpacing,
        pageNumbers: options.pageNumbers,
        colorContent: options.colorContent ?? false,
        headerMode: options.headerMode,
      });

      flushSync(() => {
          setPrintSnapshot({ lessonsData: selection ?? lessonsData, sessionAnnotations: sessionAnnotationTexts, absenceSessions: absenceSessions.filter(session => datesToRecord.includes(session.date)), classInfo, config, contentDirection, newlyAddedIds: [], ...options });
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
              setPrintSnapshot(null);
          } catch (error) {
              setPrintSnapshot(null);
              if (!workspaceIsActive()) return;
              logger.error('Échec inattendu du circuit d’impression.', error);
              showNotification(t('editorNotice.printPrepareError'), 'error');
          } finally {
              isPrintingRef.current = false;
              setIsPrinting(false);
              setPrintMetaVersion(version => version + 1);
          }
      };

      void launchPrint();
  }, [classInfo, config, contentDirection, lessonsData, absenceSessions, sessionAnnotationTexts, isNotebookAwaitingContent, setEditorState, showNotification, t, workspaceIsActive]);

  const handleOpenContentEditor = useCallback((indices: Indices) => {
    const targets = contentEditTargetsRef.current.get(indicesKey(indices));
    if (!targets?.length) return;
    setEditorState(draft => {
      draft.editingIndices = targets[0];
      draft.activeModal = 'editContent';
    });
  }, [setEditorState]);

  const handleOpenDateModal = useCallback((indices: Indices) => {
    const targets = contentEditTargetsRef.current.get(indicesKey(indices)) ?? [indices];
    openSessionRef.current(targets);
  }, []);

  const handleClearSelectedDates = useCallback(() => {
      if (selectedIndices.length === 0) return;
      assignSessionDate(selectedIndices, '');
  }, [selectedIndices, assignSessionDate]);

  const handleConfirmContentEdit = useCallback((indices: Indices, updatedData: ContentDraft) => {
      const targets = contentEditTargetsRef.current.get(indicesKey(indices));
      if (!targets?.length) return;
      const normalizedType = updatedData.type ? (TYPE_MAP[updatedData.type.toLowerCase()] || updatedData.type) : undefined;
      const finalItem = { ...updatedData };
      if (normalizedType) {
          finalItem.type = normalizedType;
      }
      const effectiveLocale = contentDirection === 'rtl' ? 'ar' : (locale === 'ar' || locale === 'en' ? locale : 'fr');

      const source = lessonsDataRef.current;
      const next = produce(source, draft => {
          applyContentEdit(draft, targets, finalItem, effectiveLocale, {
            classId: classInfo.id,
            timetable: config.timetable,
            timetableClock: config.timetableClock,
          });
      });
      reviewNotebookChange(source, next, () => {
        const effects = finalItem.date !== undefined ? recordSessionSettings(
          sessionRemarkSettingsPatch(config, classInfo.id, source, targets, { date: finalItem.date }, sessionRemarkEntries),
        ) : undefined;
        setState(() => next, targets.length > 1 ? 'edit-merged-content' : 'edit-content-item', effects);
        showNotification(t('editorNotice.contentUpdated'), "success");
        setEditorState(draft => {
          draft.saveStatus = 'unsaved';
          draft.editingIndices = null;
          draft.activeModal = null;
        });
      });
  }, [setState, showNotification, setEditorState, contentDirection, locale, t, classInfo.id, config, reviewNotebookChange, sessionRemarkEntries, recordSessionSettings]);

  const handleImport = useCallback(async (data: unknown, mode: 'replace' | 'append'): Promise<boolean> => {
      if (!workspaceIsActive()) return false;
      try {
        const { lessonsData: preparedLessons, report, direction } = prepareImportedLessons(data);
        if (preparedLessons.length === 0) {
          showNotification(t('editorNotice.importNoLessons'), "error");
          return false;
        }

        const shouldAdoptImportedDirection = mode === 'replace' || isNotebookAwaitingContent;
        const nextDirection = shouldAdoptImportedDirection ? direction.direction : contentDirectionRef.current;
        const combined = mode === 'replace' ? preparedLessons : [...lessonsDataRef.current, ...preparedLessons];
        const nextLessons = withStarterDiagnostic(combined, contentLocaleFromDirection(nextDirection));
        try {
          saveNotebook(classInfo.id, nextLessons, nextDirection);
        } catch (error) {
          logger.error('Failed to store imported notebook', error);
          showNotification(t('editorNotice.saveError'), 'error');
          return false;
        }
        lessonsDataRef.current = nextLessons;
        if (mode === 'replace' || isNotebookAwaitingContent) recordNotebookOrigin(classInfo.id, 'imported', workspaceIsActive);
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
  }, [setState, showNotification, handleModalClose, setEditorState, isNotebookAwaitingContent, t, workspaceIsActive, classInfo.id, syncNow, setSelectionState]);

  const handleUpdateLessons = useCallback((newLessons: LessonsData) => {
      setSelectionState(createSelectionState());
      setState(() => newLessons, 'manage-lessons');
      handleModalClose();
      showNotification(t('editorNotice.lessonsUpdated'), 'success');
      setEditorState(draft => { draft.saveStatus = 'unsaved'; });
  }, [setState, showNotification, handleModalClose, setEditorState, t, setSelectionState]);

  const handleEvaluationsLessonsChange = useCallback((newLessons: LessonsData) => {
      if (!workspaceIsActive()) return;
      saveNotebook(classInfo.id, newLessons, contentDirection);
      evaluationsBaseline.current = newLessons;
      lessonsDataRef.current = newLessons;
      saveStatusRef.current = 'saved';
      setState(() => newLessons, 'evaluations-sync');
      setEditorState(draft => { draft.saveStatus = 'saved'; });
  }, [setState, setEditorState, classInfo.id, contentDirection, workspaceIsActive]);

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

  const hasSelectedDate = selectedItemsData.some(item => Boolean(item.date));
  const allSelectedToday = selectedItemsData.length > 0 && selectedItemsData.every(item => item.date === today);
  const canAddAfterSelection = addAfterTarget !== null;
  const canAssignDateSelection = selectedCount > 0 && selectedItemsData.every(item => item.canDate);
  const editSelectionTargets = useMemo(
    () => resolveContentEditSelection(contentEditTargets, selectionState.keys),
    [contentEditTargets, selectionState.keys],
  );
  const canEditSelection = editSelectionTargets !== null;

  const handleAssignToday = useCallback(() => {
      assignSessionDate(selectedIndices, todayInMorocco());
  }, [assignSessionDate, selectedIndices]);

  const handleSelectionAdd = useCallback(() => {
    if (addAfterTarget) handleOpenAddContentModal(addAfterTarget);
  }, [addAfterTarget, handleOpenAddContentModal]);
  const handleSelectionDatePicker = useCallback(() => openSession(selectedIndices), [openSession, selectedIndices]);
  const handleSelectionEdit = useCallback(() => {
    if (editSelectionTargets?.length) handleOpenContentEditor(editSelectionTargets[0]);
  }, [editSelectionTargets, handleOpenContentEditor]);

  const hasBlockingOverlay = Boolean(
    activeModal ||
    sessionAssignment.review ||
    confirmBulkDelete ||
    pendingEvaluationEdit ||
    pendingPrintConfirmation ||
    openDocument
  );

  // Garde-fou contre le verrouillage `pointer-events: none` sur `document.body`
  // laissé par une transition entre deux primitives Radix (DropdownMenu → ConfirmDialog).
  useEffect(() => {
    if (hasBlockingOverlay) return;
    const timer = window.setTimeout(() => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    }, 50);
    return () => window.clearTimeout(timer);
  }, [hasBlockingOverlay]);

  const isLoading = isClassLoading || isConfigLoading;
  const isInitialMathPreparing = notebookHasMath && !initialMathTypesetComplete;

  if (!editorFontsReady) {
    return <AppBootSkeleton />;
  }

  if (isLoading) {
    return <EditorSkeleton />;
  }

  const isSearchActive = Boolean(displayedQuery?.trim());

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="relative w-full pb-8 safe-bottom print:bg-card print:p-0" data-editor-root data-pwa-update-blocked={editorState.saveStatus !== 'saved'}>
      <div className="max-w-screen-2xl mx-auto flex min-h-dvh w-full flex-col px-3 sm:px-5 lg:px-8 print:mx-0 print:w-full print:max-w-none print:min-h-0 print:bg-card print:p-0 print:shadow-none">
        <div className="print-hidden flex flex-col flex-1">
          <Header
            classInfo={classInfo}
            onClassInfoChange={handleClassInfoChange}
            onBack={onBack}
          />
          {(!isNotebookAwaitingContent || absenceSessions.length > 0) && (
            <div className="editor-toolbar-row sticky top-0 z-[50] flex items-center gap-2 print:hidden">
              <div className="min-w-0 flex-1">
                <Toolbar
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  saveStatus={saveStatus}
                  onOpenDataTransfer={handleOpenDataTransfer}
                  onOpenManageLessons={handleOpenManageLessons}
                  onOpenGuide={handleOpenGuideModal}
                  onOpenAnalyse={handleOpenAnalyse}
                  onOpenEvaluations={handleOpenEvaluations}
                  onPrint={handleSmartPrint}
                  searchQuery={searchQuery}
                  setSearchQuery={handleSetSearchQuery}
                />
              </div>
            </div>
          )}
          <main className="flex-1 pb-24 sm:pb-20 print:mx-0" onClick={handleDeselectAll}>
            <MainTable
              supportClass={classInfo}
              lessonsData={lessonsData}
              absenceSessions={absenceSessions}
              visibleRows={visibleRows}
              precomputedCourseRows={!isSearchActive && !isNotebookAwaitingContent ? groupedRows : undefined}
              onClearSearch={handleClearSearch}
              contentDirection={contentDirection}
              onOpenAddContentModal={handleOpenAddContentModal}
              showDescriptions={config.screenDescriptionMode === 'all' ? true : config.screenDescriptionMode === 'none' ? false : undefined}
              descriptionTypes={config.screenDescriptionTypes}
              selectedKeys={selectionState.keys}
              onToggleSelect={handleToggleSelectRow}
              onToggleSelectGroup={handleToggleSelectGroup}
              onReorder={handleDropRow}
              canReorder={canDropRow}
              onOpenContentEditor={handleOpenContentEditor}
              onOpenDateModal={handleOpenDateModal}
              onOpenRemark={handleOpenRemark}
              getAbsenceRemark={getAbsenceRemark}
              onOpenAbsenceRemark={handleOpenAbsenceRemark}
              newlyAddedIds={newlyAddedIds}
              editingKey={editingIndices ? indicesKey(editingIndices) : undefined}
              getDateWarnings={getDisplayDateWarnings}
              getDateOrder={getDateOrder}
              getContentNumber={getContentNumber}
              getSessionAnnotation={getSessionAnnotation}
              getDocumentPreview={getDocumentPreview}
              getSessionDocuments={getSessionDocuments}
              onOpenDocumentPreview={handleOpenDocumentPreview}
              searchQuery={displayedQuery}
              focusKey={sessionFocusKey}
              predefinedProgramTitle={predefinedOffer?.titre}
              onLoadPredefined={predefinedOffer ? handleLoadPredefined : undefined}
            />
            <EditorSyncFab />
          </main>
        </div>

        {printSnapshot && <PrintView {...printSnapshot} />}
      </div>

      <EditorOverlays
        selectionBar={{
          count: !hasBlockingOverlay ? selectedCount : 0,
          hasDate: hasSelectedDate,
          allToday: allSelectedToday,
          canAdd: canAddAfterSelection,
          canAssignDate: canAssignDateSelection,
          onAdd: handleSelectionAdd,
          onAssignDate: handleSelectionDatePicker,
          onAssignToday: handleAssignToday,
          onClearDate: handleClearSelectedDates,
          onEdit: handleSelectionEdit,
          onDelete: handleBulkDelete,
          onClear: handleDeselectAll,
          canEdit: canEditSelection,
        }}
        printModal={{
          classId: classInfo.id,
          isOpen: activeModal === 'print',
          onClose: handleModalClose,
          totalDates: printStats.totalDates,
          newDates: printStats.newDates,
          allDates: printStats.allDates,
          printedDates: printStats.printedDates,
          lastPrintedAt: printStats.lastPrintedAt,
          savedPrefs: printStats.prefs,
          isPrinting,
          config,
          onConfigChange: updateConfig,
          onPrint: handleExecutePrint,
        }}
        editorModals={{
          activeModal,
          handleModalClose,
          handleImport,
          handleExportData,
          exportChapters,
          lessonsData,
          handleUpdateLessons,
          handleEvaluationsLessonsChange,
          config,
          onConfigChange: updateConfig,
          sessionEditor: sessionAssignment.editor,
          onApplySession: sessionAssignment.apply,
          handleConfirmAddContent,
          selectedIndices,
          getDateWarnings,
          getDisplayDateWarnings,
          classInfo,
          contentDirection,
          editingItem,
          editingTitleOnly,
          editingTitleField,
          editingCount: editingIndices ? contentEditTargets.get(indicesKey(editingIndices))?.length ?? 1 : 1,
          handleConfirmContentEdit: value => {
            if (editingIndices) handleConfirmContentEdit(editingIndices, value);
          },
          getSessionAnnotation,
          getSessionRemarkEntries,
          getSessionDocuments,
          onOpenDocumentPreview: handleOpenDocumentPreview,
        }}
        evaluationConflict={{
          open: !!pendingEvaluationEdit,
          message: pendingEvaluationEdit?.message ?? '',
          onConfirm: () => {
            const commit = pendingEvaluationEdit?.commit;
            setPendingEvaluationEdit(null);
            commit?.();
          },
          onCancel: () => setPendingEvaluationEdit(null),
        }}
        dateReview={{
          isOpen: sessionAssignment.review !== null,
          date: sessionAssignment.review?.date ?? '',
          warnings: sessionAssignment.review?.warnings ?? [],
          onModify: () => {
            sessionAssignment.modify();
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => document.getElementById('assign-date-input')?.focus());
            });
          },
          onConfirm: sessionAssignment.confirm,
        }}
        timetableNudge={{
          isOpen: showTimetableNudge,
          onSkip: dismissTimetableNudge,
          onFill: fillTimetableFromNudge,
          className: classInfo.name,
        }}
        documentPreview={{
          isOpen: openDocument !== null,
          onClose: closeDocumentPreview,
          title: openDocument?.title ?? '',
          classLabel: formatLocalizedClassDisplayName(classInfo.name, locale),
          source: openDocument?.document.source,
          updatedLabel: documentUpdatedLabel,
        }}
        printConfirmation={{
          open: pendingPrintConfirmation !== null,
          onOpenChange: open => {
            if (!open) {
              setPendingPrintConfirmation(null);
              setPrintSnapshot(null);
            }
          },
          onConfirm: () => {
            const current = pendingPrintConfirmation;
            setPendingPrintConfirmation(null);
            setPrintSnapshot(null);
            if (!current || !workspaceIsActive()) return;
            if (!recordPrint(current.classId, current.signatures)) {
              showNotification(t('editorNotice.printHistoryError'), 'warning');
            }
            setPrintMetaVersion(version => version + 1);
          },
        }}
        bulkDelete={{
          open: confirmBulkDelete,
          count: selectedIndices.length,
          onOpenChange: setConfirmBulkDelete,
          onConfirm: executeBulkDelete,
        }}
        mathPreparing={isInitialMathPreparing}
      />
    </div>
  );
};
