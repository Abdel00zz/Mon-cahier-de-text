import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { MathProvider } from '../../components/ui/math-provider';
import { PrintView } from '../../features/editor/PrintView';
import { PrintModal, type PrintOptions, type PrintMode } from '../../features/editor/modals/PrintModal';
import { MainTable } from '../../features/editor/MainTable';
import { buildLessonRows } from '../../utils/lessonRows';
import { collectSessionDates, createPrintSelection } from '../../utils/printMeta';
import { preparePrintContent, printDocument } from '../../utils/printUtils';
import type { AppConfig, ClassInfo, LessonsData } from '../../types';
import '../../index.css';
const ar = new URLSearchParams(location.search).has('ar');
const long = new URLSearchParams(location.search).has('long');
const classInfo = { id: 'print-review', name: ar ? 'الثانية بكالوريا علوم فيزيائية 1' : '2ème Bac Sciences Physiques 1', subject: ar ? 'الرياضيات' : 'Mathématiques', teacherName: ar ? 'أستاذ تجريبي' : 'Enseignant de démonstration' } as ClassInfo;
const source: LessonsData = [{ type: 'chapter', title: ar ? 'الدوال العددية — الاستمرارية' : 'Fonctions numériques — Continuité', items: [
 { type: 'définition', title: ar ? 'الاستمرارية' : 'Continuité en un point', description: '$\\displaystyle \\lim_{x\\to a} f(x)=f(a)$', date: '2026-09-21' },
 { type: 'définition', title: ar ? 'الدوال المتصلة' : 'Fonctions continues', description: ar ? 'دراسة الاستمرارية باستعمال النهايات.' : 'Étude de la continuité à partir des limites.', date: '2026-09-22' },
 { type: 'free', title: ar ? 'ملاحظة الأستاذ' : 'Note du professeur', description: '$\\int_0^1 x^2\\,dx=\\frac{1}{3}$', date: '2026-09-23', remark: ar ? 'عمل مكتمل' : 'Travail terminé' },
 ...Array.from({length:long?24:2},(_,i)=>({type:'exercice' as const,title:(ar?'تطبيق ':'Application ')+(i+1),description:'$f(x)=x^2+2x+1=(x+1)^2$',date:'2026-09-23'})),
]}];
function Preview() {
 const [data]=useState(source);
 const [config,setConfig]=useState({printDescriptionMode:'all',establishmentName:ar?'مؤسسة تجريبية':'Établissement de démonstration',schoolYearStart:'2026-09-07'} as AppConfig);
 const [open,setOpen]=useState(false);
 const [options,setOptions]=useState<PrintOptions>({pageNumbers:true,headerMode:'first',textSize:'m',lineSpacing:'normal'});
 const [selection,setSelection]=useState(data);
 const [status,setStatus]=useState('');
 const allDates=useMemo(()=>collectSessionDates(data),[data]);
 const newDates=useMemo(()=>allDates.filter(d=>d!=='2026-09-21'),[allDates]);
 async function prepare(mode:PrintMode,opts:PrintOptions,dates?:string[]) {
  flushSync(()=>{setOptions(opts);setSelection(mode==='all'?data:createPrintSelection(data,mode==='new'?newDates:dates??[]));setOpen(false);setStatus('Préparation');});
  try { await preparePrintContent(document.querySelector<HTMLElement>('.print-preview')!); setStatus('Prêt — polices et formules vérifiées'); } catch(e) {setStatus(String(e));}
 }
 return <LocaleProvider locale={ar?'ar':'fr'}><MathProvider>
  <div className="print-hidden mx-auto max-w-5xl p-5 space-y-4"><h1>Impression — données de démonstration</h1>
   <nav className="flex flex-wrap gap-4"><a href="?">Français</a><a href="?ar">العربية</a><a href="?long">Séance longue</a><button onClick={()=>setOpen(true)}>Réglages d’impression</button><button onClick={()=>void prepare('all',options)}>Préparer le document</button><button onClick={()=>void printDocument('verification-cahier')}>Ouvrir l’impression système</button></nav><p role="status">{status}</p>
   <MainTable lessonsData={data} visibleRows={buildLessonRows(data)} contentDirection={ar?'rtl':'ltr'} showDescriptions selectedKeys={new Set()} newlyAddedIds={[]} onClearSearch={()=>{}} onToggleSelect={()=>{}} onOpenContentEditor={()=>{}} onOpenAddContentModal={()=>{}}/>
  </div>
  <div className="mx-auto w-fit max-w-full overflow-auto bg-stone-200 p-5 print:p-0 print:overflow-visible print:bg-white"><PrintView preview lessonsData={selection} classInfo={classInfo} config={config} contentDirection={ar?'rtl':'ltr'} newlyAddedIds={[]} {...options}/></div>
  <PrintModal classId={classInfo.id} isOpen={open} onClose={()=>setOpen(false)} totalDates={allDates.length} allDates={allDates} newDates={newDates} printedDates={['2026-09-21']} lastPrintedAt="2026-09-21T10:00:00Z" savedPrefs={options} config={config} onConfigChange={patch=>setConfig(c=>({...c,...patch}))} onPrint={(mode,opts,dates)=>void prepare(mode,opts,dates)}/>
 </MathProvider></LocaleProvider>;
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<Preview/>);
