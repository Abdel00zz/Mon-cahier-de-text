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
      "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-slate-300 bg-slate-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b57d0]/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[#0b57d0] data-[state=checked]:bg-[#0b57d0] dark:border-slate-600 dark:bg-slate-700 dark:data-[state=checked]:border-[#a8c7fa] dark:data-[state=checked]:bg-[#a8c7fa]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-200 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 dark:bg-slate-900"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
