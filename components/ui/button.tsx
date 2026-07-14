import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-[-0.01em] ring-offset-background transition-[color,background-color,border-color,box-shadow,transform] duration-200 active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-primary/90 bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05),_inset_0_1.5px_0_rgba(255,255,255,0.15)] hover:bg-primary/90 hover:shadow-[0_4px_12px_rgba(221,100,50,0.15)]",
        destructive:
          "border border-destructive/95 bg-destructive text-destructive-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05),_inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-destructive/90",
        outline:
          "border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-foreground hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900",
        secondary:
          "border border-border/40 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent/40 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-10 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-11 w-11",
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
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
