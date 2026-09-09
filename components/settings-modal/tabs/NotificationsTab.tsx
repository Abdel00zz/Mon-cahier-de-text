import React from 'react';
import { Bell, BookOpen, Smartphone } from 'lucide-react';
import type { SettingsData } from '../types';

interface NotificationsTabProps {
  notifications: SettingsData['notifications'];
  onChange: (updatedNotifications: SettingsData['notifications']) => void;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ notifications, onChange }) => {
  const toggle = (key: keyof SettingsData['notifications']) => {
    onChange({
      ...notifications,
      [key]: !notifications[key],
    });
  };

  const ITEMS: {
    key: keyof SettingsData['notifications'];
    title: string;
    titleAr: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      key: 'inApp',
      title: 'Notifications dans l’application',
      titleAr: 'إشعارات داخل التطبيق',
      desc: 'Afficher les bandeaux de rappels pendant la navigation',
      icon: Bell,
    },
    {
      key: 'textbookReminder',
      title: 'Rappels du cahier de textes',
      titleAr: 'تذكير ملء دفتر النصوص',
      desc: 'Alerte automatique après chaque fin de cours si non rempli',
      icon: BookOpen,
    },
    {
      key: 'endClassVibration',
      title: 'Vibration en fin de séance',
      titleAr: 'اهتزاز عند نهاية الحصة',
      desc: 'Signal discret 5 minutes avant la sonnerie pour conclure',
      icon: Smartphone,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-espresso-900 dark:text-foreground mb-1">
        Préférences de notification / تفضيلات التنبيهات
      </div>

      <div className="space-y-2.5">
        {ITEMS.map(item => {
          const isChecked = notifications[item.key];
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              onClick={() => toggle(item.key)}
              className="flex items-center justify-between gap-3 rounded-xl border border-cream-300 dark:border-border bg-cream-50 dark:bg-card p-3 transition-all hover:bg-cream-100 dark:hover:bg-muted/60 cursor-pointer select-none"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cream-200 dark:bg-muted text-espresso-800 dark:text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 text-start">
                  <div className="text-xs font-bold text-espresso-900 dark:text-foreground flex items-center gap-1.5 flex-wrap">
                    <span>{item.title}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">({item.titleAr})</span>
                  </div>
                  <div className="text-[11px] text-espresso-800/70 dark:text-muted-foreground mt-0.5 line-clamp-1">
                    {item.desc}
                  </div>
                </div>
              </div>

              {/* Accessible Custom Switch with 44px touch area */}
              <button
                type="button"
                role="switch"
                aria-checked={isChecked}
                onClick={e => {
                  e.stopPropagation();
                  toggle(item.key);
                }}
                className={`touch-target relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/50 ${
                  isChecked ? 'bg-terracotta-500 dark:bg-primary' : 'bg-cream-300 dark:bg-muted-foreground/30'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isChecked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
