import * as React from "react"
import { cn } from "@/lib/utils"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"
import { TRASH_PATHS } from "./icons"

export interface AnimatedTrashButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
  variant?: "destructive" | "ghost" | "outline" | "icon"
  size?: "sm" | "md" | "lg"
  iconOnly?: boolean
  onAction?: () => void | Promise<void>
}

/*
 * LA CORBEILLE — un seul bouton, une seule icône, partout.
 *
 * L'icône est celle de la famille maison (`Trash2` : silhouette douce + contour fin, mêmes tracés), et non
 * plus un dessin à part. Le geste est doux : au survol ou au focus le couvercle se soulève sur sa charnière,
 * à l'appui le bouton se tasse, au clic le couvercle s'ouvre et se referme en un ressort court (≈ 440 ms)
 * avant `onAction`. `onClick` part tout de suite : la confirmation s'ouvre pendant que le geste se termine.
 * Avec `prefers-reduced-motion`, aucun mouvement : l'action part immédiatement.
 */
const GESTURE_MS = 440

export const AnimatedTrashButton = React.forwardRef<
  HTMLButtonElement,
  AnimatedTrashButtonProps
>(
  (
    {
      label,
      variant,
      size = "md",
      iconOnly = !label,
      onAction,
      onClick,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [isRunning, setIsRunning] = React.useState(false)
    const isRunningRef = React.useRef(false)
    const { impact } = useHapticFeedback()
    const resolvedVariant = variant ?? (iconOnly ? "icon" : "destructive")

    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    React.useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }, [])

    const finish = React.useCallback(() => {
      if (!isRunningRef.current) return
      isRunningRef.current = false
      setIsRunning(false)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (onAction) void onAction()
    }, [onAction])

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isRunningRef.current) return
      impact("medium")
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
      if (prefersReduced) {
        onClick?.(e)
        if (onAction) void onAction()
        return
      }
      isRunningRef.current = true
      setIsRunning(true)
      // Filet de sécurité si `animationend` n'arrive pas (onglet masqué, animation coupée).
      timerRef.current = setTimeout(finish, GESTURE_MS + 120)
      onClick?.(e)
    }

    const handleAnimationEnd = (e: React.AnimationEvent) => {
      if (e.animationName === "trashLid") finish()
    }

    const text = label ?? (typeof children === "string" ? children : undefined)

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-disabled={disabled || isRunning || undefined}
        data-running={isRunning ? "true" : "false"}
        onClick={handleClick}
        className={cn(
          "del-btn",
          `del-btn--${resolvedVariant}`,
          `del-btn--${size}`,
          className
        )}
        {...props}
      >
        <svg
          className="app-icon del-btn__icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <g className="del-btn__body">
            <path d={TRASH_PATHS.wash} className="icon-wash" stroke="none" />
            <path d={TRASH_PATHS.slits} />
          </g>
          <g className="del-btn__lid" onAnimationEnd={handleAnimationEnd}>
            <path d={TRASH_PATHS.lid} />
          </g>
        </svg>
        {!iconOnly && text && <span className="del-btn__label">{text}</span>}
        {!iconOnly && !text && children}
      </button>
    )
  }
)
AnimatedTrashButton.displayName = "AnimatedTrashButton"
