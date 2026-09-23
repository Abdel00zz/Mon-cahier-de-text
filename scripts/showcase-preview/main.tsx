import { createRoot } from 'react-dom/client';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { MathProvider } from '../../components/ui/math-provider';
import { ClassCard } from '../../features/dashboard/ClassCard';
import { MainTable } from '../../features/editor/MainTable';
import { ScheduleTab } from '../../features/settings/components/ScheduleTab';
import { BookOpen, CalendarDays, LayoutGrid } from '../../components/ui/icons';
import { assignClassColors } from '../../utils/classColors';
import { buildLessonRows } from '../../utils/lessonRows';
import type { AppConfig, ClassInfo, LessonsData } from '../../types';
import '../../index.css';

const params = new URLSearchParams(location.search);
const ar = params.get('lang') === 'ar';
const locale = ar ? 'ar' : 'fr';
const screen = params.get('screen') ?? 'classes';
const mobile = params.has('portrait');
const noop = () => {};
const classes = assignClassColors(['2ème Bac Sciences Physiques 1', '2ème Bac Sciences Physiques 2', '1er Bac Sciences Mathématiques 1', 'Tronc Commun Scientifique 3'].map((name, i) => ({ id: `showcase-${i}`, name, subject: 'Mathématiques', cycle: 'lycee', teacherName: '', color: '', createdAt: `2026-09-0${i + 1}`, lastOpenedAt: '2026-09-21T09:30:00Z' } as ClassInfo)));
const config = { establishmentName: '', defaultTeacherName: '', applicationLocale: locale, selectedSubjects: ['Mathématiques'], schoolYearStart: '2026-09-07', timetable: [{ day: 1, slot: 0, classId: classes[0].id }, { day: 1, slot: 1, classId: classes[0].id }, { day: 1, slot: 2, classId: classes[1].id }, { day: 2, slot: 0, classId: classes[2].id }, { day: 2, slot: 1, classId: classes[2].id }, { day: 3, slot: 2, classId: classes[3].id }, { day: 4, slot: 0, classId: classes[1].id }, { day: 5, slot: 3, classId: classes[0].id }] } as AppConfig;
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
const tabs = [{ id: 'classes', label: ar ? 'أقسامي' : 'Mes classes', icon: LayoutGrid }, { id: 'editor', label: ar ? 'دفتر النصوص' : 'Mon cahier', icon: BookOpen }, { id: 'schedule', label: ar ? 'استعمال الزمن' : 'Emploi du temps', icon: CalendarDays }];
function Capture() {
 return <LocaleProvider locale={locale}><MathProvider><div dir={ar?'rtl':'ltr'} className="showcase-capture" style={{minHeight:'100vh',padding:mobile?20:32}}>
  <style>{`* { animation:none !important; transition:none !important; } html, body, #root { margin:0; background:#fbfaf7 !important; } body { overflow:hidden; } .showcase-capture { background:#fbfaf7; color:#282d2b; } .capture-page { max-width:1040px; margin:auto; }`}</style>
  <div className="capture-page"><header className="flex items-center justify-between gap-4 pb-5 border-b border-stone-400/15"><div className="flex items-center gap-3"><img src="/icons/icon-192.png" width="40" height="40" alt="" className="rounded-xl"/><div><p className="font-semibold text-lg">{ar?'دفتر نصوصي':'Mon cahier de textes'}</p><p className="text-xs text-muted-foreground mt-1">{ar?'مساحة واضحة ليوم دراسي منظم':'Un espace clair pour votre journée'}</p></div></div><span className="text-xs text-muted-foreground">2026 · 2027</span></header>
  <nav className="flex gap-2 mt-5 mb-6">{tabs.map(({id,label,icon:Icon})=><a key={id} href={`?lang=${locale}&screen=${id}${mobile?'&portrait':''}`} className={`min-h-11 flex flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-medium ${screen===id?'border-stone-700 bg-stone-800 text-stone-50 shadow-sm':'border-stone-200 text-stone-700 bg-white'}`}><Icon className="h-4 w-4"/>{label}</a>)}</nav>
  {screen==='classes'&&<><div className="flex items-center justify-between mb-4"><h1 className="text-xl font-medium">{ar?'أقسامي :':'Mes classes :'}</h1><span className="text-xs text-muted-foreground">{ar?'كل شيء في مكانه':'Tout à portée de main'}</span></div><div className={mobile?'grid gap-4':'grid grid-cols-2 gap-5'}>{classes.slice(0,mobile?3:4).map((c,i)=><ClassCard key={c.id} classInfo={c} index={i} onSelect={noop} onConfigure={noop} onDelete={noop}/>)}</div></>}
  {screen==='editor'&&<div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm"><h1 className="text-lg font-medium mb-5">{ar?'الثانية بكالوريا علوم فيزيائية 1':'2ème Bac Sciences Physiques 1'}</h1><MainTable lessonsData={lessons} visibleRows={buildLessonRows(lessons)} contentDirection={ar?'rtl':'ltr'} onClearSearch={noop} onOpenAddContentModal={noop} showDescriptions={false} selectedKeys={new Set()} onToggleSelect={noop} onOpenContentEditor={noop} newlyAddedIds={[]}/></div>}
  {screen==='schedule'&&<div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-sm"><ScheduleTab classes={classes} config={config} onChange={noop}/></div>}
  </div>
 </div></MathProvider></LocaleProvider>;
}
if (import.meta.env.DEV) {
 const root = createRoot(document.getElementById('root')!);
 root.render(<Capture />);
 import.meta.hot?.dispose(() => root.unmount());
}
