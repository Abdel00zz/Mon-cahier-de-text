import React from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import './header.css';

/**
 * Retour Web dans l'en-tête uniquement. Android utilise sa navigation native.
 */
export const EditorBackButton: React.FC<{ onBack: () => void; className?: string }> = ({ onBack, className = '' }) => {
    const { locale } = useLocale();
    const { impact } = useHapticFeedback();
    const label = locale === 'ar'
        ? 'الرجوع إلى الأقسام'
        : locale === 'en'
            ? 'Back to classes'
            : 'Retour aux classes';

    // Native navigation is available before the async runtime sets HTML flags.
    if (Capacitor.getPlatform() === 'android') return null;

    return (
        <button
            type="button"
            onClick={() => { impact('light'); onBack(); }}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            className={`editor-back-button shrink-0 ${className}`.trim()}
            title={label}
            aria-label={label}
        >
            <ArrowLeft className="editor-back-button__arrow" size={22} strokeWidth={1.75} aria-hidden="true" />
        </button>
    );
};
