"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer group/switch relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full touch-manipulation",
      "p-0.5 border border-transparent transition-all duration-200 ease-in-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "active:scale-[0.96] transition-transform duration-150 ease-out motion-reduce:active:scale-100 motion-reduce:transition-none",
      // Zone tactile mobile étendue (Loi de Fitts >= 44x44px)
      "before:absolute before:-inset-2.5 before:content-['']",
      // État désactivé (OFF)
      "bg-stone-200/90 dark:bg-zinc-700/80 border-stone-300/60 dark:border-zinc-600/60 shadow-inner hover:bg-stone-300/80 dark:hover:bg-zinc-600/80",
      // État activé (ON)
      "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:shadow-[0_2px_6px_rgba(162,71,38,0.30)]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white dark:bg-stone-50",
        "shadow-[0_1.5px_3px_rgba(0,0,0,0.2),0_0.5px_1px_rgba(0,0,0,0.12)] border border-black/5 ring-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        "rtl:data-[state=checked]:-translate-x-5 rtl:data-[state=unchecked]:translate-x-0",
        "group-active/switch:scale-95"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
