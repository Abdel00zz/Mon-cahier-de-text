import React from 'react';
import type { AppConfig } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { HardDriveDownload, HardDriveUpload } from '@/components/ui/icons';
import { AccountTab } from './AccountTab';
import { SettingsPanel, SettingsRow, SettingsSection, settingsButtonClass } from './SettingsPrimitives';

const ArchivesSection = React.lazy(() => import('./ArchivesSection').then(m => ({ default: m.ArchivesSection })));

interface AccountDataTabProps {
  config: AppConfig;
  onExport: () => void;
  onImport: () => void;
}

/** Compte et données : session et synchronisation, sauvegarde et restauration, archives annuelles. */
export const AccountDataTab: React.FC<AccountDataTabProps> = ({ config, onExport, onImport }) => {
  const { t } = useLocale();
  return (
    <SettingsPanel title={t('settings.item.account')}>
      <AccountTab config={config} />

      <SettingsSection title={t('settings.backupTitle')}>
        <SettingsRow label={t('settings.exportTitle')} hint={t('settings.exportAction')}>
          <button type="button" onClick={onExport} className={settingsButtonClass}>
            <HardDriveDownload className="h-[18px] w-[18px] stroke-[1.5]" />
            <span>{t('settings.exportButton')}</span>
          </button>
        </SettingsRow>
        <SettingsRow label={t('settings.importTitle')} hint={t('settings.importAction')}>
          <button type="button" onClick={onImport} className={settingsButtonClass}>
            <HardDriveUpload className="h-[18px] w-[18px] stroke-[1.5]" />
            <span>{t('settings.importButton')}</span>
          </button>
        </SettingsRow>
      </SettingsSection>

      <React.Suspense fallback={<div className="h-24 w-full rounded-lg skeleton-shimmer" />}>
        <ArchivesSection schoolYearStart={config.schoolYearStart} />
      </React.Suspense>
    </SettingsPanel>
  );
};
