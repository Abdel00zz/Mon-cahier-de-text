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
} from "@/domain/classes/classGroup";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Cycle } from "@/types";
import { BookOpen, Check, GraduationCap, School } from '@/components/ui/icons';
import { ProudTeacherIllustration } from '@/components/ui/DynamicIllustration';
import './authMotion.css';

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
      "auth-choice inline-flex min-h-11 max-w-full items-center justify-center rounded-md border px-3 py-2 text-center text-sm font-bold focus-visible:outline-2 transition-all duration-150 active:scale-[0.97]",
      active
        ? "bg-primary/10 border-primary/50 text-primary"
        : "bg-card border-border text-foreground hover:bg-muted",
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
  const guidance = !cycle ? (ar ? 'اختر السلك الذي تدرّس فيه' : 'Choisissez votre cycle d’enseignement')
    : !level ? (ar ? 'اختر مستوى قسمك' : 'Choisissez le niveau de votre classe')
    : !subject ? (ar ? 'اختر المادة الدراسية' : 'Choisissez votre matière')
    : invalidGroup ? (ar ? 'أدخل رقم الفوج من 1 إلى 99' : 'Indiquez un groupe de 1 à 99')
    : (ar ? 'قسمك جاهز للخطوة التالية' : 'Votre classe est prête pour la suite');

  return (
    <main className="registration-studio auth-view-enter mx-auto w-full max-w-2xl flex-1" dir={ar ? 'rtl' : 'ltr'}>
      <ol className="registration-progress" aria-label={ar ? 'تقدّم الإعداد' : 'Progression de la préparation'}>
        <li aria-current="step"><span>1</span>{ar ? 'قسمك' : 'Votre classe'}</li>
        <li><span>2</span>{ar ? 'حسابك' : 'Votre compte'}</li>
      </ol>
      <div className="registration-hero">
      <div>
      <p className="onboarding-eyebrow">{ar ? 'بداية على مقاسك' : 'Un départ à votre image'}</p>
      <h1
        tabIndex={-1}
        className="text-2xl font-semibold leading-snug tracking-tight outline-none sm:text-3xl"
      >
        {ar ? "دفتر نصوصك يبدأ هنا" : "Votre cahier prend forme."}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {ar
          ? "قسمك، مادتك، ودفتر جاهز للتخصيص. ستنشئ حسابك في الخطوة التالية."
          : "Votre classe, votre matière, un cahier prêt à personnaliser. Le compte vient à l’étape suivante."}
      </p>
      </div>
      <ProudTeacherIllustration size={168} />
      </div>
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
        className="sr-only"
      />
      <form
        id={id + '-form'}
        className="registration-form"
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
            <div className="registration-cycle-grid">
              {CYCLES.map((value) => {
                const Icon = value === 'college' ? School : value === 'lycee' ? BookOpen : GraduationCap;
                return (
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
                  <Icon size={23} />
                  <span>{CYCLE_LABELS[locale][value]}</span>
                  <span className="registration-cycle-check" aria-hidden="true">{cycle === value && <Check size={12} />}</span>
                </Chip>
              ); })}
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
              <div className="flex flex-wrap justify-center gap-2">
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
              <div className="flex flex-wrap justify-center gap-2">
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
        {prepared && <div className="registration-preview" role="status" aria-live="polite">
          <BookOpen size={24} />
          <div><p>{formatLocalizedClassDisplayName(prepared.className, locale)}</p><span>{formatLocalizedSubjectDisplayName(prepared.subject, locale)}</span></div>
          <Check size={18} />
        </div>}
      </form>
        <div className="registration-dock">
          <p aria-live="polite">{guidance}</p>
          <Button
            type="submit"
            form={id + '-form'}
            disabled={!prepared}
            className="auth-action min-h-12 w-full px-5 py-3 sm:w-auto"
          >
            {ar ? "متابعة التسجيل" : "Continuer l’inscription"}
          </Button>
        </div>
    </main>
  );
}
