import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnalysisModal } from '../../features/editor/modals/AnalysisModal';
import { Editor } from '../../features/editor/Editor';
import { ContentRenderer } from '../../features/editor/ContentRenderer';
import { AuthProvider } from '../../contexts/AuthContext';
import { SyncProvider, useSync } from '../../contexts/SyncContext';
import { markClassDirty, touchClassSyncMeta, notifyPullApplied } from '../../utils/syncBus';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { MathProvider } from '../../components/ui/math-provider';
import { useClassManager } from '../../hooks/useClassManager';
import type { AppConfig, AppLocale, ClassInfo, LessonsData } from '../../types';
import '../../index.css';

const params = new URLSearchParams(location.search);
const locale = (params.get('locale') ?? 'fr') as AppLocale;
const classes: ClassInfo[] = JSON.parse(localStorage.getItem('classManager_v1') ?? '[]');
const classInfo = classes[0];
const config: AppConfig = JSON.parse(localStorage.getItem('appConfig_v1') ?? '{}');
const lessons: LessonsData = JSON.parse(localStorage.getItem(`classData_v1_${classInfo.id}`) ?? '[]');
function Fixture() {
  const [liveLessons, setLiveLessons] = useState(lessons);
  const { syncNow } = useSync();
  useEffect(() => {
    const update = (event: Event) => {
      const next = (event as CustomEvent<LessonsData>).detail;
      localStorage.setItem(`classData_v1_${classInfo.id}`, JSON.stringify(next));
      setLiveLessons(next); touchClassSyncMeta(classInfo.id); markClassDirty(classInfo.id);
      void syncNow();
    };
    window.addEventListener('qa-lessons-change', update);
    const cloudUpdate = (event: Event) => {
      localStorage.setItem(`classData_v1_${classInfo.id}`, JSON.stringify((event as CustomEvent<LessonsData>).detail));
      notifyPullApplied();
    };
    window.addEventListener('qa-cloud-lessons', cloudUpdate);
    return () => {
      window.removeEventListener('qa-lessons-change', update);
      window.removeEventListener('qa-cloud-lessons', cloudUpdate);
    };
  }, [syncNow]);
  const [open, setOpen] = useState(true);
  const { classes: liveClasses } = useClassManager();
  if (params.has('editor')) return <LocaleProvider locale={locale}><MathProvider><Editor classInfo={liveClasses.find(item => item.id === classInfo.id) ?? classInfo} /></MathProvider></LocaleProvider>;
  return <LocaleProvider locale={locale}><MathProvider><main className="min-h-screen bg-background p-5 text-foreground">
    <ContentRenderer elementType="chapter" data={liveLessons[0]} indices={{ chapterIndex: 0 }} />
    <AnalysisModal isOpen={open} onClose={() => setOpen(false)} classInfo={liveClasses.find(item => item.id === classInfo.id) ?? classInfo} config={config} lessonsData={liveLessons} />
  </main></MathProvider></LocaleProvider>;
}
createRoot(document.getElementById('root')!).render(<AuthProvider><SyncProvider><Fixture /></SyncProvider></AuthProvider>);
