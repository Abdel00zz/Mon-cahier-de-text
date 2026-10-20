import React, { useState } from 'react';
import type { AppConfig, Cycle } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { Input } from '@/components/ui/input';
import { getProvincesForAcademy, MOROCCO_EDUCATION_ACADEMIES } from '@/domain/classes/moroccoEducation';
import { SUBJECTS, formatLocalizedSubjectDisplayName } from '@/constants';
import { User, School, GraduationCap, FlaskConical, Check, ChevronDown, ChevronUp } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { SettingsPanel, SettingsRow, SettingsSection, settingsChoiceClass, settingsFieldClass } from './SettingsPrimitives';

const CYCLES: { key: Cycle; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'college', icon: School },
  { key: 'lycee', icon: GraduationCap },
  { key: 'prepa', icon: FlaskConical },
];

const VISIBLE_SUBJECTS = 6;

interface ProfileTabProps {
  /** Configuration enregistrée + brouillon : ce que l'enseignant voit. */
  config: AppConfig;
  onDraft: (patch: Partial<AppConfig>) => void;
  onToggleSubject: (subject: string) => void;
  onToggleCycle: (cycle: Cycle) => void;
}

/** Profil : identité professionnelle (nom, matières) puis établissement (cycles, école, académie, direction). */
export const ProfileTab: React.FC<ProfileTabProps> = ({ config, onDraft, onToggleSubject, onToggleCycle }) => {
  const { locale, t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const selectedSubjects = config.selectedSubjects ?? [];
  const selectedCycles = config.selectedCycles ?? [];
  const selectedAcademy = config.academyRegion ?? '';
  const provinces = getProvincesForAcademy(selectedAcademy);

  return (
    <SettingsPanel title={t('settings.item.profile')}>
      {/* Carte 1 : معلومات شخصية */}
      <SettingsSection title={t('settings.group.profile')} icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <SettingsRow stacked label={t('settings.teacherName')} htmlFor="settings-teacher-name">
            <Input
              id="settings-teacher-name"
              type="text"
              value={config.defaultTeacherName || ''}
              onChange={event => onDraft({ defaultTeacherName: event.target.value })}
              placeholder={t('settings.teacherPlaceholder')}
              className={settingsFieldClass}
            />
          </SettingsRow>

          <SettingsRow stacked label={t('settings.phone')} htmlFor="settings-teacher-phone">
            <Input
              id="settings-teacher-phone"
              type="tel"
              autoComplete="tel"
              maxLength={64}
              dir="ltr"
              value={config.teacherPhone || ''}
              onChange={event => onDraft({ teacherPhone: event.target.value })}
              placeholder={t('settings.phonePlaceholder')}
              className={settingsFieldClass}
            />
          </SettingsRow>
        </div>

        <SettingsRow
          stacked
          colon={false}
          label={
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {t('settings.subjects')} :
              </span>
              {SUBJECTS.length > VISIBLE_SUBJECTS && (
                <button
                  type="button"
                  onClick={() => setExpanded(value => !value)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span>{expanded ? t('settings.subjectsSeeLess') : t('settings.subjectsSeeMore')}</span>
                  {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>
              )}
            </div>
          }
        >
          <div className="flex flex-wrap gap-2 pt-0.5">
            {SUBJECTS.slice(0, expanded ? SUBJECTS.length : VISIBLE_SUBJECTS).map(subject => {
              const active = selectedSubjects.includes(subject);
              return (
                <button
                  key={subject}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleSubject(subject)}
                  className={cn(
                    settingsChoiceClass(active),
                    'min-h-10 text-xs sm:text-sm py-2 px-3.5 rounded-xl border transition-all'
                  )}
                >
                  {active && <Check className="size-3.5 stroke-[2.5] text-primary" />}
                  <span>{formatLocalizedSubjectDisplayName(subject, locale)}</span>
                </button>
              );
            })}
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Carte 2 : المؤسسة والتأطير الإداري */}
      <SettingsSection title={t('settings.group.school')} icon={School}>
        <SettingsRow stacked label={t('settings.cycle')}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
            {CYCLES.map(({ key, icon: Icon }) => {
              const active = selectedCycles.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleCycle(key)}
                  className={cn(
                    settingsChoiceClass(active),
                    'h-12 w-full justify-start sm:justify-center px-4 rounded-xl transition-all'
                  )}
                >
                  <Icon className="size-4.5 stroke-[1.75] shrink-0" />
                  <span className="font-medium text-sm">{t(`settings.cycle.${key}`)}</span>
                  {active && <Check className="size-4 stroke-[2.5] ms-auto sm:ms-1.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </SettingsRow>

        <SettingsRow stacked label={t('settings.school')} htmlFor="settings-school">
          <Input
            id="settings-school"
            type="text"
            value={config.establishmentName || ''}
            onChange={event => onDraft({ establishmentName: event.target.value })}
            placeholder={t('settings.schoolPlaceholder')}
            className={settingsFieldClass}
          />
        </SettingsRow>

        {/* Cadre administratif : académie et province dans une grille 2 colonnes harmonieuse */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <SettingsRow stacked label={t('settings.academyRegion')} htmlFor="settings-academy">
            <select
              id="settings-academy"
              value={selectedAcademy}
              onChange={event => onDraft({ academyRegion: event.target.value, educationProvince: '' })}
              className={`${settingsFieldClass} cursor-pointer`}
            >
              <option value="">{t('settings.chooseAcademy')}</option>
              {MOROCCO_EDUCATION_ACADEMIES.map(academy => (
                <option key={academy.id} value={academy.id}>
                  {locale === 'ar' ? academy.arabicLabel : academy.label}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow stacked label={t('settings.educationProvince')} htmlFor="settings-province">
            <select
              id="settings-province"
              value={config.educationProvince ?? ''}
              disabled={!selectedAcademy || provinces.length === 0}
              onChange={event => onDraft({ educationProvince: event.target.value })}
              className={`${settingsFieldClass} cursor-pointer`}
            >
              <option value="">{selectedAcademy ? t('settings.chooseProvince') : t('settings.chooseAcademyFirst')}</option>
              {provinces.map(province => (
                <option key={province.id} value={province.id}>
                  {locale === 'ar' ? province.arabicLabel : province.label}
                  {province.kind === 'prefecture' ? ` · ${t('settings.prefecture')}` : ''}
                </option>
              ))}
            </select>
          </SettingsRow>
        </div>
      </SettingsSection>
    </SettingsPanel>
  );
};
