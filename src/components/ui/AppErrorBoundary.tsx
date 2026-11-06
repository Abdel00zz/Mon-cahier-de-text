import * as React from 'react';
import type { AppLocale } from '../../types';
import { appErrorCopy, classifyAppError, repairApplicationCache } from './appErrorRecovery';
import './error-boundary.css';

export interface AppErrorScreenProps {
    /** Message technique, replié : destiné au support, pas à l'enseignant. */
    detail?: string;
    onReload: () => void;
    onHome: () => void;
    /** La locale peut avoir été perdue avec l'écran ; on retombe sur le document. */
    locale?: AppLocale;
    recovering?: boolean;
}

/** La langue est lue sur le document, seule source encore fiable après un crash. */
function detectErrorLocale(): AppLocale {
    if (typeof document !== 'undefined') {
        const lang = document.documentElement.lang.toLowerCase();
        if (lang.startsWith('ar')) return 'ar';
        if (lang.startsWith('en')) return 'en';
        if (lang.startsWith('fr')) return 'fr';
    }
    if (typeof navigator !== 'undefined') {
        const lang = navigator.language.toLowerCase();
        if (lang.startsWith('ar')) return 'ar';
        if (lang.startsWith('en')) return 'en';
    }
    return 'fr';
}

/**
 * Écran de reprise après une erreur de rendu ou de chargement.
 *
 * Il reste volontairement autonome : aucune dépendance à l'état de l'app, qui
 * vient précisément d'échouer. Une seule action forte, une sortie secondaire,
 * un détail technique replié et une illustration inline qui ne peut pas
 * manquer à l'appel.
 */
export function AppErrorScreen({
    detail,
    onReload,
    onHome,
    locale = 'fr',
    recovering = false,
}: AppErrorScreenProps) {
    const kind = classifyAppError(detail);
    const copy = appErrorCopy(kind, locale);
    const rtl = locale === 'ar';

    return (
        <div
            className={`app-error app-error--${kind}`}
            role="alert"
            dir={rtl ? 'rtl' : 'ltr'}
            lang={locale}
            aria-labelledby="app-error-title"
            aria-describedby="app-error-body"
        >
            <div className="app-error__card">
                <div className="app-error__hero" aria-hidden="true">
                    <svg viewBox="0 0 96 96" fill="none" role="presentation" focusable="false">
                        <rect className="app-error__hero-page" x="22" y="12" width="52" height="68" rx="12" />
                        <path className="app-error__hero-fold" d="M62 12v14h12" />
                        <path className="app-error__hero-line" d="M34 38h28M34 48h20M34 58h24" />
                        <circle className="app-error__hero-badge" cx="70" cy="70" r="15" />
                        <path className="app-error__hero-check" d="m63 70 4.5 4.5L77 63" />
                    </svg>
                </div>
                <h1 id="app-error-title" className="app-error__title">{copy.title}</h1>
                <p id="app-error-body" className="app-error__text">{copy.body}</p>
                <div className="app-error__actions">
                    <button
                        type="button"
                        className="app-error__button app-error__button--primary"
                        onClick={onReload}
                        disabled={recovering}
                        aria-busy={recovering || undefined}
                    >
                        {recovering ? copy.repairing : copy.primary}
                    </button>
                    <button type="button" className="app-error__home" onClick={onHome} disabled={recovering}>
                        {copy.home}
                    </button>
                </div>
                {detail ? (
                    <details className="app-error__detail">
                        <summary>{copy.details}</summary>
                        <pre>{detail}</pre>
                    </details>
                ) : null}
            </div>
        </div>
    );
}

interface AppErrorBoundaryProps {
    children: React.ReactNode;
    onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface AppErrorBoundaryState {
    error?: Error;
    recovering?: boolean;
}

/**
 * Isole la surface applicative : une erreur de rendu d'un écran ne doit jamais
 * laisser l'enseignant devant une page blanche, ni effacer son travail local.
 *
 * Une erreur de module est réparée avant rechargement : le cache applicatif est
 * vidé, ce qui évite de rejouer indéfiniment le même fichier incohérent.
 */
export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    state: AppErrorBoundaryState = {};

    static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
        return { error, recovering: false };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[app] rendu interrompu', error);
        this.props.onError?.(error, info);
    }

    private isModuleError(): boolean {
        const error = this.state.error;
        return Boolean(error && classifyAppError(`${error.name}: ${error.message}`) === 'module');
    }

    private reload = () => {
        if (!this.isModuleError()) {
            window.location.reload();
            return;
        }
        this.setState({ recovering: true });
        void repairApplicationCache().finally(() => window.location.reload());
    };

    /** Retour à l'accueil : le fragment d'URL est la seule source de la vue. */
    private goHome = () => {
        window.location.hash = '#/';
        if (this.isModuleError()) {
            this.setState({ recovering: true });
            void repairApplicationCache().finally(() => window.location.reload());
            return;
        }
        window.location.reload();
    };

    render() {
        const { error, recovering } = this.state;
        if (!error) return this.props.children;
        return (
            <AppErrorScreen
                detail={error.message ? `${error.name}: ${error.message}` : error.name}
                onReload={this.reload}
                onHome={this.goHome}
                locale={detectErrorLocale()}
                recovering={recovering}
            />
        );
    }
}

