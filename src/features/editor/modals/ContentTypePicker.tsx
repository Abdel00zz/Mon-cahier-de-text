import React from 'react';
import { AwardIcon, Book, CalendarCheck, CheckCheck, CircleAlert, Clock, FileSignature, FileText, GraduationCap, GripHorizontal, Home, ListChecks, ListTree, Network, Users } from '@/components/ui/icons';
import { ClipboardCheck, Presentation } from 'lucide-react';

type IconType = React.ComponentType<{ className?: string }>;

interface CategoryCardProps {
  icon: IconType;
  label: string;
  description?: string;
  colorClass: string;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  icon: Icon,
  label,
  description,
  colorClass,
  onClick,
  disabled = false,
  tooltip,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`content-category group relative flex min-h-[56px] select-none items-center gap-3.5 rounded-2xl border p-3.5 text-start transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
        disabled
          ? 'bg-muted/40 border-border/40 opacity-45 cursor-not-allowed'
          : 'bg-background hover:bg-muted/50 border-border/80 hover:border-primary/40 active:scale-[0.97] cursor-pointer shadow-2xs hover:shadow-xs'
      }`}
      data-layout="tile"
      title={disabled ? tooltip : undefined}
    >
      <div className={`content-category__icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-2 transition-transform duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-105 ${disabled ? 'bg-muted text-muted-foreground' : `${colorClass} bg-muted/80 shadow-2xs`}`}>
        <Icon className="h-5 w-5 stroke-[2.2]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-xs text-foreground leading-snug">{label}</div>
        {description && (
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">{description}</div>
        )}
        {disabled && tooltip && (
          <div className="text-[10px] text-rose-500 font-medium mt-1 leading-tight flex items-center gap-1">
            <CircleAlert className="h-3 w-3 shrink-0 stroke-[2.2]" />
            <span className="truncate">{tooltip}</span>
          </div>
        )}
      </div>
    </button>
  );
};

export interface ContentTypePickerProps {
  t: (key: string) => string;
  tc: (key: string) => string;
  typeName: (type: string) => string;
  offered: (type: string) => boolean;
  canAddSection: boolean;
  canAddSubsection: boolean;
  canAddSubsubsection: boolean;
  canAddItem: boolean;
  onSelect: (type: string) => void;
}

