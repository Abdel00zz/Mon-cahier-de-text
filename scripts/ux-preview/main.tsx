/** Development-only visual review. No account, persistence or network writes. */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { LocaleProvider } from '../../src/i18n/LocaleProvider';
import { OnboardingPage } from '../../src/features/dashboard/OnboardingPage';
import { AnimatedSubmitButton } from '../../src/components/ui/animated-submit-button';
import { ClassroomWelcomeIllustration, NotebookOpeningIllustration, SereneStudyIllustration, SubjectsLibraryIllustration, SchedulePlanningIllustration, LessonSearchIllustration, TeachingCyclesIllustration, CurriculumImportIllustration } from '../../src/components/ui/DynamicIllustration';
import type { AppConfig, ClassInfo, ThemeMode } from '../../src/types';

const artwork = [
  { label: 'Choisir ses cycles', ar: 'اختيار الأسلاك', context: 'Configuration · étape 1', contextAr: 'الإعداد · المرحلة الأولى', Component: TeachingCyclesIllustration },
  { label: 'Choisir ses matières', ar: 'اختيار المواد', context: 'Configuration · étape 2', contextAr: 'الإعداد · المرحلة الثانية', Component: SubjectsLibraryIllustration },
  { label: 'Créer sa classe', ar: 'إنشاء القسم', context: 'Configuration et liste de classes vide', contextAr: 'الإعداد وقائمة الأقسام الفارغة', Component: ClassroomWelcomeIllustration },
  { label: 'Organiser sa semaine', ar: 'تنظيم الأسبوع', context: 'Horaires et échéances', contextAr: 'الحصص والمواعيد', Component: SchedulePlanningIllustration },
  { label: 'Écrire sa première séance', ar: 'كتابة الحصة الأولى', context: 'Cahier vide · création libre', contextAr: 'دفتر فارغ · كتابة المحتوى', Component: NotebookOpeningIllustration },
  { label: 'Importer son programme', ar: 'استيراد البرنامج', context: 'Cahier vide · programme disponible', contextAr: 'دفتر فارغ · برنامج متاح', Component: CurriculumImportIllustration },
  { label: 'Tout est à jour', ar: 'كل شيء محيّن', context: 'Aucune action à traiter', contextAr: 'لا توجد إجراءات مطلوبة', Component: SereneStudyIllustration },
  { label: 'Ajuster sa recherche', ar: 'تعديل البحث', context: 'Aucun résultat avec les filtres actuels', contextAr: 'لا توجد نتائج بهذه المرشحات', Component: LessonSearchIllustration },
];
const params = new URLSearchParams(location.search);

function Preview() {
  const [config, setConfig] = useState<AppConfig>({
    establishmentName: '', defaultTeacherName: '', printShowDescriptions: true,
    applicationLocale: params.get('lang') === 'ar' ? 'ar' : 'fr', selectedCycles: [], selectedSubjects: [],
    theme: params.get('theme') === 'dark' ? 'dark' : 'light',
  });
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [done, setDone] = useState(params.get('view') === 'gallery');
  const [replay, setReplay] = useState(0);
  const ar = config.applicationLocale === 'ar';
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => document.documentElement.classList.toggle('dark', config.theme === 'dark' || (config.theme === 'system' && media.matches));
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [config.theme]);
  const control = 'min-h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
  return <LocaleProvider locale={config.applicationLocale ?? 'fr'}>
    {done ? <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-8" dir={ar ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{ar ? 'دفتر النصوص · الهوية البصرية' : 'Mon cahier · langage visuel'}</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{ar ? 'رسم مناسب لكل لحظة' : 'Une figure pour chaque moment'}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ar ? 'بطاقات للتعلّم، ملاحظات للتنظيم، وإشارات واضحة للتقدم.' : 'Des fiches pour apprendre, des notes pour organiser, des repères pour avancer.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={control} onClick={() => setConfig(c => ({...c, applicationLocale: ar ? 'fr' : 'ar'}))}>{ar ? 'Français' : 'العربية'}</button>
            <select aria-label={ar ? 'المظهر' : 'Thème'} className={control} value={config.theme} onChange={e => setConfig(c => ({...c, theme:e.target.value as ThemeMode}))}>
              <option value="light">{ar ? 'فاتح' : 'Clair'}</option><option value="dark">{ar ? 'داكن' : 'Sombre'}</option><option value="system">{ar ? 'النظام' : 'Système'}</option>
            </select>
            <button className={control} onClick={() => setReplay(n => n + 1)}>{ar ? 'إعادة الحركة' : 'Rejouer'}</button>
          </div>
        </header>
        <section aria-label={ar ? 'معرض الرسوم' : 'Galerie des illustrations'} className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4">
          {artwork.map(({label, ar:arLabel, context, contextAr, Component}) => <figure key={label} className="flex flex-col items-center rounded-2xl border border-border bg-card p-4 text-center">
            <Component key={replay} size={144} />
            <figcaption className="mt-3 text-sm font-semibold leading-snug">{ar ? arLabel : label}<span className="mt-1.5 block text-xs font-normal leading-relaxed text-muted-foreground">{ar ? contextAr : context}</span></figcaption>
          </figure>)}
        </section>
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
          <div><h2 className="text-base font-semibold">{ar ? 'تأكيد الحفظ' : 'Une confirmation immédiate'}</h2><p className="mt-1 text-sm text-muted-foreground">{ar ? 'تجربة محلية دون حفظ بيانات.' : 'Essai local du bouton, sans enregistrer de données.'}</p></div>
          <AnimatedSubmitButton label={ar ? 'حفظ' : 'Enregistrer'} loadingLabel={ar ? 'جارٍ الحفظ…' : 'Enregistrement…'} successLabel={ar ? 'تم الحفظ' : 'Enregistré !'} onAction={() => new Promise<void>(resolve => setTimeout(resolve, 1200))} />
        </section>
        <button className={control + ' mt-5'} onClick={() => setDone(false)}>{ar ? 'عرض مسار الإعداد' : 'Voir le parcours de configuration'}</button>
      </div>
    </main> : <OnboardingPage config={config} classes={classes}
      onConfigChange={patch => setConfig(current => ({ ...current, ...patch }))}
      onCreateClass={details => {
        const item: ClassInfo = { ...details, id: crypto.randomUUID(), teacherName: '', color: '#63816b', createdAt: new Date().toISOString() };
        setClasses(current => [...current, item]);
        return item;
      }}
      onDeleteClass={id => setClasses(current => current.filter(item => item.id !== id))}
      onComplete={() => setDone(true)} onSkip={() => setDone(true)} />}
  </LocaleProvider>;
}

if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Preview />);
