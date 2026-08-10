import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-normal ring-offset-background transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b57d0]/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#0b57d0] text-white shadow-xs hover:bg-[#0842a0] hover:shadow-md dark:bg-[#a8c7fa] dark:text-[#001d35] dark:hover:bg-[#7cacf8]",
        destructive:
          "bg-[#b3261e] text-white shadow-xs hover:bg-[#8c1d18] hover:shadow-md dark:bg-[#f2b8b5] dark:text-[#601410] dark:hover:bg-[#ec928e]",
        outline:
          "border border-slate-300/80 bg-white text-slate-800 shadow-2xs hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-[#1e1f20] dark:text-slate-200 dark:hover:bg-slate-800",
        secondary:
          "bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3d7ef] dark:bg-[#004a77] dark:text-[#c2e7ff] dark:hover:bg-[#005c93]",
        ghost: "text-[#0b57d0] hover:bg-[#e8f0fe] dark:text-[#a8c7fa] dark:hover:bg-[#004a77]/40",
        link: "text-[#0b57d0] underline-offset-4 hover:underline dark:text-[#a8c7fa]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-xs font-medium",
        lg: "h-11 px-6 text-base font-medium",
        icon: "h-10 w-10 p-0 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const resolvedVariant = variant ?? "default"
    const resolvedSize = size ?? "default"
    return (
      <Comp
        data-slot="button"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={cn(buttonVariants({ variant: resolvedVariant, size: resolvedSize, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
