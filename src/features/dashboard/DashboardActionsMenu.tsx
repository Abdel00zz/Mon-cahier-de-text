import { memo } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuItemIndicator,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Plus } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { isClassDisplayMode, type ClassDisplayMode } from './classDisplayMode';
import './dashboardActionsMenu.css';

/*
 * Actions du tableau de bord : UN bouton rond, qui s'ouvre vers le BAS.
 *
 * Il regroupe la création d'une classe et la disposition des cartes. Le geste
 * reste court (un appui pour ouvrir, un appui pour choisir) et la rangée du
 * titre ne porte plus qu'une seule commande.
 *
 * Le menu est celui de l'application (Radix) : navigation au clavier, Échap,
 * focus rendu au bouton, sens de lecture (début/fin) suivant la langue. Seules
 * l'icône qui se transforme en croix et l'apparition en cascade lui sont propres
 * (`classActionsMenu.css`).
 */

interface DashboardActionsMenuProps {
    mode: ClassDisplayMode;
    onModeChange: (mode: ClassDisplayMode) => void;
    onCreateClass: () => void;
}

/** Miniatures des dispositions : même cadre, même encre que le reste du menu. */
const GLYPHS: Record<ClassDisplayMode, React.ReactNode> = {
    double: (
        <>
            <rect width="7" height="7" x="3" y="3" rx="2" />
            <rect width="7" height="7" x="14" y="3" rx="2" />
            <rect width="7" height="7" x="14" y="14" rx="2" />
            <rect width="7" height="7" x="3" y="14" rx="2" />
        </>
    ),
    single: (
        <>
            <rect x="4" y="3" width="16" height="18" rx="2.5" />
            <path d="M8 15h8M8 18h5" />
            <rect x="7.5" y="6.5" width="9" height="5" rx="1.25" />
        </>
    ),
    list: (
        <>
            <rect x="3" y="3.5" width="18" height="4" rx="1.5" />
            <rect x="3" y="10" width="18" height="4" rx="1.5" />
            <rect x="3" y="16.5" width="18" height="4" rx="1.5" />
        </>
    ),
};

/** Du plus aéré au plus dense, comme l'écran lui-même. */
const MENU_MODES: readonly ClassDisplayMode[] = ['double', 'single', 'list'];

/** Rang d'apparition de chaque ligne : la cascade descend avec le menu. */
const rank = (index: number) => ({ '--i': index }) as React.CSSProperties;

export const DashboardActionsMenu = memo(({ mode, onModeChange, onCreateClass }: DashboardActionsMenuProps) => {
    const { t } = useLocale();
    const { impact } = useHapticFeedback();

    return (
        <DropdownMenu onOpenChange={open => { if (open) impact('light'); }}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    data-slot="dashboard-actions-menu"
                    className="dashboard-actions-menu__trigger"
                    aria-label={t('dashboard.actions')}
                    title={t('dashboard.actions')}
                >
                    <span className="dashboard-actions-menu__icon" aria-hidden="true">
                        <span className="dashboard-actions-menu__line dashboard-actions-menu__line--first" />
                        <span className="dashboard-actions-menu__line" />
                        <span className="dashboard-actions-menu__line dashboard-actions-menu__line--last" />
                    </span>
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="bottom" align="end" sideOffset={8} className="dashboard-actions-menu__menu w-56">
                <DropdownMenuItem onSelect={onCreateClass} className="dashboard-actions-menu__item dashboard-actions-menu__create" style={rank(0)}>
                    <Plus aria-hidden="true" />
                    <span>{t('dashboard.addClass')}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="dashboard-actions-menu__item" style={rank(1)} />

                <DropdownMenuLabel className="dashboard-actions-menu__item" style={rank(1)}>{t('dashboard.display')}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                    value={mode}
                    onValueChange={value => { if (isClassDisplayMode(value)) { impact('light'); onModeChange(value); } }}
                >
                    {MENU_MODES.map((value, index) => (
                        <DropdownMenuRadioItem key={value} value={value} className="dashboard-actions-menu__item" style={rank(index + 2)}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="dashboard-actions-menu__glyph">
                                {GLYPHS[value]}
                            </svg>
                            <span className="flex-1">{t(`dashboard.display.${value}`)}</span>
                            <DropdownMenuItemIndicator>
                                <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                            </DropdownMenuItemIndicator>
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});

DashboardActionsMenu.displayName = 'DashboardActionsMenu';
