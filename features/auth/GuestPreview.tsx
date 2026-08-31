import { useState } from 'react';
import { BookOpen, ChevronRight, Pencil } from '@/components/ui/icons';
import { CreateClassModal } from '@/features/dashboard/modals/CreateClassModal';
import {
  formatLocalizedClassDisplayName,
  formatLocalizedSubjectDisplayName,
} from '@/constants';
import type { RegistrationSetup } from './registrationSetup';

export function GuestPreview({
  locale,
  setup,
  onChange,
  onRegister,
  onLogin,
}: {
  locale: 'fr' | 'ar';
  setup: RegistrationSetup | null;
  onChange: (value: RegistrationSetup) => void;
  onRegister: () => void;
  onLogin: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const ar = locale === 'ar';
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-sm text-[#5f6368] dark:text-[#bdc1c6]">
        <span>{ar ? 'تجربة بدون حساب' : 'Essai sans compte'}</span>
        <button
          type="button"
          onClick={onLogin}
          className="min-h-11 rounded-lg px-2 underline underline-offset-4 focus-visible:outline-2"
        >
          {ar ? 'لديّ حساب' : 'J’ai déjà un compte'}
        </button>
      </div>
      <h1 className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
        {setup
          ? ar
            ? 'دفترك الأول يأخذ شكله.'
            : 'Votre premier cahier prend forme.'
          : ar
            ? 'ابدأ بقسمك الأول.'
            : 'Commencez par votre première classe.'}
      </h1>
      <p className="mb-6 mt-3 max-w-xl text-sm leading-relaxed text-[#5f6368] dark:text-[#bdc1c6]">
        {ar
          ? 'اختر قسمك وجرّب عنوان أول درس. لا يُطلب الحساب إلا لحفظ ما أعددته.'
          : 'Choisissez votre classe et essayez un premier titre de chapitre. Le compte vient ensuite, pour conserver votre préparation.'}
      </p>
      <div
        role="progressbar"
        aria-label={ar ? 'إعداد الدفتر' : 'Préparation du cahier'}
        aria-valuemin={1}
        aria-valuemax={2}
        aria-valuenow={setup ? 2 : 1}
        className="mb-6 flex gap-2"
      >
        <span className="h-1 flex-1 rounded-full bg-stone-700 dark:bg-stone-300" />
        <span
          className={
            'h-1 flex-1 rounded-full ' +
            (setup
              ? 'bg-stone-700 dark:bg-stone-300'
              : 'bg-stone-200 dark:bg-stone-700')
          }
        />
      </div>
      {setup ? (
        <div className="space-y-4">
          <article
            className="keep-surface flex min-w-0 items-center gap-3 p-5"
            data-keep-tone="sand"
          >
            <BookOpen className="h-6 w-6 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold">
                {formatLocalizedClassDisplayName(setup.className, locale)}
              </h2>
              <p className="mt-1 truncate text-sm text-[#5f6368] dark:text-[#bdc1c6]">
                {formatLocalizedSubjectDisplayName(setup.subject, locale)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              aria-label={ar ? 'تغيير القسم' : 'Changer la classe'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline-2 dark:hover:bg-white/10"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          </article>
          <div className="keep-surface p-4 sm:p-5">
            <label
              htmlFor="preview-first-title"
              className="mb-2 block text-sm font-medium"
            >
              {ar
                ? 'عنوان الدرس الأول (اختياري)'
                : 'Titre du premier chapitre (facultatif)'}
            </label>
            <input
              id="preview-first-title"
              value={setup.firstTitle ?? ''}
              maxLength={300}
              onChange={(e) =>
                onChange({ ...setup, firstTitle: e.target.value })
              }
              placeholder={
                ar ? 'مثال: الدوال العددية' : 'Ex. : Les fonctions numériques'
              }
              className="h-12 w-full rounded-lg border border-[#e0e0e0] bg-transparent px-3 text-base focus-visible:outline-2 dark:border-[#5f6368]"
            />
            <div
              className="mt-4 overflow-hidden rounded-lg border border-[#e0e0e0] dark:border-[#5f6368]"
              aria-label={ar ? 'معاينة الدفتر' : 'Aperçu du cahier'}
            >
              <div className="bg-stone-100 px-3 py-2 text-xs font-medium dark:bg-[#303134]">
                {ar ? 'محتوى الدرس' : 'Contenu du cours'}
              </div>
              <p
                dir="auto"
                className="min-h-14 break-words px-3 py-3 text-base"
              >
                {setup.firstTitle?.trim() ||
                  (ar ? 'سيظهر عنوانك هنا.' : 'Votre titre apparaîtra ici.')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="keep-surface flex min-h-48 flex-col items-center justify-center gap-4 p-6 text-center">
          <BookOpen
            className="h-9 w-9 text-[#5f6368] dark:text-[#bdc1c6]"
            aria-hidden="true"
          />
          <p className="max-w-sm text-sm leading-relaxed">
            {ar
              ? 'الثانوي الإعدادي أو التأهيلي أو الأقسام التحضيرية: اختر مستواك ومادتك.'
              : 'Collège, lycée ou prépa : choisissez votre niveau et votre matière.'}
          </p>
        </div>
      )}
      <div className="mt-6 flex flex-col items-start gap-3">
        <button
          type="button"
          onClick={setup ? onRegister : () => setCreating(true)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-4 dark:bg-stone-100 dark:text-stone-950"
        >
          {setup
            ? ar
              ? 'إنشاء حساب لحفظ دفتري'
              : 'Créer un compte pour conserver mon cahier'
            : ar
              ? 'إعداد قسمي'
              : 'Préparer ma classe'}
          <ChevronRight
            className="h-4 w-4 shrink-0 rtl:rotate-180"
            aria-hidden="true"
          />
        </button>
        <p className="text-xs leading-relaxed text-[#5f6368] dark:text-[#bdc1c6]">
          {ar
            ? 'تبقى التجربة في هذه الصفحة حتى إنشاء الحساب. تحديث الصفحة يمحوها.'
            : 'L’essai reste dans cette page jusqu’à l’inscription. Un rechargement l’efface.'}
        </p>
      </div>
      <CreateClassModal
        isOpen={creating}
        onClose={() => setCreating(false)}
        defaultCycle={setup?.cycle ?? 'college'}
        onCreate={(details) =>
          onChange({
            cycle: details.cycle ?? 'college',
            className: details.name,
            subject: details.subject,
            applicationLocale: locale,
            firstTitle: setup?.firstTitle,
          })
        }
      />
    </main>
  );
}
