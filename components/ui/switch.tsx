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
      "peer group/switch relative inline-flex h-11 w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[14px] bg-transparent touch-manipulation",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "active:scale-[0.96] transition-transform duration-150 ease-out motion-reduce:active:scale-100 motion-reduce:transition-none",
      className
    )}
    {...props}
    ref={ref}
  >
    {/* Track (fond du switch) */}
    <span 
      aria-hidden="true" 
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[14px] border shadow-inner backdrop-blur-sm",
        "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
        // État désactivé (OFF)
        "border-border/60 bg-muted/70 dark:bg-muted/50",
        // État activé (ON)
        "group-data-[state=checked]/switch:border-primary/60 group-data-[state=checked]/switch:bg-primary group-data-[state=checked]/switch:shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]",
        // Hover
        "group-hover/switch:brightness-[1.08] group-hover/switch:saturate-105",
        // Active (pressed)
        "group-active/switch:brightness-95"
      )}
    />
    
    {/* Thumb (curseur) avec spring physics */}
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute left-1 block h-8 w-8 rounded-[11px]",
        "bg-background shadow-[0_2px_8px_rgba(0,0,0,0.15),0_1px_3px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
        // Spring physics animation avec bounce
        "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
        // Translation avec RTL support
        "data-[state=checked]:translate-x-[20px] data-[state=unchecked]:translate-x-0",
        "rtl:data-[state=checked]:translate-x-0 rtl:data-[state=unchecked]:translate-x-[20px]",
        // Micro-scale au hover pour indiquer l'interactivité
        "group-hover/switch:scale-105",
        // Légère compression au clic (Loi de Fitts - feedback immédiat)
        "group-active/switch:scale-[0.92]"
      )}
    >
      {/* Halo lumineux subtil quand activé */}
      <span 
        className={cn(
          "absolute inset-0 rounded-[11px] opacity-0 transition-opacity duration-300",
          "group-data-[state=checked]/switch:opacity-100",
          "bg-primary/20 blur-sm"
        )}
      />
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
