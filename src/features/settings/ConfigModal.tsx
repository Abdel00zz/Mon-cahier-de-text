import React, { useState, useEffect, useCallback } from 'react';
import './settingsModal.css';
import { cn } from '@/lib/utils';
import { AppConfig, ClassInfo, Cycle } from '@/types';
import { useLocale } from '@/i18n/LocaleProvider';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Save, Undo2, ChevronLeft } from '@/components/ui/icons';
import { SETTINGS_SECTIONS, consumeSettingsTarget, type SettingsCategory } from './settingsSections';
import { SettingsContent, preloadSettingsSection } from './SettingsContent';
import { useSettingsProfile } from './useSettingsProfile';

interface ConfigModalProps {
  isOpen?: boolean;
  initialSection?: 'emploi' | 'notifications';
  scheduleClassId?: string;
  onClose: () => void;
  onOpenGuide: () => void;
  mobileNavigation?: React.ReactNode;
  config: AppConfig;
  onConfigChange: (newConfig: Partial<AppConfig>) => void;
  onExportPlatform: () => void;
  onOpenImport: () => void;
  classes?: ClassInfo[];
  onCreateClass?: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen = true,
  onClose,
  onOpenGuide,
  mobileNavigation,
  config,
  onConfigChange,
  onExportPlatform,
  onOpenImport,
  classes = [],
  onCreateClass,
  initialSection,
  scheduleClassId,
}) => {
  const { t } = useLocale();
  const profile = useSettingsProfile(config, onConfigChange);
  const [pendingExit, setPendingExit] = useState<'close' | 'guide' | null>(null);
  const finishExit = (destination: 'close' | 'guide') => {
    profile.reset();
    setPendingExit(null);
    if (destination === 'guide') onOpenGuide(); else onClose();
  };
  const requestExit = (destination: 'close' | 'guide' = 'close') => {
    if (profile.hasChanges) setPendingExit(destination); else finishExit(destination);
  };
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialSection ?? 'emploi');
  // Téléphone et tablette : l'accueil est une grille de cartes, une rubrique s'ouvre en plein cadre.
  // Sur grand écran (lg), le menu latéral reste affiché et cet état n'a aucun effet visuel.
  const [sectionOpen, setSectionOpen] = useState(Boolean(initialSection));
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const inSection = sectionOpen && !isDesktop;
  const openSection = useCallback((id: SettingsCategory) => { setActiveCategory(id); setSectionOpen(true); }, []);

  useEffect(() => {
    if (initialSection) {
      setActiveCategory(initialSection);
      setSectionOpen(true);
    }
  }, [initialSection]);

  useEffect(() => { if (!isOpen) profile.reset(); }, [isOpen, profile.reset]);
  useEffect(() => {
    const requested = consumeSettingsTarget();
    if (requested) openSection(requested);
  }, [openSection]);

  // Téléphone et tablette : Échap / retour Android revient d'abord à la grille de cartes, puis ferme.
  // Un menu, un sélecteur ou une fenêtre ouverte par-dessus garde la main sur sa propre touche.
  useEffect(() => {
    if (!isOpen || !sectionOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isDesktop) return;
      if (document.querySelector('[role="listbox"], [role="menu"]')) return;
      if (document.querySelectorAll('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]').length > 1) return;
      event.preventDefault();
      event.stopPropagation();
      setSectionOpen(false);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, sectionOpen, isDesktop]);

  const footer = (
    <div className="grid w-full grid-cols-2 gap-2.5">
      <Button variant="secondary" onClick={profile.reset}
        className="h-auto min-h-11 whitespace-normal rounded-xl px-3 py-2 text-sm">
        <Undo2 aria-hidden className="shrink-0" />
        <span>{t('settings.resetDraft')}</span>
      </Button>
      <Button onClick={profile.save} className="h-auto min-h-11 whitespace-normal rounded-xl px-3 py-2 text-sm">
        <Save aria-hidden className="shrink-0" />
        <span>{t('settings.saveProfile')}</span>
      </Button>
    </div>
  );


  const settingsShell = (
    <div data-settings-ui className="settings-shell rtl-config-split">
      {/* Téléphone et tablette : de grandes cartes, pas d'onglets. */}
      <div className={cn('settings-home lg:hidden', sectionOpen && 'hidden')}>
        <ul className="hub-grid" aria-label={t('settings.title')}>
          {SETTINGS_SECTIONS.map(item => {
            const Icon = item.icon;
            return (
              <li key={item.id} className="contents">
                <button
                  type="button"
                  data-tone={item.tone}
                  onClick={() => openSection(item.id)}
                  onPointerEnter={() => preloadSettingsSection(item.id)}
                  onFocus={() => preloadSettingsSection(item.id)}
                  className="hub-card"
                >
                  <span className="hub-card__icon" aria-hidden="true"><Icon /></span>
                  <span className="hub-card__body">
                    <span className="hub-card__title line-clamp-2">{t(item.titleKey)}</span>
                    <span className="hub-card__hint line-clamp-2">{t(item.hintKey)}</span>
                  </span>
                </button>
              </li>
            );
          })}
          <li className="contents">
            <button type="button" data-tone={"teal"} onClick={() => requestExit('guide')} className="hub-card">
              <span className="hub-card__icon" aria-hidden="true"><BookOpen /></span>
              <span className="hub-card__body">
                <span className="hub-card__title line-clamp-2">{t('settings.item.support')}</span>
                <span className="hub-card__hint line-clamp-2">{t('settings.card.support')}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>

      <nav aria-label={t('settings.title')} className="settings-nav hidden lg:flex">
        <ul className="space-y-0.5">
          {SETTINGS_SECTIONS.map(item => {
            const active = activeCategory === item.id;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setActiveCategory(item.id)}
                  onPointerEnter={() => preloadSettingsSection(item.id)}
                  onFocus={() => preloadSettingsSection(item.id)}
                  className="settings-nav__link"
                >
                  <Icon aria-hidden />
                  <span>{t(item.titleKey)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="settings-nav-footer mt-auto">
          <button type="button" onClick={() => requestExit('guide')} className="settings-nav__link">
            <BookOpen aria-hidden />
            <span>{t('settings.item.support')}</span>
          </button>
        </div>
      </nav>

      <div className={cn('settings-scroll modern-scrollbar', !sectionOpen && 'max-lg:hidden')}>
        <section
          key={activeCategory}
          aria-label={t(SETTINGS_SECTIONS.find(item => item.id === activeCategory)!.titleKey)}
          className="settings-page-content"
        >
          <SettingsContent category={activeCategory} config={config} classes={classes} profile={profile}
            onChange={onConfigChange} onCreateClass={onCreateClass} scheduleClassId={scheduleClassId}
            onExport={onExportPlatform} onImport={onOpenImport} />
        </section>
      </div>
    </div>
  );


  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={() => requestExit()}
      title={inSection ? (
        <span className="hub-titlebar">
          <button type="button" onClick={() => setSectionOpen(false)} className="hub-back" aria-label={t('settings.back')}>
            <ChevronLeft aria-hidden className="hub-back__chevron" />
          </button>
          <span className="min-w-0 truncate">{t(SETTINGS_SECTIONS.find(item => item.id === activeCategory)!.titleKey)}</span>
        </span>
      ) : <span className="hub-titlebar" data-codex-title>{t('settings.title')}</span>}
      maxWidth="lg"
      mobilePresentation="dialog"
      hideClose
      className="hub-modal settings-modal-frame settings-modal-sheet liquid-modal overflow-hidden"
      headerClassName="hub-modal-header"
      bodyClassName="hub-modal-body settings-modal-body"
      footer={profile.hasChanges ? footer : undefined}
      bottomNavigation={mobileNavigation}
    >
      {settingsShell}
    </Modal>
    <ConfirmDialog
      open={pendingExit !== null}
      onOpenChange={open => { if (!open) setPendingExit(null); }}
      title={t('settings.discardProfileTitle')}
      description={t('settings.discardProfileDescription')}
      confirmLabel={t('settings.discardProfile')}
      cancelLabel={t('settings.keepEditing')}
      onConfirm={() => { if (pendingExit) finishExit(pendingExit); }}
      variant="destructive"
    />
    </>
  );
};
