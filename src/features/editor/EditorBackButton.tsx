import React from 'react';
import { ArrowLeft } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import './header.css';

/**
 * Retour aux classes : UN seul bouton, un seul style (`.editor-back-button`),
 * deux emplacements. Il vit dans l'en-tête en haut de page, puis le bandeau
 * collant le reprend tel quel — à CÔTÉ de la barre, jamais dedans — dès que la
 * page défile. Le sens de lecture place le bouton tout seul : en français à
 * gauche de la barre, en arabe à droite, sans règle dédiée.
 */
export const EditorBackButton: React.FC<{ onBack: () => void; className?: string }> = ({ onBack, className = '' }) => {
    const { locale } = useLocale();
    const { impact } = useHapticFeedback();
    const label = locale === 'ar'
        ? 'الرجوع إلى الأقسام'
        : locale === 'en'
            ? 'Back to classes'
            : 'Retour aux classes';

    return (
        <button
            type="button"
            onClick={() => { impact('light'); onBack(); }}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            className={`editor-back-button shrink-0 ${className}`.trim()}
            title={label}
            aria-label={label}
        >
            <ArrowLeft className="editor-back-button__arrow" size={26} strokeWidth={2.5} aria-hidden="true" />
        </button>
    );
};
