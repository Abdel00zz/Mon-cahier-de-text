import React, { useState } from 'react';
import { Plus, Clock, MapPin, BookOpen, Trash2 } from 'lucide-react';
import type { ScheduleItem } from '../types';

interface TimetableTabProps {
  scheduleItems?: ScheduleItem[];
  onUpdateSchedule?: (items: ScheduleItem[]) => void;
}

const WEEKDAYS = [
  { id: 1, fr: 'Lun', ar: 'إثنين' },
  { id: 2, fr: 'Mar', ar: 'ثلاثاء' },
  { id: 3, fr: 'Mer', ar: 'أربعاء' },
  { id: 4, fr: 'Jeu', ar: 'خميس' },
  { id: 5, fr: 'Ven', ar: 'جمعة' },
  { id: 6, fr: 'Sam', ar: 'سبت' },
];

const DEFAULT_SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: 'slot-1',
    timeRange: '08:30 - 10:30',
    classGroup: '2 Bac SM - G1',
    subject: 'Mathématiques',
    room: 'Salle 12',
    duration: '2h',
    colorTheme: 'ochre',
  },
  {
    id: 'slot-2',
    timeRange: '10:45 - 12:45',
    classGroup: '1 Bac SE - G2',
    subject: 'Mathématiques',
    room: 'Salle 14',
    duration: '2h',
    colorTheme: 'terracotta',
  },
  {
    id: 'slot-3',
    timeRange: '14:30 - 16:30',
    classGroup: '3AC - G1',
    subject: 'Mathématiques',
    room: 'Labo 2',
    duration: '2h',
    colorTheme: 'indigo',
  },
];

const THEME_STYLES: Record<ScheduleItem['colorTheme'], { badge: string; border: string; accent: string }> = {
  ochre: {
    badge: 'bg-ochre-500/15 text-ochre-600 dark:text-amber-400 border-ochre-500/30',
    border: 'border-l-4 border-l-ochre-500',
    accent: 'text-ochre-600 dark:text-amber-400',
  },
  terracotta: {
    badge: 'bg-terracotta-500/15 text-terracotta-600 dark:text-orange-400 border-terracotta-500/30',
    border: 'border-l-4 border-l-terracotta-500',
    accent: 'text-terracotta-600 dark:text-orange-400',
  },
  indigo: {
    badge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    border: 'border-l-4 border-l-indigo-500',
    accent: 'text-indigo-600 dark:text-indigo-400',
  },
};

export const TimetableTab: React.FC<TimetableTabProps> = ({
  scheduleItems = DEFAULT_SCHEDULE_ITEMS,
  onUpdateSchedule,
}) => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [items, setItems] = useState<ScheduleItem[]>(scheduleItems);

  const handleAddItem = () => {
    const nextId = `slot-${Date.now()}`;
    const themes: ScheduleItem['colorTheme'][] = ['ochre', 'terracotta', 'indigo'];
    const newSlot: ScheduleItem = {
      id: nextId,
      timeRange: '16:45 - 18:45',
      classGroup: 'Nouvelle séance',
      subject: 'Séance d’appui',
      room: 'Salle 10',
      duration: '2h',
      colorTheme: themes[items.length % themes.length],
    };
    const updated = [...items, newSlot];
    setItems(updated);
    onUpdateSchedule?.(updated);
  };

  const handleRemoveItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    onUpdateSchedule?.(updated);
  };

  return (
    <div className="space-y-4">
      {/* Day Selector Chips */}
      <div>
        <label className="block text-xs font-bold text-espresso-900 dark:text-foreground mb-2">
          Jour de la semaine / يوم الأسبوع
        </label>
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {WEEKDAYS.map(day => {
            const isSelected = selectedDay === day.id;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDay(day.id)}
                className={`touch-target flex flex-col items-center justify-center rounded-xl p-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-terracotta-500 text-white shadow-xs dark:bg-primary dark:text-primary-foreground'
                    : 'bg-cream-200/70 text-espresso-800 hover:bg-cream-300/70 dark:bg-muted dark:text-muted-foreground'
                }`}
              >
                <span className="text-[11px] leading-tight">{day.fr}</span>
                <span className="text-[9px] opacity-75 leading-tight">{day.ar}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule Slot Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-espresso-800 dark:text-muted-foreground uppercase tracking-wider">
            Séances du jour ({items.length})
          </span>
          <button
            type="button"
            onClick={handleAddItem}
            className="touch-target inline-flex items-center gap-1 text-xs font-bold text-terracotta-600 hover:text-terracotta-700 dark:text-primary active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ajouter une séance</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cream-400 dark:border-border p-6 text-center text-xs text-muted-foreground">
            Aucun créneau configuré pour cette journée.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(slot => {
              const theme = THEME_STYLES[slot.colorTheme] || THEME_STYLES.ochre;
              return (
                <div
                  key={slot.id}
                  className={`relative flex items-center justify-between gap-3 rounded-xl border border-cream-300 dark:border-border/80 bg-cream-50 dark:bg-card p-3 shadow-2xs transition-all hover:bg-cream-100 dark:hover:bg-accent/40 ${theme.border}`}
                >
                  <div className="min-w-0 flex-1 space-y-1 text-start">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-espresso-900 dark:text-foreground">
                        {slot.classGroup}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${theme.badge}`}
                      >
                        <Clock className="h-2.5 w-2.5" />
                        {slot.timeRange}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-espresso-800/70 dark:text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3 w-3 opacity-60" />
                        {slot.subject}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 opacity-60" />
                        {slot.room}
                      </span>
                      <span className="font-mono text-[10px] font-medium opacity-80">
                        ({slot.duration})
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(slot.id)}
                    aria-label="Supprimer le créneau"
                    className="touch-target inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
