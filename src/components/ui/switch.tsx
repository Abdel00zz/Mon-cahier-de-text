"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"

/**
 * Séquences morphologiques SVG du bouton à bascule liquide (Jelly Slime Morph Switch).
 * Chaque séquence représente une étape clé de déformation visco-élastique.
 */
const IN_SEQUENCES = [
  "M24.8,42.2c-9.9,0-18-8.1-18-18s8.1-18,18-18s18,8.1,18,18S34.7,42.2,24.8,42.2z",
  "M24.6,42.6c-9.8-1.8-18.8-8.1-18-18c1.3-16.4,8.1-16.7,18-18C44,4,47.1,15.8,47.1,25.8S34.6,44.5,24.6,42.6z",
  "M21.6,21.7c-2-0.3-3.9-1.2-5.1-2.8c-1.2-1.7-1.8-4,1.1-6.3c5.7-4.6,20.2-7.5,33.3-4.9s15.3,16.1,13.6,21.2S55,43.4,43.2,42.4s-13.4-1-16.1-3.8s-0.8-7.3,2.1-10.1C31.7,25.9,26.3,22.4,21.6,21.7z",
  "M15,19.5c0,0,0.8-4.3,8.8-6.6c2.3-0.7,5.4-1.4,8.8-2.2c8.6-2,19-4,23.5-4c6.2,0,22.9-0.8,28.5,7.5s4.7,17.4-0.8,22.7c-5.4,5.3-16.2,7.3-28.9,5.1c0,0-5.4-2.3-7.1-8.1c-1.7-5.7-2.8-5.7-6.4-5.2c-3.6,0.5-9-0.1-9.7-2.9c-0.7-2.8-4.4-4.9-9.4-4.5C17.4,21.8,15.2,22,15,19.5z",
  "M53.5,22.2c-2-0.3-3.9-1.2-5.1-2.8c-1.2-1.7-1.8-4,1.1-6.3c5.7-4.6,20.2-7.5,33.3-4.9s15.3,16.1,13.6,21.2c-1.6,5.2-9.6,14.5-21.3,13.5s-13.4-1-16.1-3.8s-0.8-7.3,2.1-10.1C63.7,26.4,58.3,22.9,53.5,22.2z",
  "M72.6,25.8c0-9.9,3.1-21.8,22.6-19.1c9.9,1.3,16.7,1.6,18,18c0.8,9.9-8.2,16.2-18,18C85.1,44.5,72.6,35.7,72.6,25.8z",
  "M76.9,24.2c0-9.9,8.1-18,18-18s18,8.1,18,18s-8.1,18-18,18S76.9,34.2,76.9,24.2z",
]

const OUT_SEQUENCES = [
  "M76.9,24.5c0-9.9,8.1-18,18-18s18,8.1,18,18s-8.1,18-18,18S76.9,34.4,76.9,24.5z",
  "M72.6,26c0-9.9,3.1-21.8,22.6-19.1c9.9,1.3,16.7,1.6,18,18c0.8,9.9-8.2,16.2-18,18C85.1,44.8,72.6,36,72.6,26z",
  "M90.4,28.7c2.9,2.9,4.7,7.3,2.1,10.1c-2.6,2.9-4.3,2.9-16.1,3.8s-19.7-8.4-21.3-13.5s0.5-18.7,13.6-21.2s27.6,0.3,33.3,4.9c2.9,2.3,2.4,4.6,1.1,6.3c-1.2,1.6-3.1,2.6-5.1,2.8C93.4,22.7,87.9,26.2,90.4,28.7z",
  "M97.4,21.7c-4.9-0.4-8.7,1.7-9.4,4.5c-0.7,2.8-6.1,3.4-9.7,2.9c-3.6-0.5-4.6-0.6-6.4,5.2s-7.1,8.1-7.1,8.1c-12.7,2.2-23.5,0.2-28.9-5.1s-6.4-14.4-0.8-22.7S57.4,7,63.6,7c4.4,0,14.9,2,23.5,4c3.4,0.8,6.5,1.6,8.8,2.2c8,2.3,8.8,6.6,8.8,6.6C104.5,22.3,102.3,22.1,97.4,21.7z",
  "M58.5,29.2c2.9,2.9,4.7,7.3,2.1,10.1c-2.6,2.9-4.3,2.9-16.1,3.8c-11.8,1-19.7-8.4-21.3-13.5c-1.6-5.2,0.5-18.7,13.6-21.2s27.6,0.3,33.3,4.9c2.9,2.3,2.4,4.6,1.1,6.3c-1.2,1.6-3.1,2.6-5.1,2.8C61.4,23.1,56,26.7,58.5,29.2z",
  "M24.6,42.9c-9.8-1.8-18.8-8.1-18-18c1.3-16.4,8.1-16.7,18-18C44,4.3,47.1,16.1,47.1,26S34.6,44.8,24.6,42.9z",
  "M24.8,42.5c-9.9,0-18-8.1-18-18s8.1-18,18-18s18,8.1,18,18S34.7,42.5,24.8,42.5z",
]

const BASE_TRACK_PATH =
  "M96,48H24C10.7,48,0,37.3,0,24v0C0,10.7,10.7,0,24,0l72,0c13.3,0,24,10.7,24,24v0C120,37.3,109.3,48,96,48z"

