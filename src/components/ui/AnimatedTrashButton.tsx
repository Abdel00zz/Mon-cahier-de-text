import * as React from "react"
import { cn } from "@/lib/utils"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"

export interface AnimatedTrashButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
  variant?: "destructive" | "ghost" | "outline" | "icon"
  size?: "sm" | "md" | "lg"
  iconOnly?: boolean
  onAction?: () => void | Promise<void>
}

/**
 * Bouton de suppression interactif avec animation liquide / vectorielle
 * (ouverture du couvercle, inclinaison du bac, aspiration des lettres et fermeture).
 */
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
    const rawId = React.useId()
    const canClipId = React.useMemo(
      () => `trash-clip-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
      [rawId]
    )
    const canFillId = React.useMemo(
      () => `trash-fill-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
      [rawId]
    )

    const [isRunning, setIsRunning] = React.useState(false)
    const isRunningRef = React.useRef(false)
    const { impact } = useHapticFeedback()

    const resolvedVariant =
      variant ?? (iconOnly ? "icon" : "destructive")

    // Nettoyage / reset de sécurité
    const timerRef = React.useRef<NodeJS.Timeout | null>(null)
    React.useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }, [])

    const handleReset = React.useCallback(() => {
      isRunningRef.current = false
      setIsRunning(false)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }, [])

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isRunningRef.current) return

      impact("medium")

      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches

      if (prefersReduced) {
        onClick?.(e)
        if (onAction) {
          await onAction()
        }
        return
      }

      isRunningRef.current = true
      setIsRunning(true)

      // Fallback timer au cas où animationend n'est pas déclenché (1.45s)
      timerRef.current = setTimeout(() => {
        handleReset()
        if (onAction) {
          void onAction()
        }
      }, 1450)

      onClick?.(e)
    }

    const handleAnimationEnd = (e: React.AnimationEvent) => {
      // On déclenche le reset lorsque l'animation du couvercle se termine
      if (e.animationName === "trashLid") {
        handleReset()
        if (onAction) {
          void onAction()
        }
      }
    }

    const letters = React.useMemo(() => {
      const text = label || (typeof children === "string" ? children : "")
      return text.split("")
    }, [label, children])

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || isRunning}
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
          className="del-btn__icon"
          viewBox="0 0 48 48"
          width="48px"
          height="48px"
          aria-hidden="true"
        >
          <clipPath id={canClipId}>
            <rect
              className="del-btn__icon-can-fill"
              x="5"
              y="24"
              width="14"
              height="11"
            />
          </clipPath>

          <g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(12,12)"
          >
            {/* Couvercle animé */}
            <g
              className="del-btn__icon-lid"
              data-anim="true"
              onAnimationEnd={handleAnimationEnd}
            >
              <polyline points="9,5 9,1 15,1 15,5" />
              <polyline points="4,5 20,5" />
            </g>

            {/* Corps de poubelle animé */}
            <g className="del-btn__icon-can">
              <g strokeWidth="0">
                <polyline
                  id={canFillId}
                  points="6,10 7,23 17,23 18,10"
                />
                <use
                  clipPath={`url(#${canClipId})`}
                  href={`#${canFillId}`}
                  fill="currentColor"
                />
              </g>
              <polyline points="6,10 7,23 17,23 18,10" />
            </g>
          </g>
        </svg>

        {/* Lettres volantes si libellé présent */}
        {!iconOnly && letters.length > 0 && (
          <span className="del-btn__letters" aria-hidden="true">
            {letters.map((char, index) => (
              <span key={index} className="del-btn__letter-box">
                <span className="del-btn__letter">
                  {char === " " ? "\u00A0" : char}
                </span>
              </span>
            ))}
          </span>
        )}

        {/* Support de contenu enfant si non string */}
        {!iconOnly && letters.length === 0 && children}
      </button>
    )
  }
)

AnimatedTrashButton.displayName = "AnimatedTrashButton"
