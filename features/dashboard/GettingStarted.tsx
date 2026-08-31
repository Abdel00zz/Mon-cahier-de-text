import {
  BookOpen,
  CalendarRange,
  Check,
  ChevronRight,
  Plus,
  X,
} from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import type { AppConfig, ClassInfo } from '@/types';
import { gettingStartedState } from './onboarding/gettingStarted';

export function GettingStarted({
  config,
  classes,
  onCreate,
  onOpen,
  onSchedule,
  onDismiss,
}: {
  config: AppConfig;
  classes: ClassInfo[];
  onCreate: () => void;
  onOpen: (classInfo: ClassInfo) => void;
  onSchedule: () => void;
  onDismiss: () => void;
}) {
  const { locale } = useLocale();
  const { done, visible } = gettingStartedState(config, classes);
  if (!visible) return null;
  const ar = locale === 'ar',
    en = locale === 'en';
  const labels = ar
    ? ['إضافة قسم', 'فتح دفتر النصوص', 'إعداد الحصص (اختياري)']
    : en
      ? ['Add a class', 'Open your notebook', 'Set up lessons (optional)']
      : [
          'Ajouter une classe',
          'Ouvrir votre cahier',
          'Préparer les horaires (facultatif)',
        ];
  const icons = [Plus, BookOpen, CalendarRange];
  const next = done.findIndex((value) => !value);
  const action =
    next === 0 ? onCreate : next === 1 ? () => onOpen(classes[0]) : onSchedule;
  return (
    <section
      aria-labelledby="getting-started-title"
      className="keep-surface mb-5 p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="getting-started-title" className="text-base font-semibold">
          {ar
            ? 'خطوتك التالية'
            : en
              ? 'Your next step'
              : 'Votre prochaine étape'}
        </h2>
        <button
          type="button"
          aria-label={
            ar
              ? 'إخفاء قائمة البداية'
              : en
                ? 'Dismiss getting started'
                : 'Masquer la checklist'
          }
          onClick={onDismiss}
          className="-me-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline-2 dark:hover:bg-white/5"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3">
        {labels.map((label, index) => {
          const Icon = done[index] ? Check : icons[index];
          return (
            <li key={index} className="flex items-center gap-2 text-sm">
              <span
                className={
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' +
                  (done[index]
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-black/5 dark:bg-white/10')
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span
                className={
                  done[index] ? 'text-[#5f6368] dark:text-[#bdc1c6]' : ''
                }
              >
                {label}
                <span className="sr-only">
                  {done[index]
                    ? ar
                      ? ' — مكتمل'
                      : en
                        ? ' — done'
                        : ' — terminé'
                    : ''}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={action}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-4 dark:bg-stone-100 dark:text-stone-950"
      >
        {labels[next]}
        <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      </button>
    </section>
  );
}
