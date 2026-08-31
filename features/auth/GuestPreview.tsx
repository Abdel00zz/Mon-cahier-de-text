import { useState } from "react";
import { BookOpen, ChevronRight, Pencil } from "@/components/ui/icons";
import { CreateClassModal } from "@/features/dashboard/modals/CreateClassModal";
import {
  formatLocalizedClassDisplayName,
  formatLocalizedSubjectDisplayName,
} from "@/constants";
import type { RegistrationSetup } from "./registrationSetup";

/** The main preparation flow; no fake loading and no second class-validation circuit. */
export function GuestPreview({
  locale,
  setup,
  onChange,
  onRegister,
}: {
  locale: "fr" | "ar";
  setup: RegistrationSetup | null;
  onChange: (value: RegistrationSetup) => void;
  onRegister: () => void;
}) {
  const [creating, setCreating] = useState(!setup);
  const ar = locale === "ar";
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {ar ? "إعداد فضائك" : "Création de votre espace"}
      </p>
      <h1
        tabIndex={-1}
        className="mt-3 text-2xl font-semibold leading-snug outline-none sm:text-3xl"
      >
        {setup
          ? ar
            ? "قسمك جاهز. ابدأ أول درس."
            : "Votre classe est prête. À vous d’écrire la suite."
          : ar
            ? "لنبدأ بقسمك الأول."
            : "Commençons par votre première classe."}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-stone-600 dark:text-stone-300">
        {setup
          ? ar
            ? "أضف عنواناً إذا رغبت، ثم احفظ فضاءك بإنشاء حسابك."
            : "Ajoutez un premier titre si vous le souhaitez. Il ne restera qu’à créer votre compte pour conserver votre espace."
          : ar
            ? "اختر السلك والقسم والمادة. يمكنك إضافة باقي أقسامك لاحقاً."
            : "Choisissez votre cycle, votre classe et votre matière. Vous pourrez ajouter les autres classes ensuite."}
      </p>
      <ol
        className="my-6 grid grid-cols-3 gap-2 text-sm"
        aria-label={ar ? "تقدم الإعداد" : "Progression de la préparation"}
      >
        {(ar
          ? ["قسمي", "محتواي الأول", "حسابي"]
          : ["Ma classe", "Mon premier contenu", "Mon compte"]
        ).map((label, index) => (
          <li
            key={label}
            aria-current={index === (setup ? 1 : 0) ? "step" : undefined}
            className={
              "border-t-2 pt-3 " +
              (index <= (setup ? 1 : 0)
                ? "border-stone-700 dark:border-stone-300"
                : "border-stone-200 text-stone-500 dark:border-stone-700")
            }
          >
            <span className="me-1 tabular-nums">{index + 1}.</span>
            {label}
          </li>
        ))}
      </ol>
      {setup ? (
        <div className="space-y-4">
          <article
            className="keep-surface flex min-w-0 items-center gap-3 p-4"
            data-keep-tone="sand"
          >
            <BookOpen className="h-6 w-6 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-lg font-semibold">
                {formatLocalizedClassDisplayName(setup.className, locale)}
              </h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                {formatLocalizedSubjectDisplayName(setup.subject, locale)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              aria-label={ar ? "تغيير القسم" : "Changer la classe"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline-2 dark:hover:bg-white/10"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          </article>
          <section className="keep-surface p-4">
            <label
              htmlFor="first-chapter"
              className="mb-2 block text-base font-medium"
            >
              {ar
                ? "عنوان الدرس الأول (اختياري)"
                : "Premier titre de chapitre (facultatif)"}
            </label>
            <input
              id="first-chapter"
              dir="auto"
              maxLength={300}
              value={setup.firstTitle ?? ""}
              onChange={(event) =>
                onChange({ ...setup, firstTitle: event.target.value })
              }
              placeholder={
                ar ? "مثال: الدوال العددية" : "Ex. : Les fonctions numériques"
              }
              className="min-h-12 w-full rounded-lg border border-[#e0e0e0] bg-transparent px-3 text-base focus-visible:outline-2 dark:border-[#5f6368]"
            />
            <div className="mt-4 overflow-hidden rounded-lg border border-[#e0e0e0] dark:border-[#5f6368]">
              <p className="bg-stone-100 px-3 py-2 text-sm dark:bg-white/5">
                {ar ? "معاينة دفتري" : "Aperçu de mon cahier"}
              </p>
              <p dir="auto" className="min-h-16 break-words px-3 py-4 text-lg">
                {setup.firstTitle?.trim() ||
                  (ar ? "عنوانك سيظهر هنا." : "Votre titre apparaîtra ici.")}
              </p>
            </div>
          </section>
        </div>
      ) : (
        <div className="keep-surface flex min-h-40 items-center justify-center p-6">
          <BookOpen className="h-10 w-10 text-stone-500" aria-hidden="true" />
        </div>
      )}
      <footer className="sticky bottom-0 mt-6 border-t border-[#e0e0e0] bg-white py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-[#5f6368] dark:bg-[#202124]">
        <button
          type="button"
          onClick={setup ? onRegister : () => setCreating(true)}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-3 text-base font-semibold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-4 dark:bg-stone-100 dark:text-stone-950"
        >
          {setup
            ? ar
              ? "حفظ فضائي"
              : "Enregistrer mon espace"
            : ar
              ? "اختيار قسمي"
              : "Choisir ma classe"}
          <ChevronRight
            className="h-4 w-4 shrink-0 rtl:rotate-180"
            aria-hidden="true"
          />
        </button>
        <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          {ar
            ? "لن تُحفظ اختياراتك نهائياً إلا بعد إنشاء الحساب. تحديث الصفحة قبل ذلك يمحوها."
            : "Vos choix seront sauvegardés après l’inscription. Avant cela, un rechargement de page les efface."}
        </p>
      </footer>
      <CreateClassModal
        isOpen={creating}
        onClose={() => setCreating(false)}
        defaultCycle={setup?.cycle ?? "college"}
        editingClass={
          setup
            ? {
                id: "preparation",
                name: setup.className,
                subject: setup.subject,
                cycle: setup.cycle,
                teacherName: "",
                createdAt: "",
                color: "",
              }
            : undefined
        }
        onUpdate={(_id, details) => {
          if (setup)
            onChange({
              ...setup,
              className: details.name ?? setup.className,
              subject: details.subject ?? setup.subject,
              cycle: details.cycle ?? setup.cycle,
              applicationLocale: locale,
            });
        }}
        onCreate={(details) =>
          onChange({
            cycle: details.cycle ?? "college",
            className: details.name,
            subject: details.subject,
            applicationLocale: locale,
            firstTitle: setup?.firstTitle,
            preparationCompleted: true,
          })
        }
      />
    </main>
  );
}
