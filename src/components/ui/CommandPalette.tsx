import * as React from 'react';
import {
  Search,
  BookOpen,
  Plus,
  Sun,
  Moon,
  Settings,
  HelpCircle,
  Calendar,
  ArrowRight,
  Command as CommandIcon,
} from 'lucide-react';
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
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Focus on mount
  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build items list
  const items = React.useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    // Classes
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

    // Actions
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

    // Navigation
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
        icon: HelpCircle,
        onSelect: () => {
          onOpenGuide();
          onClose();
        },
      });
    }

    // Theme toggle
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

  // Filter items
  const filtered = React.useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  }, [items, query]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (filtered.length === 0 ? 0 : (prev + 1) % filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev =>
          filtered.length === 0 ? 0 : (prev - 1 + filtered.length) % filtered.length
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].onSelect();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  // Scroll active item into view
  React.useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-6 pt-16 sm:pt-24 transition-all"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-popover/95 dark:bg-card/95 text-foreground shadow-2xl ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Search header */}
        <div className="flex items-center gap-3 border-b border-border/60 bg-muted/30 px-4 py-3.5">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Rechercher une classe, action ou commande... (Ex: 2BAC, Thème, Guide)"
            className="w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/70 px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 modern-scrollbar"
        >
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <p>Aucun résultat trouvé pour « {query} »</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Essayez le nom d’une classe ou une action
              </p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-active={isSelected}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-start transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 text-primary border border-primary/25 shadow-2xs font-semibold'
                      : 'text-foreground/85 hover:bg-muted/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-sm ${isSelected ? 'text-primary font-semibold' : 'text-foreground font-medium'}`}>
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
                    {isSelected && (
                      <ArrowRight className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
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
      </div>
    </div>
  );
};
