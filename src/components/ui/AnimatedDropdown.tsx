import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

export interface AnimatedDropdownItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  iconSvgPath?: string;
  disabled?: boolean;
}

export interface AnimatedDropdownProps {
  items: AnimatedDropdownItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  listClassName?: string;
  id?: string;
  showFloatingIcon?: boolean;
}

/**
 * Composant de menu déroulant animé avec pilule suiveuse (sliding pill),
 * flèche à rotation fluide 180° et badge magnétique flottant.
 */
export const AnimatedDropdown: React.FC<AnimatedDropdownProps> = ({
  items,
  value,
  defaultValue,
  onChange,
  placeholder = "Sélectionner...",
  label,
  disabled = false,
  className,
  triggerClassName,
  listClassName,
  id,
  showFloatingIcon = true,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState<string>(
    value ?? defaultValue ?? ""
  );
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [floatingPos, setFloatingPos] = React.useState<{ x: number; y: number } | null>(null);
  const [floatingIconContent, setFloatingIconContent] = React.useState<React.ReactNode | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const { impact } = useHapticFeedback();

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const selectedItem = React.useMemo(
    () => items.find((item) => item.value === currentValue),
    [items, currentValue]
  );

  // Synchronisation valeur contrôlée
  React.useEffect(() => {
    if (isControlled && value !== undefined) {
      setInternalValue(value);
    }
  }, [isControlled, value]);

  // Fermeture au clic extérieur
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHoverIndex(null);
        setFloatingPos(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = React.useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) {
        setHoverIndex(null);
        setFloatingPos(null);
      }
      return next;
    });
  }, [disabled]);

  const handleSelect = React.useCallback(
    (itemValue: string) => {
      impact("light");
      if (!isControlled) {
        setInternalValue(itemValue);
      }
      onChange?.(itemValue);
      setIsOpen(false);
      setHoverIndex(null);
      setFloatingPos(null);
      triggerRef.current?.focus();
    },
    [impact, isControlled, onChange]
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLUListElement>) => {
      if (!showFloatingIcon || !listRef.current) return;
      const rect = listRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setFloatingPos({ x, y });
    },
    [showFloatingIcon]
  );

  const handleItemHover = React.useCallback(
    (item: AnimatedDropdownItem, index: number) => {
      setHoverIndex(index);
      if (item.icon) {
        setFloatingIconContent(item.icon);
      } else if (item.iconSvgPath) {
        setFloatingIconContent(
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d={item.iconSvgPath} />
          </svg>
        );
      } else {
        setFloatingIconContent(<Check className="h-3.5 w-3.5 stroke-[2.5]" />);
      }
    },
    []
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHoverIndex(0);
          return;
        }

        const enabledItems = items.filter((item) => !item.disabled);
        if (enabledItems.length === 0) return;

        const currentIdx = hoverIndex ?? (selectedItem ? items.indexOf(selectedItem) : -1);
        let nextIdx =
          e.key === "ArrowDown"
            ? (currentIdx + 1) % items.length
            : (currentIdx - 1 + items.length) % items.length;

        while (items[nextIdx]?.disabled) {
          nextIdx =
            e.key === "ArrowDown"
              ? (nextIdx + 1) % items.length
              : (nextIdx - 1 + items.length) % items.length;
        }

        setHoverIndex(nextIdx);
        const item = items[nextIdx];
        if (item) handleItemHover(item, nextIdx);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isOpen && hoverIndex !== null && items[hoverIndex] && !items[hoverIndex].disabled) {
          handleSelect(items[hoverIndex].value);
        } else {
          toggleDropdown();
        }
      } else if (e.key === "Escape") {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          setHoverIndex(null);
          setFloatingPos(null);
        }
      }
    },
    [disabled, handleItemHover, handleSelect, hoverIndex, isOpen, items, selectedItem, toggleDropdown]
  );

  // Hauteur fixe des items pour le déplacement fluide du pill
  const itemHeight = 44;
  const translateValue = hoverIndex !== null ? `${hoverIndex * itemHeight}px` : "0px";

  return (
    <div
      ref={containerRef}
      className={cn("animated-dropdown-container", className)}
      onKeyDown={handleKeyDown}
      style={
        {
          "--dropdown-item-height": `${itemHeight}px`,
          "--translate-value": translateValue,
          "--floating-icon-left": floatingPos ? `${floatingPos.x}px` : "0px",
          "--floating-icon-top": floatingPos ? `${floatingPos.y}px` : "0px",
        } as React.CSSProperties
      }
    >
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
      )}

      {/* Bouton de déclenchement (Trigger) */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={toggleDropdown}
        data-state={isOpen ? "open" : "closed"}
        className={cn("animated-dropdown-main-btn", triggerClassName)}
      >
        <div className="animated-dropdown-title-wrap">
          {selectedItem?.icon && (
            <span className="animated-dropdown-title-icon">
              {selectedItem.icon}
            </span>
          )}
          <span className="animated-dropdown-title">
            {selectedItem ? selectedItem.label : placeholder}
          </span>
        </div>

        {/* Flèche à rotation 180° */}
        <span
          className="animated-dropdown-arrow"
          data-open={isOpen ? "true" : "false"}
          aria-hidden="true"
        >
          <ChevronDown className="h-4 w-4 stroke-[2]" />
        </span>
      </button>

      {/* Menu déroulant animé */}
      {isOpen && (
        <div
          className={cn(
            "animated-dropdown-list-wrapper animate-in fade-in-0 zoom-in-95",
            listClassName
          )}
        >
          <ul
            ref={listRef}
            role="listbox"
            className={cn(
              "animated-dropdown-list",
              hoverIndex !== null && "is-hovering"
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              setHoverIndex(null);
              setFloatingPos(null);
            }}
          >
            {items.map((item, index) => {
              const isSelected = item.value === currentValue;
              return (
                <li key={item.value} className="animated-dropdown-list-item" role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={item.disabled}
                    onClick={() => handleSelect(item.value)}
                    onMouseEnter={() => handleItemHover(item, index)}
                    className={cn(
                      "animated-dropdown-item-btn",
                      isSelected && "is-selected",
                      item.disabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {item.icon && (
                      <span className="animated-dropdown-item-icon">
                        {item.icon}
                      </span>
                    )}
                    <span className="truncate">{item.label}</span>
                    {isSelected && (
                      <span className="animated-dropdown-item-check">
                        <Check className="h-4 w-4 stroke-[2.5]" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Badge magnétique flottant suivant le curseur */}
          {showFloatingIcon && floatingPos && hoverIndex !== null && (
            <div
              className={cn(
                "animated-dropdown-floating-icon",
                floatingPos && "is-active"
              )}
              aria-hidden="true"
            >
              {floatingIconContent}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
