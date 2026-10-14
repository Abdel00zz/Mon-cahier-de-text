import { memo } from 'react';
import { Plus } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { classTitleStyle } from '@/constants/classTitleTypography';
import './addClassCard.css';

export const AddClassCard = memo(({ onCreate, variant = 'card' }: {
    onCreate: () => void;
    variant?: 'card' | 'row';
}) => {
    const { t, isRtl } = useLocale();
    const { impact } = useHapticFeedback();

    return (
        <article className="class-card class-card--create" dir={isRtl ? 'rtl' : 'ltr'} data-variant={variant}>
            <button
                type="button"
                className="class-card__open"
                aria-label={t('dashboard.addClass')}
                aria-haspopup="dialog"
                onClick={() => { impact('light'); onCreate(); }}
            />
            <span className="class-card__sheet" aria-hidden="true" />
            <div className="class-create-card__content" aria-hidden="true">
                <span className="class-create-card__plus"><Plus size={30} strokeWidth={1.6} aria-hidden="true" /></span>
                <span className="class-create-card__label" style={classTitleStyle(isRtl)}>{t('dashboard.addClass')}</span>
            </div>
        </article>
    );
});

AddClassCard.displayName = 'AddClassCard';
