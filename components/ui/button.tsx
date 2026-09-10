import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md,0.625rem)] text-sm font-medium tracking-normal ring-offset-background transition-[transform,box-shadow,background-color,border-color,opacity] duration-200 [transition-timing-function:cubic-bezier(0.2,0,0,1)] will-change-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm shadow-primary/15 hover:brightness-110 active:brightness-90 hover:shadow-md hover:shadow-primary/25 active:shadow-xs",
        accent: "bg-primary text-primary-foreground shadow-sm shadow-primary/15 hover:brightness-110 active:brightness-90 hover:shadow-md hover:shadow-primary/20",
        destructive: "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/15 hover:brightness-110 active:brightness-90 hover:shadow-md hover:shadow-destructive/25",
        outline: "border border-border bg-card text-foreground hover:bg-muted hover:text-foreground hover:border-primary/40 active:brightness-95 shadow-2xs",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted active:brightness-95 shadow-2xs",
        ghost: "text-foreground/75 hover:bg-muted hover:text-foreground active:bg-muted/80 active:brightness-95",
        link: "text-primary underline-offset-4 hover:underline hover:brightness-110 active:brightness-90",
      },
      size: {
        default: "h-9 min-h-[36px] px-4 py-2",
        sm: "h-8 min-h-[32px] px-3 text-xs font-semibold",
        lg: "h-11 min-h-[44px] px-8 text-base font-semibold",
        icon: "h-9 w-9 min-h-[36px] min-w-[36px] p-0",
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
