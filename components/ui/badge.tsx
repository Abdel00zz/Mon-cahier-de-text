import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-normal transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:brightness-110",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-muted",
        destructive: "border-transparent bg-destructive/12 text-destructive-strong",
        outline: "border-border text-foreground/70",
        success: "border-transparent bg-success/12 text-success-strong",
        warning: "border-transparent bg-warning/12 text-warning-strong",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
