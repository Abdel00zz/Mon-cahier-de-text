import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Icons from '@/components/ui/icons';
import * as Figures from '@/components/ui/DynamicIllustration';
import { SquareActionButton } from '@/components/ui/SquareActionButton';
import { Toolbar } from '@/features/editor/Toolbar';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import '@/styles/index.css';
import './review.css';
const figureNames = { NotebookOpeningIllustration: 'Votre cahier', SereneStudyIllustration: 'Tout est à jour', ClassroomWelcomeIllustration: 'Vos classes', SubjectsLibraryIllustration: 'Vos matières', SchedulePlanningIllustration: 'Votre semaine', LessonSearchIllustration: 'Retrouver une séance', TeachingCyclesIllustration: 'Vos cycles', CurriculumImportIllustration: 'Votre programme' };
const aliases: string[] = [];
function Review() {
  const [dark,setDark] = useState(false);
  const [size,setSize] = useState(24);
  const [active,setActive] = useState('Classes');
  const [toast,setToast] = useState('');
  const [saveState,setSaveState] = useState<'saved' | 'unsaved'>('unsaved');
  const [search,setSearch] = useState('');
  const [arabic,setArabic] = useState(false);
  return <main className={dark ? 'visual-review dark' : 'visual-review'}>
    <div className="review-wrap">
      <header className="review-header"><div className="review-brand"><img src="/icons/icon-192.png?v=optical" width="56" height="56" alt=""/><div><p className="review-kicker">MON CAHIER DE TEXTES</p><h1>Clarté. Relief. Précision.</h1></div></div><button className="review-toggle" onClick={()=>setDark(!dark)}>{dark ? <Icons.Sun size={20}/> : <Icons.Moon size={20}/>} {dark?'Mode clair':'Mode sombre'}</button></header>
      <section className="review-hero"><div><p className="review-kicker">NOUVELLE DIRECTION VISUELLE</p><h2>Une présence douce.<br/>Un dessin précis.</h2><p>Des symboles nets au quotidien, des illustrations en verre dépoli pour les moments clés.</p><div className="review-nav">{[['Classes',Icons.Users],['Séances',Icons.BookOpen],['Planning',Icons.CalendarDays],['Réglages',Icons.Settings]].map(([label,Component])=>{const Icon=Component as typeof Icons.Users;return <button key={label as string} aria-pressed={active===label} onClick={()=>setActive(label as string)}><Icon size={23}/><span>{label as string}</span></button>})}</div></div><Figures.NotebookOpeningIllustration size={268}/></section>
      <section><div className="review-section-heading"><h2>Huit moments, une même matière</h2><span>Verre · lumière · profondeur</span></div><div className="review-figures">{Object.entries(Figures).map(([name,Figure])=><article key={name}><Figure size={172}/><h3>{figureNames[name as keyof typeof figureNames]}</h3></article>)}</div></section>
      <section className="review-actions"><SquareActionButton icon={Icons.CalendarPlus} title="Planifier une séance" subtitle="Vos prochaines séances, en un geste." onClick={()=>setToast('Une nouvelle séance est prête à être planifiée.')}/><SquareActionButton icon={Icons.FileInput} title="Importer le programme" subtitle="Retrouvez votre progression." onClick={()=>setToast('Votre programme peut être importé.')}/><SquareActionButton icon={Icons.Palette} title="Personnaliser" subtitle="Un espace qui vous ressemble." onClick={()=>setDark(!dark)}/></section>
      <section><div className="review-section-heading"><h2>Éditeur · sauvegarde accessible</h2><button className="review-toggle" onClick={()=>setArabic(!arabic)}>{arabic ? 'Français' : 'العربية'}</button></div>
        <LocaleProvider locale={arabic ? 'ar' : 'fr'} manageDocument={false}><div dir={arabic ? 'rtl' : 'ltr'}>
          <Toolbar onSave={()=>setSaveState('saved')} saveStatus={saveState} onUndo={()=>setSaveState('unsaved')} onRedo={()=>setSaveState('saved')} canUndo={saveState==='saved'} canRedo={saveState==='unsaved'}
            searchQuery={search} setSearchQuery={setSearch} onOpenDataTransfer={()=>setToast('Importer / exporter')} onOpenManageLessons={()=>setToast('Contenus')} onOpenAnalyse={()=>setToast('Suivi')} onOpenEvaluations={()=>setToast('Évaluations')} onOpenGuide={()=>setToast('Aide')} onPrint={()=>setToast('Imprimer')}/>
        </div></LocaleProvider>
      </section>
      <section><div className="review-section-heading"><h2>Des symboles qui restent lisibles</h2><div className="review-sizes">{[16,20,24,32].map(n=><button key={n} aria-pressed={n===size} onClick={()=>setSize(n)}>{n}px</button>)}</div></div><div className="review-icons">{Object.entries(Icons).filter(([name])=>!aliases.includes(name)).map(([name,Icon])=><div key={name}><Icon size={size} aria-label={name}/><span>{name}</span></div>)}</div></section>
      {toast&&<button className="review-toast" onClick={()=>setToast('')}>{toast}<Icons.X size={16}/></button>}
    </div>
  </main>;
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Review/>);

