import { useId, useMemo, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatLocalizedClassDisplayName,
  formatLocalizedSubjectDisplayName,
  CLASS_LEVELS_BY_CYCLE,
  SUBJECTS,
  classLevelGroupsForCycle,
  formatClassLevelGroupLabel,
} from "@/constants";
import {
  registrationSetupFromDraft,
  type RegistrationDraft,
  type RegistrationSetup,
} from "./registrationSetup";
import {
  sanitizeGroupNumberInput,
  normalizeGroupNumber,
} from "@/utils/classGroup";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Cycle } from "@/types";

const CYCLES: Cycle[] = ["college", "lycee", "prepa"];
const CYCLE_LABELS = {
  fr: {
    college: "Collège",
    lycee: "Lycée qualifiant",
    prepa: "Classes préparatoires",
  },
  ar: {
    college: "الثانوي الإعدادي",
    lycee: "الثانوي التأهيلي",
    prepa: "الأقسام التحضيرية",
  },
};

// Keep the existing choice control stable between renders (focus is preserved).
const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "auth-choice min-h-11 max-w-full rounded-md border px-3 py-2 text-sm font-bold focus-visible:outline-2",
      active
        ? "bg-[#fbbc04] border-[#fbbc04] text-black shadow-sm"
        : "bg-transparent border-border text-foreground hover:bg-black/5 dark:hover:bg-white/10",
    )}
  >
    {children}
  </button>
);

/** The preparation form is the first step of registration, not a guest mode.
 * The parent retains this draft across login, registration and browser back.
 */
