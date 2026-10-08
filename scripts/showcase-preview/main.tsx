import { useMemo, useRef, useState } from 'react';
import { useNotebookOpeningFocus } from '../../src/features/editor/hooks/useNotebookOpeningFocus';
import { Toolbar } from '../../src/features/editor/Toolbar';
import { buildSessionActivityRemarks } from '../../src/domain/evaluations/sessionActivityRemarks';
import { translateLocaleMessage } from '../../src/i18n/messages';
import { KindChooser } from '../../src/features/evaluations/components/KindChooser';
import { DevoirsView } from '../../src/features/evaluations/DevoirsView';
import { PrintView } from '../../src/features/editor/PrintView';
import { buildAbsenceSessions } from '../../src/domain/notebook/absenceSessions';
import { createRoot } from 'react-dom/client';
import { LocaleProvider } from '../../src/i18n/LocaleProvider';
import { ClassCard } from '../../src/features/dashboard/ClassCard';
import { MainTable } from '../../src/features/editor/MainTable';
import { ScheduleTab } from '../../src/features/settings/components/ScheduleTab';
import { BookOpen, CalendarDays, LayoutGrid } from '../../src/components/ui/icons';
import { assignClassColors } from '../../src/domain/classes/classColors';
import { buildLessonRows } from '../../src/domain/notebook/lessonRows';
import type { AppConfig, ClassInfo, LessonsData } from '../../src/types';
import '../../src/styles/index.css';

const params = new URLSearchParams(location.search);
const ar = params.get('lang') === 'ar';
const locale = ar ? 'ar' : 'fr';
const screen = params.get('screen') ?? 'classes';
const mobile = params.has('portrait');
if (params.has('android')) document.documentElement.dataset.platform = 'android';
const noop = () => {};
const classes = assignClassColors(['2ème Bac Sciences Physiques 1', '2ème Bac Sciences Physiques 2', '1er Bac Sciences Mathématiques 1', 'Tronc Commun Scientifique 3'].map((name, i) => ({ id: `showcase-${i}`, name, subject: 'Mathématiques', cycle: 'lycee', teacherName: '', color: '', createdAt: `2026-09-0${i + 1}`, lastOpenedAt: '2026-09-21T09:30:00Z' } as ClassInfo)));
const config = { establishmentName: '', defaultTeacherName: '', applicationLocale: locale, selectedSubjects: ['Mathématiques'], schoolYearStart: '2026-09-07', timetable: [{ day: 1, slot: 0, classId: classes[0].id }, { day: 1, slot: 1, classId: classes[0].id }, { day: 1, slot: 2, classId: classes[1].id }, { day: 2, slot: 0, classId: classes[2].id }, { day: 2, slot: 1, classId: classes[2].id }, { day: 3, slot: 2, classId: classes[3].id }, { day: 4, slot: 0, classId: classes[1].id }, { day: 5, slot: 3, classId: classes[0].id }] } as AppConfig;
if (params.has('absences')) config.absences = [{ debut: '2026-09-22', fin: '2026-09-22', motif: ar ? 'راحة بوصفة طبية' : 'Repos prescrit' }];
if (params.has('absence-merge')) config.absences = [{ debut: '2026-09-24', fin: '2026-10-02', motif: ar ? 'راحة بوصفة طبية' : 'Repos prescrit' },
 ...(params.has('different-reasons') ? [{ debut: '2026-09-28', fin: '2026-09-28', motif: ar ? 'متابعة طبية' : 'Suivi médical' }] : [])];
if (screen === 'checks') config.pedagogicalEvents = { [classes[0].id]: [{ id: 'notebook-check', type: 'controle_cahiers', title: ar ? 'مراقبة دفاتر التلاميذ' : 'Contrôle des cahiers', date: '2026-10-08', status: 'planned', createdAt: '2026-10-08T08:00:00Z',
 students: { names: ar ? ['أمين', 'سلمى', 'علي', 'لينا'] : ['Amine', 'Salma', 'Ali', 'Lina'], updatedAt: '2026-10-08T08:00:00Z' } }] };
