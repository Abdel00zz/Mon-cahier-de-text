import type { PedagogicalEvent } from '@/types';

export interface EventDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: PedagogicalEvent | null;
  title?: string;
  initialDate?: string;
  initialEndDate?: string;
  allowRange?: boolean;
  onSave?: (event: PedagogicalEvent, date: string, endDate?: string) => void;
  onApplyDate?: (date: string, endDate?: string) => void;
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

export const eventDateCopy = (t: Translate) => ({
    title: t('dateModal.title'),
    singleDateMode: t('dateModal.single'),
    rangeMode: t('dateModal.range'),
    clearDate: t('dateModal.clear'),
    cancel: t('common.cancel'),
    apply: t('dateModal.apply'),
    todayBtn: t('dateModal.today'),
    tomorrowBtn: t('dateModal.tomorrow'),
    plusWeekBtn: t('dateModal.plusWeek'),
    plusTwoWeeksBtn: t('dateModal.plusTwoWeeks'),
    endMonthBtn: t('dateModal.endMonth'),
    month: t('dateModal.month'),
  });
