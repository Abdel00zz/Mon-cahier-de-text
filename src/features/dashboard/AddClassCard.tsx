import { memo } from 'react';
import { Plus } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { classTitleStyle } from '@/constants/classTitleTypography';
import { useCardSurface } from './hooks/useCardSurface';
import './addClassCard.css';

export const AddClassCard = memo(({ onCreate, variant = 'card' }: {
    onCreate: () => void;
    variant?: 'card' | 'row';
}) => {
    const { t, isRtl } = useLocale();
    const { impact } = useHapticFeedback();
    const { surfaceRef, rippleRef, surfaceHandlers } = useCardSurface();

    return (
        <div className="dashboard-class-slot"><article
            ref={surfaceRef}
            {...surfaceHandlers}
            className="class-card class-card--create"
            dir={isRtl ? 'rtl' : 'ltr'}
            data-variant={variant}
        >
            <button
                type="button"
                className="class-card__open"
                aria-label={t('dashboard.addClass')}
                aria-haspopup="dialog"
                onClick={() => { impact('light'); onCreate(); }}
            />
            <span className="class-card__sheet" aria-hidden="true" />
            <span className="class-card__feedback" aria-hidden="true"><span ref={rippleRef} className="class-card__ripple" /></span>
            <div className="class-create-card__content" aria-hidden="true">
                <span className="class-create-card__plus">
                    <Plus size={25} strokeWidth={2.3} aria-hidden="true" />
                </span>
                <span className="class-create-card__label" style={classTitleStyle(isRtl)}>
                    {t('dashboard.addClass')}
                </span>
            </div>
        </article></div>
    );
});

AddClassCard.displayName = 'AddClassCard';