if (params.has('activities')) {
 config.pedagogicalEvents = { [classes[0].id]: ['2026-09-21', '2026-09-24'].flatMap(date => [
  { id: `check-${date}`, type: 'controle_cahiers', title: ar ? 'مراقبة دفاتر التلاميذ' : 'Contrôle des cahiers', date, status: 'planned', createdAt: '2026-09-01T00:00:00Z' },
  { id: `remediation-${date}`, type: 'remediation', title: ar ? 'معالجة التعثرات' : 'Remédiation', date, status: 'planned', createdAt: '2026-09-01T00:00:00Z' },
 ]) };
 config.manualAssessments = { [classes[0].id]: ['2026-09-21', '2026-09-24'].map((dateISO, index) => ({ id: `oral-${index}`, type: 'oral', num: index + 1, semestre: 1, dateISO })) };
}
const lessons: LessonsData = [{ type: 'chapter', title: ar ? 'الدوال العددية — الاستمرارية' : 'Fonctions numériques — Continuité', items: [
 { type: 'définition', title: ar ? 'الاستمرارية في نقطة' : 'Continuité en un point', date: '2026-09-21' },
 { type: 'propriété', title: ar ? 'دالة متصلة على مجال' : 'Fonction continue sur un intervalle', date: '2026-09-21' },
 { type: 'exemple', title: ar ? 'حدود الدوال' : 'Limites de fonctions', date: '2026-09-21' },
 { type: 'exercice', title: ar ? 'تطبيق: دراسة دالة' : 'Application : étude d’une fonction', date: '2026-09-22' },
 { type: 'exercice', title: ar ? 'تمرين: رسم المنحنى' : 'Exercice : tracer une courbe', date: '2026-09-22' },
 { type: 'propriété', title: ar ? 'مبرهنة القيم المتوسطة' : 'Théorème des valeurs intermédiaires', date: '2026-09-22' },
 { type: 'exemple', title: ar ? 'قراءة التمثيل البياني' : 'Lecture graphique', date: '2026-09-23' },
 { type: 'exercice', title: ar ? 'تدريب: تطبيق المبرهنة' : 'Entraînement : appliquer le théorème', date: '2026-09-23' },
]}];
if (params.has('activities')) lessons[0].items!.push({ type: 'cours', title: ar ? 'تطبيق مستقل' : 'Application isolée', date: '2026-09-24', remark: ar ? 'ملاحظة الأستاذ' : 'Note du professeur' });
// Exercise the real virtual table with a long notebook without account data.
if (params.has('stress')) {
  const sample = lessons[0];
  lessons.push(...Array.from({ length: 60 }, (_, index) => ({ ...structuredClone(sample), title: `${sample.title} ${index + 2}` })));
}
// The last dated row sits before an undated tail, inside a merged session.
if (params.has('resume')) {
  lessons.push({ type: 'chapter', title: ar ? 'محتوى لم يُنجز بعد' : 'Contenu à venir', items:
    Array.from({ length: 20 }, (_, i) => ({ type: 'cours', title: `${ar ? 'لاحقاً' : 'À venir'} ${i + 1}` })) });
}
function PreviewTable() {
 const rows = useMemo(() => buildLessonRows(lessons), []);
 const annotations = useMemo(() => buildSessionActivityRemarks(config, classes[0].id, (key, values) => translateLocaleMessage(locale, key, values), ar ? '، ' : ', '), []);
 const [focusKey, setFocusKey] = useState<string | null>(null);
 const priorityFocus = useRef<string | null>(null);
 useNotebookOpeningFocus('showcase', rows, params.has('resume'), priorityFocus, setFocusKey);
 return <MainTable lessonsData={lessons} visibleRows={rows} absenceSessions={buildAbsenceSessions(config, classes[0].id, lessons)} contentDirection={ar?'rtl':'ltr'} onClearSearch={noop} onOpenAddContentModal={noop} showDescriptions={false} selectedKeys={new Set()} onToggleSelect={noop} onOpenContentEditor={noop} newlyAddedIds={[]} focusKey={focusKey} getSessionAnnotation={date => annotations.get(date ?? '')}/>;
}
const tabs = [{ id: 'classes', label: ar ? 'أقسامي' : 'Mes classes', icon: LayoutGrid }, { id: 'editor', label: ar ? 'دفتر النصوص' : 'Mon cahier', icon: BookOpen }, { id: 'schedule', label: ar ? 'استعمال الزمن' : 'Emploi du temps', icon: CalendarDays }];
function Capture() {
 const [search, setSearch] = useState('');
 const [opening, setOpening] = useState(0);
 const [previewConfig, setPreviewConfig] = useState(config);
 return <LocaleProvider locale={locale}><div dir={ar?'rtl':'ltr'} className="showcase-capture" style={{minHeight:'100vh',padding:mobile?20:32}}>
  <style>{`* { animation:none !important; transition:none !important; } html, body, #root { margin:0; background:#fbfaf7 !important; } html { overflow-y:auto; } body { overflow:visible; } .showcase-capture { background:#fbfaf7; color:#282d2b; } .capture-page { max-width:1040px; margin:auto; }`}</style>
  <div className="capture-page"><header className="flex items-center justify-between gap-4 pb-5 border-b border-stone-400/15"><div className="flex items-center gap-3"><img src="/icons/icon-192.png" width="40" height="40" alt="" className="rounded-xl"/><div><p className="font-semibold text-lg">{ar?'دفتر نصوصي':'Mon cahier de textes'}</p><p className="text-xs text-muted-foreground mt-1">{ar?'مساحة واضحة ليوم دراسي منظم':'Un espace clair pour votre journée'}</p></div></div><span className="text-xs text-muted-foreground">2026 · 2027</span></header>
  <nav className="flex gap-2 mt-5 mb-6">{tabs.map(({id,label,icon:Icon})=><a key={id} href={`?lang=${locale}&screen=${id}${mobile?'&portrait':''}`} className={`min-h-11 flex flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-medium ${screen===id?'border-stone-700 bg-stone-800 text-stone-50 shadow-sm':'border-stone-200 text-stone-700 bg-white'}`}><Icon className="h-4 w-4"/>{label}</a>)}</nav>
  {screen==='classes'&&<><div className="flex items-center justify-between mb-4"><h1 className="text-xl font-medium">{ar?'أقسامي :':'Mes classes :'}</h1><span className="text-xs text-muted-foreground">{ar?'كل شيء في مكانه':'Tout à portée de main'}</span></div><div className={mobile?'grid gap-4':'grid grid-cols-2 gap-5'}>{classes.slice(0,mobile?3:4).map((c,i)=><ClassCard key={c.id} classInfo={c} index={i} onSelect={noop} onConfigure={noop} onDelete={noop}/>)}</div></>}
  {screen==='editor'&&<div data-editor-root className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm"><h1 className="text-lg font-medium mb-5">{ar?'الثانية بكالوريا علوم فيزيائية 1':'2ème Bac Sciences Physiques 1'}</h1>{params.has('resume')&&<button type="button" onClick={()=>setOpening(value=>value+1)} className="min-h-11 mb-3">{ar?'فتح القسم مجدداً':'Rouvrir la classe'}</button>}{params.has('toolbar')&&<div className="editor-toolbar-row flex items-center"><div className="min-w-0 flex-1"><Toolbar searchQuery={search} setSearchQuery={setSearch} canUndo canRedo saveStatus="saved" onUndo={noop} onRedo={noop} onOpenDataTransfer={noop} onOpenManageLessons={noop} onOpenGuide={noop} onOpenAnalyse={noop} onOpenEvaluations={noop} onPrint={noop}/></div></div>}<PreviewTable key={opening}/></div>}
  {screen==='print'&&<PrintView lessonsData={lessons} classInfo={classes[0]} config={config} contentDirection={ar?'rtl':'ltr'} newlyAddedIds={[]} preview/>}
  {screen==='activities'&&<KindChooser onSelect={noop}/>}
  {screen==='checks'&&<DevoirsView embedded classes={[classes[0]]} config={previewConfig} onConfigChange={patch => setPreviewConfig(previous => ({...previous,...patch}))}/>}
  {screen==='schedule'&&<div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-sm"><ScheduleTab classes={classes} config={config} onChange={noop}/></div>}
  </div>
 </div></LocaleProvider>;
}
if (import.meta.env.DEV) {
 const root = createRoot(document.getElementById('root')!);
 root.render(<Capture />);
 import.meta.hot?.dispose(() => root.unmount());
}

