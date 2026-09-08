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
      "peer group/switch relative inline-flex h-11 w-12 shrink-0 cursor-pointer items-center rounded-xl bg-transparent touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45",
      className
    )}
    {...props}
    ref={ref}
  >
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-2 h-7 rounded-full border border-muted-foreground/35 bg-muted shadow-inner transition-colors duration-200 group-data-[state=checked]/switch:border-primary group-data-[state=checked]/switch:bg-primary group-hover/switch:brightness-105 motion-reduce:transition-none" />
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute left-1 top-3 block h-5 w-5 rounded-full bg-slate-50 shadow-[0_1px_3px_rgb(0_0_0/0.25)] ring-1 ring-black/5 transition-transform duration-200 ease-out data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 rtl:data-[state=checked]:translate-x-0 rtl:data-[state=unchecked]:translate-x-5 motion-reduce:transition-none"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
