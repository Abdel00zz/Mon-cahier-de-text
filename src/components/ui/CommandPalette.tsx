import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import {
  Search,
  BookOpen,
  Plus,
  Sun,
  Moon,
  Settings,
  CircleHelp,
  Calendar,
  ArrowRight,
  Command as CommandIcon,
} from '@/components/ui/icons';
import { ClassInfo } from '@/types';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'classes' | 'actions' | 'navigation' | 'theme';
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  classes?: ClassInfo[];
  onSelectClass?: (classInfo: ClassInfo) => void;
  onCreateClass?: () => void;
  onOpenSettings?: () => void;
  onOpenTimetable?: () => void;
  onOpenGuide?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  classes = [],
  onSelectClass,
  onCreateClass,
  onOpenSettings,
  onOpenTimetable,
  onOpenGuide,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const items = React.useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    classes.forEach(c => {
      list.push({
        id: `class-${c.id}`,
        title: c.name,
        subtitle: c.subject ? `${c.subject} · Ouvrir le cahier de textes` : 'Ouvrir le cahier de textes',
        category: 'classes',
        icon: BookOpen,
        badge: c.cycle ? c.cycle.toUpperCase() : undefined,
        onSelect: () => {
          onSelectClass?.(c);
          onClose();
        },
      });
    });

    if (onCreateClass) {
      list.push({
        id: 'action-create-class',
        title: 'Ajouter une nouvelle classe',
        subtitle: 'Créer un cahier de textes ou groupe de niveau',
        category: 'actions',
        icon: Plus,
        badge: 'Nouveau',
        onSelect: () => {
          onCreateClass();
          onClose();
        },
      });
    }

    if (onOpenTimetable) {
      list.push({
        id: 'nav-timetable',
        title: 'Emploi du temps',
        subtitle: 'Consulter et gérer la grille hebdomadaire',
        category: 'navigation',
        icon: Calendar,
        onSelect: () => {
          onOpenTimetable();
          onClose();
        },
      });
    }

    if (onOpenSettings) {
      list.push({
        id: 'nav-settings',
        title: 'Réglages & Personnalisation',
        subtitle: 'Apparence, thème clair/sombre, taille du texte et export de données',
        category: 'navigation',
        icon: Settings,
        onSelect: () => {
          onOpenSettings();
          onClose();
        },
      });
    }

    if (onOpenGuide) {
      list.push({
        id: 'nav-guide',
        title: 'Guide méthodologique',
        subtitle: 'Documentation pédagogique et fiches de prise en main',
        category: 'navigation',
        icon: CircleHelp,
        onSelect: () => {
          onOpenGuide();
          onClose();
        },
      });
    }

    if (onToggleDarkMode) {
      list.push({
        id: 'action-toggle-theme',
        title: isDarkMode ? 'Basculer en Mode Clair' : 'Basculer en Mode Sombre',
        subtitle: 'Changer le thème de l’interface',
        category: 'theme',
        icon: isDarkMode ? Sun : Moon,
        onSelect: () => {
          onToggleDarkMode();
          onClose();
        },
      });
    }

    return list;
  }, [
    classes,
    onCreateClass,
    onOpenTimetable,
    onOpenSettings,
    onOpenGuide,
    onSelectClass,
    onClose,
    isDarkMode,
    onToggleDarkMode,
  ]);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm animate-in fade-in-0 duration-150" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 top-16 sm:top-24 z-50 mx-auto w-full max-w-xl px-3 sm:px-6 outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Palette de commandes</DialogPrimitive.Title>
          <Command
            label="Palette de commandes"
            className="w-full overflow-hidden rounded-2xl border border-border/80 bg-popover/95 dark:bg-card/95 text-foreground shadow-2xl ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3 border-b border-border/60 bg-muted/30 px-4 py-3.5">
              <Search className="h-5 w-5 text-primary shrink-0" />
              <Command.Input
                autoFocus
                placeholder="Rechercher une classe, action ou commande... (Ex: 2BAC, Thème, Guide)"
                className="w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/70 px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[440px] overflow-y-auto p-2 pb-3 modern-scrollbar overscroll-contain">
              <Command.Empty className="py-10 text-center text-muted-foreground text-sm">
                <p>Aucun résultat trouvé</p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  Essayez le nom d’une classe ou une action
                </p>
              </Command.Empty>
              {items.map(item => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.id}
                    value={`${item.title} ${item.subtitle ?? ''}`}
                    onSelect={item.onSelect}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-start text-foreground/85 transition-all cursor-pointer data-[selected=true]:border-primary/25 data-[selected=true]:bg-primary/10 data-[selected=true]:font-semibold data-[selected=true]:text-primary data-[selected=true]:shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground group-data-[selected=true]:font-semibold group-data-[selected=true]:text-primary">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                          {item.badge}
                        </span>
                      )}
                      <ArrowRight className="hidden h-4 w-4 text-primary group-data-[selected=true]:inline-block" />
                    </div>
                  </Command.Item>
                );
              })}
            </Command.List>

            <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground font-mono">
              <div className="flex items-center gap-2">
                <CommandIcon className="h-3.5 w-3.5 text-primary" />
                <span>Palette de commandes</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline">
                  <kbd className="rounded border border-border/80 bg-muted px-1 py-0.5 text-[10px]">
                    ↑
                  </kbd>{' '}
                  <kbd className="rounded border border-border/80 bg-muted px-1 py-0.5 text-[10px]">
                    ↓
                  </kbd>{' '}
                  Naviguer
                </span>
                <span>
                  <kbd className="rounded border border-border/80 bg-muted px-1 py-0.5 text-[10px]">
                    ↵
                  </kbd>{' '}
                  Exécuter
                </span>
              </div>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