export const ContentTypePicker: React.FC<ContentTypePickerProps> = ({
  t, tc, typeName, offered, canAddSection, canAddSubsection, canAddSubsubsection, canAddItem, onSelect,
}) => (
        <div className="space-y-5 py-1 pe-1 pb-6 sm:pb-8">
          {/* Group 1: Cours & Structures */}
          <div className="space-y-2.5">
            <h3 className="ps-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('addContent.groupStructures')}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <CategoryCard
                icon={Book}
                label={tc('manageLessons.type.chapter')}

                colorClass="text-indigo-600 dark:text-indigo-400"
                onClick={() => onSelect('chapter')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.section')}

                colorClass="text-violet-600 dark:text-violet-400"
                onClick={() => onSelect('section')}
                disabled={!canAddSection}
                tooltip={t('addContent.sectionTooltip')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.subsection')}

                colorClass="text-cyan-600 dark:text-cyan-400"
                onClick={() => onSelect('subsection')}
                disabled={!canAddSubsection}
                tooltip={t('addContent.subsectionTooltip')}
              />
              <CategoryCard
                icon={Network}
                label={t('addContent.subsubsection')}

                colorClass="text-teal-600 dark:text-teal-400"
                onClick={() => onSelect('subsubsection')}
                disabled={!canAddSubsubsection}
                tooltip={t('addContent.subsubsectionTooltip')}
              />
              <CategoryCard
                icon={ListTree}
                label={t('addContent.item')}

                colorClass="text-blue-600 dark:text-blue-400"
                onClick={() => onSelect('item')}
                disabled={!canAddItem}
                tooltip={t('addContent.itemTooltip')}
              />
            </div>
          </div>

          {/* Group 2: Rédaction libre — un contenu hors plan, jamais un niveau de structure */}
          <div className="space-y-2.5">
            <h3 className="ps-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('addContent.groupFree')}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <CategoryCard icon={GripHorizontal} label={t('addContent.free')} description={t('addContent.freeHelp')}
                colorClass="text-slate-600 dark:text-slate-400" onClick={() => onSelect('free')} />
            </div>
          </div>

          {/*
           * LES ÉPREUVES ET LEURS CORRECTIONS se créent ici : elles traversent
           * l'année et ne dépendent d'AUCUN chapitre — le bloc se pose à sa
           * date, jamais dans un plan de cours. Le tableau les CAPTE et la
           * feuille « Contrôle continu et activités » les reçoit alors : bloc
           * daté pour les épreuves écrites et l'oral, activité pour le
           * diagnostic, date de correction pour le devoir maison — contrat
           * dans docs/architecture/workflow-evaluations.md.
           * Le devoir à la maison, lui, ne se crée pas ici : il s'énonce dans
           * la REMARQUE de sa séance d'attribution, et la feuille le reçoit.
           */}

          {/* Group 3: Évaluations & Devoirs */}
          <div className="space-y-2.5">
            <h3 className="ps-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('addContent.groupAssessments')}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <CategoryCard
                icon={ListChecks}
                label={tc('manageLessons.type.evaluation_diagnostic')}
                colorClass="text-blue-600 dark:text-blue-400"
                onClick={() => onSelect('evaluation_diagnostic')}
              />
              <CategoryCard
                icon={CalendarCheck}
                label={tc('manageLessons.type.controle_continu')}
                colorClass="text-blue-600 dark:text-blue-400"
                onClick={() => onSelect('controle_continu')}
              />
              <CategoryCard
                icon={Clock}
                label={tc('manageLessons.type.controle_court')}
                colorClass="text-violet-600 dark:text-violet-400"
                onClick={() => onSelect('controle_court')}
              />
              <CategoryCard
                icon={FileText}
                label={tc('manageLessons.type.controle_global')}
                colorClass="text-emerald-600 dark:text-emerald-400"
                onClick={() => onSelect('controle_global')}
              />
              <CategoryCard
                icon={Home}
                label={typeName('devoir_maison')}
                description={t('addContent.homeworkHelp')}
                colorClass="text-teal-600 dark:text-teal-400"
                onClick={() => onSelect('devoir_maison')}
              />
              <CategoryCard
                icon={Users}
                label={tc('manageLessons.type.oral')}
                colorClass="text-pink-600 dark:text-pink-400"
                onClick={() => onSelect('oral')}
              />
              {offered('colle') && (
                <CategoryCard
                  icon={Presentation}
                  label={tc('manageLessons.type.colle')}
                  colorClass="text-rose-600 dark:text-rose-400"
                  onClick={() => onSelect('colle')}
                />
              )}
              {offered('examen_blanc') && (
                <CategoryCard
                  icon={FileSignature}
                  label={tc('manageLessons.type.examen_blanc')}
                  colorClass="text-rose-600 dark:text-rose-400"
                  onClick={() => onSelect('examen_blanc')}
                />
              )}
              {offered('olympiade') && (
                <CategoryCard
                  icon={AwardIcon}
                  label={tc('manageLessons.type.olympiade')}
                  colorClass="text-amber-600 dark:text-amber-400"
                  onClick={() => onSelect('olympiade')}
                />
              )}
              <CategoryCard
                icon={GraduationCap}
                label={tc('manageLessons.type.concours')}
                colorClass="text-violet-600 dark:text-violet-400"
                onClick={() => onSelect('concours')}
              />
            </div>
          </div>

          {/* Group 4: Corrections */}
          <div className="space-y-2.5">
            <h3 className="ps-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('addContent.groupCorrections')}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <CategoryCard
                icon={CheckCheck}
                label={tc('manageLessons.type.correction_devoir_maison')}
                colorClass="text-emerald-700 dark:text-emerald-400"
                onClick={() => onSelect('correction_devoir_maison')}
              />
              <CategoryCard
                icon={ClipboardCheck}
                label={tc('manageLessons.type.correction_controle_continu')}
                colorClass="text-slate-600 dark:text-slate-400"
                onClick={() => onSelect('correction_controle_continu')}
              />
            </div>
          </div>
        </div>
);
