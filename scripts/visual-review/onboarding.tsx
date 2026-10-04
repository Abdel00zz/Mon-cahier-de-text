import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RegistrationOnboarding } from '@/features/auth/RegistrationOnboarding';
import { OnboardingPage } from '@/features/dashboard/OnboardingPage';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import type { AppConfig, ClassInfo } from '@/types';
import { DEFAULT_TIMETABLE_CLOCK } from '@/domain/calendar/timetable';
import type { RegistrationDraft } from '@/features/auth/registrationSetup';
import { Moon, Sun } from '@/components/ui/icons';
import '@/styles/index.css';

function Preview() {
  const [mode, setMode] = useState('registration');
  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  const [dark, setDark] = useState(false);
  const [done, setDone] = useState(false);
  const [draft, setDraft] = useState<RegistrationDraft>({ cycle: '', levelGroup: '', level: '', subject: '', group: '1' });
  const [config, setConfig] = useState<AppConfig>({ theme: 'light', appTextSize: 'md', defaultTeacherName: '', establishmentName: '', printShowDescriptions: true,
    selectedCycles: [], selectedSubjects: [], applicationLocale: 'fr', schedules: [], timetable: [], absences: [], assessmentDates: {}, timetableClock: DEFAULT_TIMETABLE_CLOCK } as AppConfig);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  return <div className={dark ? 'dark' : ''}>
    <div className="min-h-dvh bg-background text-foreground auth-page-shell">
      <nav aria-label="Aperçu uniquement" className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs">
        <button className="min-h-11 rounded-xl bg-muted px-3" onClick={()=>{setMode(mode === 'registration' ? 'configuration' : 'registration');setDone(false);}}>{mode === 'registration' ? 'Voir la configuration' : 'Voir l’inscription'}</button>
        <button className="min-h-11 rounded-xl px-3" onClick={()=>{const next = lang==='fr'?'ar':'fr';setLang(next);setConfig(c=>({...c,applicationLocale:next}));}}>{lang==='fr'?'العربية':'FR'}</button>
        <button aria-label="Changer de thème" className="min-h-11 min-w-11 rounded-xl" onClick={()=>setDark(!dark)}>{dark?<Sun/>:<Moon/>}</button>
      </nav>
      <LocaleProvider locale={lang} manageDocument={false}>
        {done ? <div className="p-8"><p role="status">Aperçu terminé. Aucune donnée de compte créée.</p><button className="min-h-11 mt-4 rounded-xl border border-border px-4" onClick={()=>setDone(false)}>Revenir</button></div>
          : mode === 'registration' ? <RegistrationOnboarding locale={lang} draft={draft} onChange={setDraft} onComplete={()=>setDone(true)}/>
          : <OnboardingPage config={config} onConfigChange={p=>{setConfig(c=>({...c,...p}));if(p.theme)setDark(p.theme==='dark');if(p.applicationLocale)setLang(p.applicationLocale==='ar'?'ar':'fr');}} classes={classes}
              onCreateClass={details=>{const item: ClassInfo = {...details, id: `preview-${classes.length}`, color:'sky', teacherName:'Exemple', createdAt: new Date().toISOString()};setClasses(c=>[...c,item]);return item;}}
              onDeleteClass={id=>setClasses(c=>c.filter(x=>x.id!==id))} onComplete={()=>setDone(true)} onSkip={()=>setDone(true)}/>}
      </LocaleProvider>
    </div>
  </div>;
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Preview/>);