// Délais par étape (en ms) pour atteindre 240ms au total (ergonomie 150-300ms)
const FRAME_DELAYS = [0, 32, 68, 110, 155, 200, 245]

const WOBBLE_IN = [
  { x: -3, rotate: -5, scale: 0.96 },
  { x: -2, rotate: -4, scale: 0.98 },
  { x: -1, rotate: -2, scale: 1.0 },
  { x: 1, rotate: 2, scale: 1.04 },
  { x: 2, rotate: 3, scale: 1.02 },
  { x: 1, rotate: 1, scale: 0.99 },
  { x: 0, rotate: 0, scale: 1.0 },
]

const WOBBLE_OUT = [
  { x: 3, rotate: 5, scale: 0.96 },
  { x: 2, rotate: 4, scale: 0.98 },
  { x: 1, rotate: 2, scale: 1.0 },
  { x: -1, rotate: -2, scale: 1.04 },
  { x: -2, rotate: -3, scale: 1.02 },
  { x: -1, rotate: -1, scale: 0.99 },
  { x: 0, rotate: 0, scale: 1.0 },
]

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  activeBaseColor?: string
  inactiveBaseColor?: string
}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, SwitchProps>(
  ({ className, activeBaseColor, inactiveBaseColor, ...props }, ref) => {
    const rawId = React.useId()
    const filterId = React.useMemo(() => `jelly-shadow-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`, [rawId])
    const { impact } = useHapticFeedback()

    const isControlled = props.checked !== undefined
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState<boolean>(
      props.defaultChecked ?? false
    )
    const checked = isControlled ? (props.checked ?? false) : uncontrolledChecked

    const [frame, setFrame] = React.useState<number>(6)
    const [direction, setDirection] = React.useState<"in" | "out">(checked ? "in" : "out")
    const [wobble, setWobble] = React.useState<{ x: number; rotate: number; scale: number }>({
      x: 0,
      rotate: 0,
      scale: 1,
    })

    const isInitialMount = React.useRef(true)
    const prevChecked = React.useRef(checked)
    const timersRef = React.useRef<NodeJS.Timeout[]>([])

    const clearTimers = React.useCallback(() => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }, [])

    React.useEffect(() => {
      return () => {
        clearTimers()
      }
    }, [clearTimers])

    React.useEffect(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false
        prevChecked.current = checked
        setDirection(checked ? "in" : "out")
        setFrame(6)
        return
      }

      if (prevChecked.current === checked) return
      prevChecked.current = checked

      clearTimers()

      const newDirection: "in" | "out" = checked ? "in" : "out"
      setDirection(newDirection)

      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches

      if (prefersReduced) {
        setFrame(6)
        setWobble({ x: 0, rotate: 0, scale: 1 })
        return
      }

      const wobbles = newDirection === "in" ? WOBBLE_IN : WOBBLE_OUT

      FRAME_DELAYS.forEach((delay, idx) => {
        const timer = setTimeout(() => {
          setFrame(idx)
          setWobble(wobbles[idx])
        }, delay)
        timersRef.current.push(timer)
      })
    }, [checked, clearTimers])

    const handleCheckedChange = (nextChecked: boolean) => {
      impact("light")
      if (!isControlled) {
        setUncontrolledChecked(nextChecked)
      }
      props.onCheckedChange?.(nextChecked)
    }

    // Détermination de la trajectoire courante
    const sequence = direction === "in" ? IN_SEQUENCES : OUT_SEQUENCES
    const currentPath =
      frame === 6
        ? checked
          ? IN_SEQUENCES[6]
          : OUT_SEQUENCES[6]
        : sequence[frame] ?? sequence[0]

    return (
      <SwitchPrimitives.Root
        ref={ref}
        checked={checked}
        onCheckedChange={handleCheckedChange}
        className={cn(
          "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full touch-manipulation select-none",
          // Zone tactile de sécurité Fitts mobile (>= 44x44px)
          "min-h-[44px] min-w-[54px] p-0.5 border-0 bg-transparent outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "active:scale-[0.98] transition-transform duration-150 ease-out",
          className
        )}
        {...props}
      >
        <svg
          viewBox="0 0 120 48"
          className="h-6 w-[54px] sm:h-6.5 sm:w-[58px] pointer-events-none overflow-visible transition-transform duration-100 ease-out"
          style={{
            transform: `translate3d(${wobble.x}px, 0, 0) rotate(${wobble.rotate}deg) scale(${wobble.scale})`,
          }}
          aria-hidden="true"
        >
          <defs>
            <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.22" />
            </filter>
          </defs>

          {/* Rail capsule (Base Track) */}
          <path
            d={BASE_TRACK_PATH}
            className={cn(
              "transition-colors duration-200 ease-in-out",
              checked
                ? "fill-primary stroke-primary/30"
                : "fill-stone-200/90 dark:fill-zinc-700/80 stroke-stone-300/80 dark:stroke-zinc-600/70"
            )}
            style={{
              fill: checked
                ? activeBaseColor
                : inactiveBaseColor,
            }}
            strokeWidth="1.5"
          />

          {/* Noyau liquide déformable (Morphing Jelly Knob) */}
          <path
            d={currentPath}
            filter={`url(#${filterId})`}
            className="fill-white dark:fill-stone-50"
          />
        </svg>
      </SwitchPrimitives.Root>
    )
  }
)

Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
