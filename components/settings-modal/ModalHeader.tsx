import React from 'react';
import { X } from 'lucide-react';
import type { SettingsTabType } from './types';

interface ModalHeaderProps {
  activeTab: SettingsTabType;
  onClose: () => void;
}

const TAB_SUBTITLES: Record<SettingsTabType, { title: string; subtitle: string; titleAr: string; subtitleAr: string }> = {
  timetable: {
    title: 'Emploi du temps',
    subtitle: 'Gérez vos créneaux de cours et salles',
    titleAr: 'استعمال الزمن',
    subtitleAr: 'إدارة الحصص الأسبوعية والقاعات',
  },
  profile: {
    title: 'Profil enseignant',
    subtitle: 'Informations personnelles et matières enseignées',
    titleAr: 'الملف الشخصي',
    subtitleAr: 'المعلومات المهنية والمواد المسندة',
  },
  appearance: {
    title: 'Apparence & Thème',
    subtitle: 'Personnalisez le confort visuel et la palette',
    titleAr: 'المظهر والسمة',
    subtitleAr: 'تخصيص الألوان والسمة البصرية',
  },
  notifications: {
    title: 'Alertes & Rappels',
    subtitle: 'Configuration des signaux en classe et cahier',
    titleAr: 'التنبيهات والإشعارات',
    subtitleAr: 'ضبط إشعارات الحصص وتحديث الدفتر',
  },
};

export const ModalHeader: React.FC<ModalHeaderProps> = ({ activeTab, onClose }) => {
  const current = TAB_SUBTITLES[activeTab];

  return (
    <div className="relative shrink-0 border-b border-cream-300/80 dark:border-border/70 bg-cream-100/90 dark:bg-card/90 px-4 pt-3 pb-3 backdrop-blur-md">
      {/* Material 3 Drag Handle */}
      <div className="flex justify-center pb-2 sm:hidden" aria-hidden="true">
        <span className="h-1.5 w-10 rounded-full bg-espresso-800/25 dark:bg-muted-foreground/30 transition-colors" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 text-start">
          <h2 className="text-base font-bold text-espresso-900 dark:text-foreground tracking-tight sm:text-lg flex items-center gap-2">
            <span>{current.title}</span>
            <span className="text-xs font-normal text-muted-foreground/80 hidden xs:inline">({current.titleAr})</span>
          </h2>
          <p className="text-xs text-espresso-800/70 dark:text-muted-foreground line-clamp-1 mt-0.5">
            {current.subtitle}
          </p>
        </div>

        {/* Close Button - 44px thumb target */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la modale"
          className="touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-espresso-800/70 hover:text-espresso-900 hover:bg-cream-200/80 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-muted active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/50"
        >
          <X className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};
