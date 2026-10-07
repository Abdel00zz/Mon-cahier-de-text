import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Icons from '@/components/ui/icons';
import * as Figures from '@/components/ui/DynamicIllustration';
import { SquareActionButton } from '@/components/ui/SquareActionButton';
import { Toolbar } from '@/features/editor/Toolbar';
import { SelectionBar } from '@/features/editor/SelectionBar';
import { SupportWhatsAppBlock } from '@/components/support/SupportWhatsAppBlock';
import { translateLocaleMessage } from '@/i18n/messages';
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
  const [selection,setSelection] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.classList.contains('dark');
    root.classList.toggle('dark', dark);
    return () => root.classList.toggle('dark', previous);
  }, [dark]);
  return <main className={dark ? 'visual-review dark' : 'visual-review'}>
    <div className="review-wrap">
      <header className="review-header"><div className="review-brand"><img src="/icons/icon-192.png?v=optical" width="56" height="56" alt=""/><div><p className="review-kicker">MON CAHIER DE TEXTES</p><h1>Clarté. Relief. Précision.</h1></div></div><button className="review-toggle" onClick={()=>setDark(!dark)}>{dark ? <Icons.Sun size={20}/> : <Icons.Moon size={20}/>} {dark?'Mode clair':'Mode sombre'}</button></header>
      <section className="review-hero"><div><p className="review-kicker">NOUVELLE DIRECTION VISUELLE</p><h2>Une présence douce.<br/>Un dessin précis.</h2><p>Des formes simples, des aplats mats et des proportions équilibrées, directement sur la page.</p><div className="review-nav">{[['Classes',Icons.Users],['Séances',Icons.BookOpen],['Planning',Icons.CalendarDays],['Réglages',Icons.Settings]].map(([label,Component])=>{const Icon=Component as typeof Icons.Users;return <button key={label as string} aria-pressed={active===label} onClick={()=>setActive(label as string)}><Icon size={23}/><span>{label as string}</span></button>})}</div></div><Figures.NotebookOpeningIllustration size={268}/></section>
      <section><div className="review-section-heading"><h2>Huit moments, une même matière</h2><span>Géométrie · équilibre · clarté</span></div><div className="review-figures">{Object.entries(Figures).map(([name,Figure])=><article key={name}><Figure size={172}/><h3>{figureNames[name as keyof typeof figureNames]}</h3></article>)}</div></section>
      <section className="review-notebook" dir="rtl" lang="ar">
        <Figures.CurriculumImportIllustration size={172} />
        <h2>{translateLocaleMessage('ar', 'emptyNotebook.label')}</h2>
        <SupportWhatsAppBlock locale="ar" hint={translateLocaleMessage('ar', 'support.serviceHint')} label={translateLocaleMessage('ar', 'support.serviceWhatsApp')} />
      </section>
      <section className="review-actions"><SquareActionButton icon={Icons.CalendarPlus} title="Planifier une séance" subtitle="Vos prochaines séances, en un geste." onClick={()=>setToast('Une nouvelle séance est prête à être planifiée.')}/><SquareActionButton icon={Icons.FileInput} title="Importer le programme" subtitle="Retrouvez votre progression." onClick={()=>setToast('Votre programme peut être importé.')}/><SquareActionButton icon={Icons.Palette} title="Personnaliser" subtitle="Un espace qui vous ressemble." onClick={()=>setDark(!dark)}/></section>
      <section><div className="review-section-heading"><h2>Éditeur · sauvegarde accessible</h2><button className="review-toggle" onClick={()=>setArabic(!arabic)}>{arabic ? 'Français' : 'العربية'}</button></div>
        <LocaleProvider locale={arabic ? 'ar' : 'fr'} manageDocument={false}><div dir={arabic ? 'rtl' : 'ltr'}>
          <button className="review-toggle mb-4" onClick={()=>setSelection(!selection)}>Tester la sélection</button>
          <SelectionBar count={selection ? 2 : 0} hasDate canAdd canAssignDate canEdit canMoveUp canMoveDown
            onClear={()=>setSelection(false)} onAdd={()=>setToast('Ajouter')} onAssignDate={()=>setToast('Choisir la date')}
            onAssignToday={()=>setToast('Aujourd’hui')} onClearDate={()=>setToast('Retirer la date')} onEdit={()=>setToast('Modifier')}
            onDelete={()=>{setSelection(false);setToast('Supprimer');}} onMoveUp={()=>setToast('Monter')} onMoveDown={()=>setToast('Descendre')} />
          <Toolbar saveStatus={saveState} onUndo={()=>setSaveState('unsaved')} onRedo={()=>setSaveState('saved')} canUndo={saveState==='saved'} canRedo={saveState==='unsaved'}
            searchQuery={search} setSearchQuery={setSearch} onOpenDataTransfer={()=>setToast('Importer / exporter')} onOpenManageLessons={()=>setToast('Contenus')} onOpenAnalyse={()=>setToast('Suivi')} onOpenEvaluations={()=>setToast('Évaluations')} onOpenGuide={()=>setToast('Aide')} onPrint={()=>setToast('Imprimer')}/>
        </div></LocaleProvider>
      </section>
      <section><div className="review-section-heading"><h2>Des symboles qui restent lisibles</h2><div className="review-sizes">{[16,20,24,32].map(n=><button key={n} aria-pressed={n===size} onClick={()=>setSize(n)}>{n}px</button>)}</div></div><div className="review-icons">{Object.entries(Icons).filter(([name])=>!aliases.includes(name)).map(([name,Icon])=><div key={name}><Icon size={size} aria-label={name}/><span>{name}</span></div>)}</div></section>
      {toast&&<button className="review-toast" onClick={()=>setToast('')}>{toast}<Icons.X size={16}/></button>}
    </div>
  </main>;
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Review/>);

