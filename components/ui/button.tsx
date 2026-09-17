import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer select-none touch-manipulation items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md,8px)] text-sm font-medium tracking-[-0.01em] ring-offset-background transition-[transform,box-shadow,background-color,border-color,opacity] duration-200 [transition-timing-function:cubic-bezier(0.2,0,0,1)] will-change-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground font-semibold shadow-xs hover:brightness-105 active:brightness-95",
        charcoal: "bg-[#212123] text-white hover:bg-[#2e2e33] dark:bg-[#2A2A2E] dark:hover:bg-[#34343A] active:scale-[0.97]",
        accent: "bg-primary text-primary-foreground font-semibold shadow-xs hover:brightness-105 active:brightness-95",
        destructive: "bg-destructive text-destructive-foreground shadow-xs hover:brightness-105 active:brightness-95",
        outline: "border border-border/80 bg-card text-foreground hover:bg-muted/60 active:brightness-95 shadow-2xs",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted active:brightness-95 shadow-2xs",
        ghost: "text-foreground/80 hover:bg-muted/60 hover:text-foreground active:bg-muted/80",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 min-h-[44px] sm:min-h-[40px] px-4 sm:px-5 py-2.5",
        sm: "h-8 min-h-[36px] sm:min-h-[32px] px-3 sm:px-3.5 text-xs font-semibold",
        lg: "h-11 min-h-[48px] sm:min-h-[44px] px-5 sm:px-6 text-base font-semibold",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-[36px] sm:min-w-[36px] p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
