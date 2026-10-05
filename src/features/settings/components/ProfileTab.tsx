import React, { useState } from 'react';
import type { AppConfig, Cycle } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { Input } from '@/components/ui/input';
import { getProvincesForAcademy, MOROCCO_EDUCATION_ACADEMIES } from '@/domain/classes/moroccoEducation';
import { SUBJECTS, formatLocalizedSubjectDisplayName } from '@/constants';
import { School, GraduationCap, FlaskConical } from '@/components/ui/icons';
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

/** Profil : identité (nom, matières) puis établissement (cycles, école, académie, direction). */
export const ProfileTab: React.FC<ProfileTabProps> = ({ config, onDraft, onToggleSubject, onToggleCycle }) => {
  const { locale, t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const selectedSubjects = config.selectedSubjects ?? [];
  const selectedCycles = config.selectedCycles ?? [];
  const selectedAcademy = config.academyRegion ?? '';
  const provinces = getProvincesForAcademy(selectedAcademy);

  return (
    <SettingsPanel title={t('settings.item.profile')}>
      <SettingsSection title={t('settings.group.profile')}>
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

        <SettingsRow stacked label={t('settings.subjects')} hint={t('settings.subjectsHint')}>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.slice(0, expanded ? SUBJECTS.length : VISIBLE_SUBJECTS).map(subject => {
              const active = selectedSubjects.includes(subject);
              return (
                <button
                  key={subject}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleSubject(subject)}
                  className={settingsChoiceClass(active)}
                >
                  {formatLocalizedSubjectDisplayName(subject, locale)}
                </button>
              );
            })}
            {SUBJECTS.length > VISIBLE_SUBJECTS && (
              <button
                type="button"
                onClick={() => setExpanded(value => !value)}
                className="min-h-11 cursor-pointer rounded-lg px-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {expanded ? t('settings.subjectsSeeLess') : t('settings.subjectsSeeMore')}
              </button>
            )}
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t('settings.group.school')}>
        <SettingsRow stacked label={t('settings.cycle')}>
          <div className="flex flex-wrap gap-2">
            {CYCLES.map(({ key, icon: Icon }) => {
              const active = selectedCycles.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleCycle(key)}
                  className={settingsChoiceClass(active)}
                >
                  <Icon className="h-[18px] w-[18px] stroke-[1.5]" />
                  {t(`settings.cycle.${key}`)}
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

        <SettingsRow stacked label={t('settings.academyRegion')} htmlFor="settings-academy" hint={t('settings.academyHint')}>
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
      </SettingsSection>
    </SettingsPanel>
  );
};
