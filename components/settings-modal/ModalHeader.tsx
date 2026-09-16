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
    <div className="relative shrink-0 border-b border-border/60 bg-transparent px-5 sm:px-7 py-3 sm:py-3.5">
      {/* Sketch Drag Handle on Mobile */}
      <div className="flex justify-center pb-2 sm:hidden" aria-hidden="true">
        <span className="h-1 w-9 rounded-full bg-muted-foreground/30 transition-colors" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 text-start">
          <h2 className="text-[16px] sm:text-[18px] font-semibold text-foreground tracking-[-0.015em] flex items-center gap-2">
            <span>{current.title}</span>
            <span className="text-xs font-normal text-muted-foreground/75 hidden xs:inline">({current.titleAr})</span>
          </h2>
          <p className="text-xs sm:text-[13px] text-muted-foreground line-clamp-1 mt-0.5">
            {current.subtitle}
          </p>
        </div>

        {/* Close Button - Sketch circular pill */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la modale"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
        >
          <X className="h-4 w-4 stroke-[2]" />
        </button>
      </div>
    </div>
  );
};
