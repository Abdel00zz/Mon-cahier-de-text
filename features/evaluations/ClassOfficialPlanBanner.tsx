import React from 'react';
import { cn } from '@/lib/utils';
import { ClassInfo } from '@/types';
import { ClassAssessmentPlanDetails, PlanningFile } from '@/utils/assessments';
import {
  AwardIcon,
  BookOpen,
  CalendarDays,
  Clock,
  GraduationCap,
  School,
} from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

interface ClassOfficialPlanBannerProps {
  classInfo: ClassInfo;
  planDetails: ClassAssessmentPlanDetails | null;
  planning: PlanningFile | null;
  className?: string;
}

export const ClassOfficialPlanBanner: React.FC<ClassOfficialPlanBannerProps> = ({
  planDetails,
  className,
}) => {
  const { t, locale } = useLocale();
  const isArabic = locale === 'ar';

  if (!planDetails) {
    return (
      <div
        id="class-no-official-plan-banner"
        className={cn(
          'flex items-center gap-3 rounded-2xl border border-dashed border-border/90 bg-card/60 px-4 py-3 text-xs text-muted-foreground',
          className
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <BookOpen className="h-4 w-4 stroke-[2.2]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            {t('evaluations.noOfficialPlan')}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t('evaluations.noOfficialPlanHint')}
          </p>
        </div>
      </div>
    );
  }

  const isCollege = planDetails.cycle === 'college';
  const cycleColor = isCollege
    ? 'border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-300'
    : 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300';

  const cycleIcon = isCollege ? (
    <School className="h-3.5 w-3.5 stroke-[2.2]" aria-hidden />
  ) : (
    <GraduationCap className="h-3.5 w-3.5 stroke-[2.2]" aria-hidden />
  );

  const officialExams = planDetails.examens && planDetails.examens.length > 0 ? planDetails.examens : [];
  const s1Cloture = planDetails.s1MassarCloture;
  const s2Cloture = planDetails.s2MassarCloture;

  return (
    <article
      id={`official-plan-card-${planDetails.planId ?? 'default'}`}
      aria-labelledby={`official-plan-title-${planDetails.planId ?? 'default'}`}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-3.5 sm:p-4 shadow-xs backdrop-blur-xs transition-all duration-200 hover:shadow-md',
        className
      )}
    >
      {/* Top Bar: Cycle, Level, Branch and Subject */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Cycle Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold tracking-tight shadow-2xs',
              cycleColor
            )}
          >
            {cycleIcon}
            <span>{isCollege ? (isArabic ? 'السلك الإعدادي' : 'Collège') : (isArabic ? 'السلك التأهيلي' : 'Lycée qualifiant')}</span>
          </span>

          {/* Canonical Class / Level */}
          {planDetails.classe && (
            <span className="inline-flex items-center rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-2xs">
              {planDetails.classe}
            </span>
          )}

          {/* Branch / Track */}
          {planDetails.branche && (
            <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-2xs">
              {isArabic && planDetails.filiereAr ? planDetails.filiereAr : planDetails.branche}
            </span>
          )}
        </div>

        {/* Volume & Coefficient */}
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          {planDetails.volumeHoraire && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5" title="Volume horaire hebdomadaire">
              <Clock className="h-3 w-3 text-muted-foreground" aria-hidden />
              <span>{planDetails.volumeHoraire}</span>
            </span>
          )}
          {planDetails.coefficient !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 font-semibold text-foreground" title="Coefficient">
              <span>Coeff. {planDetails.coefficient}</span>
            </span>
          )}
        </div>
      </div>

      {/* Official Exams & Deadlines row */}
      {(officialExams.length > 0 || s1Cloture || s2Cloture) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          {officialExams.map((exam) => (
            <div
              key={exam.type + exam.libelle}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/5 px-2.5 py-1 text-rose-800 dark:text-rose-300 shadow-2xs"
            >
              <AwardIcon className="h-3.5 w-3.5 stroke-[2.2] text-rose-600 dark:text-rose-400" aria-hidden />
              <span className="font-bold">{exam.libelle} :</span>
              <span>{exam.dateDebut}{exam.dateFin && exam.dateFin !== exam.dateDebut ? ` au ${exam.dateFin}` : ''}</span>
              {exam.sessionRattrapage && (
                <span className="text-[10px] text-muted-foreground">
                  (Rattrapage : {exam.sessionRattrapage})
                </span>
              )}
            </div>
          ))}

          {/* Massar Deadlines */}
          {(s1Cloture || s2Cloture) && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              <span>
                {isArabic ? 'مسك النقط مسار :' : 'Arrêt Massar :'}
              </span>
              {s1Cloture && <span className="font-medium text-foreground">S1 ({s1Cloture})</span>}
              {s1Cloture && s2Cloture && <span>·</span>}
              {s2Cloture && <span className="font-medium text-foreground">S2 ({s2Cloture})</span>}
            </div>
          )}
        </div>
      )}
    </article>
  );
};
