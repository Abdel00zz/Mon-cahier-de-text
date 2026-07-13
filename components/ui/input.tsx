import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // style récent : arrondi net, anneau de focus 3 px semi-transparent
          // COLLÉ à la bordure (sans offset) — jamais coupé par un overflow
          "flex h-11 w-full rounded-lg border border-input bg-background/85 px-3.5 py-2 text-base shadow-[0_1px_3px_rgba(30,37,72,0.035)] backdrop-blur-sm transition-[color,background-color,border-color,box-shadow] duration-200 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground placeholder:text-muted-foreground/85 hover:border-primary/25 focus-visible:border-ring focus-visible:bg-background focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
