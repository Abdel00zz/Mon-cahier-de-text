import * as React from 'react';
import './error-boundary.css';

export interface AppErrorScreenProps {
    /** Message technique, replié : destiné au support, pas à l'enseignant. */
    detail?: string;
    onReload: () => void;
    onHome: () => void;
}

/**
 * Écran de reprise après une erreur de rendu.
 *
 * Ton volontairement bienveillant (aucune réprimande) et bilingue : à cet
 * instant précis la locale applicative peut être indisponible, donc les textes
 * sont écrits ici plutôt que résolus par le dictionnaire.
 */
export function AppErrorScreen({ detail, onReload, onHome }: AppErrorScreenProps) {
    return (
        <div className="app-error" role="alert" dir="ltr">
            <div className="app-error__card">
                <span className="app-error__glyph" aria-hidden="true">
                    <svg viewBox="0 0 48 48" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M24 6.5 43 39.5H5L24 6.5Z" className="app-error__glyph-stroke" />
                        <path d="M24 18v10" className="app-error__glyph-stroke" />
                        <circle cx="24" cy="33.6" r="1.6" className="app-error__glyph-fill" stroke="none" />
                    </svg>
                </span>
                <h1 className="app-error__title" lang="fr">Une pause, rien n'est perdu</h1>
                <p className="app-error__text" lang="fr">
                    Vos cahiers sont enregistrés sur cet appareil. Rechargez la page pour reprendre là où vous étiez.
                </p>
                <p className="app-error__text app-error__text--ar" lang="ar" dir="rtl">
                    دفاتركم محفوظة على هذا الجهاز. أعد تحميل الصفحة لمتابعة العمل من حيث توقفتم.
                </p>
                <div className="app-error__actions">
                    <button type="button" className="app-error__button app-error__button--primary" onClick={onReload}>
                        <span lang="fr">Recharger la page</span>
                        <span className="app-error__button-sep" aria-hidden="true">·</span>
                        <span lang="ar" dir="rtl">إعادة التحميل</span>
                    </button>
                    <button type="button" className="app-error__button" onClick={onHome}>
                        <span lang="fr">Retour à l'accueil</span>
                        <span className="app-error__button-sep" aria-hidden="true">·</span>
                        <span lang="ar" dir="rtl">العودة إلى البداية</span>
                    </button>
                </div>
                {detail ? (
                    <details className="app-error__detail">
                        <summary>Détails techniques</summary>
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
}

/**
 * Isole la surface applicative : une erreur de rendu d'un écran ne doit jamais
 * laisser l'enseignant devant une page blanche, ni effacer son travail local.
 */
export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    state: AppErrorBoundaryState = {};

    static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[app] rendu interrompu', error);
        this.props.onError?.(error, info);
    }

    private reload = () => {
        window.location.reload();
    };

    /** Retour à l'accueil : le fragment d'URL est la seule source de la vue. */
    private goHome = () => {
        window.location.hash = '#/';
        window.location.reload();
    };

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;
        return (
            <AppErrorScreen
                detail={error.message ? `${error.name}: ${error.message}` : error.name}
                onReload={this.reload}
                onHome={this.goHome}
            />
        );
    }
}