export function RegistrationOnboarding({
  locale,
  draft,
  onChange,
  onComplete,
}: {
  locale: "fr" | "ar";
  draft: RegistrationDraft;
  onChange: (draft: RegistrationDraft) => void;
  onComplete: (setup: RegistrationSetup) => void;
}) {
  const ar = locale === "ar";
  const id = useId();
  const { cycle, levelGroup, level, subject, group } = draft;
  const update = (patch: Partial<RegistrationDraft>) =>
    onChange({ ...draft, ...patch });
  const activeLevelGroups = useMemo(
    () => (cycle ? classLevelGroupsForCycle(cycle) : []),
    [cycle],
  );
  const activeLevels = useMemo(() => {
    if (cycle === "college") return CLASS_LEVELS_BY_CYCLE.college;
    return (
      activeLevelGroups.find((item) => item.key === levelGroup)?.levels ?? []
    );
  }, [cycle, levelGroup, activeLevelGroups]);
  const hasBranch = Boolean(
    cycle && cycle !== "college" && activeLevelGroups.length,
  );
  const prepared = registrationSetupFromDraft(draft, locale);
  const invalidGroup = normalizeGroupNumber(group) === null;
  const groupLabel = ar ? "رقم الفوج" : "N° de groupe";
  const subjectLabel = ar ? "المادة الدراسية" : "Matière";

  return (
    <main className="auth-view-enter mx-auto w-full max-w-3xl flex-1 px-3 py-5 sm:px-6 sm:py-10">
      <h1
        tabIndex={-1}
        className="text-2xl font-semibold leading-snug tracking-tight outline-none sm:text-3xl"
      >
        {ar ? "لنبدأ بقسمك الأول." : "Commençons par votre première classe."}
      </h1>
      <p className="mb-6 mt-3 max-w-xl text-sm leading-relaxed text-[#5f6368] dark:text-[#bdc1c6]">
        {ar
          ? "اختر السلك، المستوى والمادة. سيتم تخصيص دفتر نصوصك تلقائياً فور تأكيد حسابك."
          : "Choisissez votre cycle, votre classe et votre matière. Vous créerez ensuite votre compte pour les conserver."}
      </p>
      <div
        role="progressbar"
        aria-label={
          ar
            ? "الخطوة 1 من 2: إعداد القسم"
            : "Étape 1 sur 2 : préparer ma classe"
        }
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={1}
        className="mb-6 flex gap-2"
      >
        <span className="h-1 flex-1 rounded-full bg-stone-700 dark:bg-stone-300" />
        <span className="h-1 flex-1 rounded-full bg-stone-200 dark:bg-stone-700" />
      </div>
      <form
        className="keep-surface overflow-hidden rounded-[12px] p-4 shadow-lg sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (prepared) onComplete(prepared);
        }}
      >
        <div className="space-y-5 sm:space-y-6">
          <div role="group" aria-labelledby={id + "-cycle"}>
            <p
              id={id + "-cycle"}
              className="mb-3 text-sm font-bold text-muted-foreground"
            >
              {ar ? "1. السلك التعليمي" : "1. Cycle"}
            </p>
            <div className="flex flex-wrap gap-2">
              {CYCLES.map((value) => (
                <Chip
                  key={value}
                  active={cycle === value}
                  onClick={() =>
                    cycle !== value &&
                    update({
                      cycle: value,
                      levelGroup: "",
                      level: "",
                      subject: "",
                    })
                  }
                >
                  {CYCLE_LABELS[locale][value]}
                </Chip>
              ))}
            </div>
          </div>
          {hasBranch && (
            <div
              key={cycle}
              className="auth-reveal"
              role="group"
              aria-labelledby={id + "-branch"}
            >
              <p
                id={id + "-branch"}
                className="mb-3 text-sm font-bold text-muted-foreground"
              >
                {ar ? "2. الشعبة أو المسلك" : "2. Branche"}
              </p>
              <div className="flex flex-wrap gap-2">
                {activeLevelGroups.map((item) => (
                  <Chip
                    key={item.key}
                    active={levelGroup === item.key}
                    onClick={() =>
                      levelGroup !== item.key &&
                      update({ levelGroup: item.key, level: "", subject: "" })
                    }
                  >
                    {formatClassLevelGroupLabel(item.key, locale)}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {activeLevels.length > 0 && (
            <div
              key={cycle + levelGroup}
              className="auth-reveal"
              role="group"
              aria-labelledby={id + "-level"}
            >
              <p
                id={id + "-level"}
                className="mb-3 text-sm font-bold text-muted-foreground"
              >
                {ar
                  ? hasBranch
                    ? "3. القسم"
                    : "2. القسم"
                  : hasBranch
                    ? "3. Classe"
                    : "2. Classe"}
              </p>
              <div className="flex flex-wrap gap-2">
                {activeLevels.map((value) => (
                  <Chip
                    key={value}
                    active={level === value}
                    onClick={() => update({ level: value })}
                  >
                    {formatLocalizedClassDisplayName(value, locale, {
                      includeClassPrefix: false,
                    })}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {level && (
            <div className="auth-reveal flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 basis-40">
                <label
                  htmlFor={id + "-subject"}
                  className="mb-2 block text-sm font-bold text-muted-foreground"
                >
                  {subjectLabel}
                </label>
                <Select
                  value={subject}
                  onValueChange={(value) => update({ subject: value })}
                >
                  <SelectTrigger
                    id={id + "-subject"}
                    aria-label={subjectLabel}
                    className="min-h-11 w-full rounded-md border-border bg-background text-base"
                  >
                    <SelectValue
                      placeholder={
                        ar ? "اختر المادة..." : "Choisir la matière..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[40vh] rounded-md">
                    {SUBJECTS.map((value) => (
                      <SelectItem
                        key={value}
                        value={value}
                        className="min-h-11 text-sm font-semibold"
                      >
                        {formatLocalizedSubjectDisplayName(value, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {subject && (
                <div className="auth-reveal w-28 shrink-0">
                  <label
                    htmlFor={id + "-group"}
                    className="mb-2 block text-sm font-bold text-muted-foreground"
                  >
                    {groupLabel}
                  </label>
                  <Input
                    id={id + "-group"}
                    value={group}
                    inputMode="numeric"
                    dir="ltr"
                    required
                    onChange={(event) =>
                      update({
                        group: sanitizeGroupNumberInput(event.target.value),
                      })
                    }
                    aria-invalid={invalidGroup}
                    placeholder="1–99"
                    title={ar ? "من 1 إلى 99" : "De 1 à 99"}
                    className="h-11 w-full rounded-md border-border bg-background text-center text-base font-semibold"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <button
            type="submit"
            disabled={!prepared}
            className="auth-action min-h-11 rounded-md bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange-600 focus-visible:outline-2 disabled:opacity-50"
          >
            {ar ? "متابعة التسجيل" : "Continuer l’inscription"}
          </button>
        </div>
      </form>
    </main>
  );
}
