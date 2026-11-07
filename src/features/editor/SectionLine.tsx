import React from 'react';
import { formatDateDDMMYYYY } from '@/domain/notebook/dataUtils';
import { useLocale } from '@/i18n/LocaleProvider';

interface SectionLineProps {
  children: React.ReactNode;
  date?: string;
  remark?: string;
  hasDate: boolean;
  onOpenDate: () => void;
  onOpenRemark?: () => void;
}

/** Section : le titre, puis deux pastilles — date et note — au lieu des colonnes. */
export const SectionLine: React.FC<SectionLineProps> = ({ children, date, remark, hasDate, onOpenDate, onOpenRemark }) => {
  const { t } = useLocale();
  return (
    <div className="editor-section-line min-w-0">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="editor-section-pills">
        <button
          type="button"
          className="editor-section-pill"
          data-empty={hasDate ? undefined : 'true'}
          onClick={event => { event.stopPropagation(); onOpenDate(); }}
          aria-label={t('selection.chooseDate')}
          title={t('selection.chooseDate')}
        >
          {hasDate ? formatDateDDMMYYYY(date ?? '') ?? date : t('editor.date')}
        </button>
        {onOpenRemark && (
          <button
            type="button"
            className="editor-section-pill editor-section-pill--note"
            data-empty={remark ? undefined : 'true'}
            onClick={event => { event.stopPropagation(); onOpenRemark(); }}
            aria-label={t('remark.editTitle')}
            title={remark || t('remark.editTitle')}
          >
            {remark || t('editor.remarkShort')}
          </button>
        )}
      </div>
    </div>
  );
};
