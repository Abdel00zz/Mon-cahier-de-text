import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums tracking-normal transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:brightness-110",
        secondary: "border-border/60 bg-secondary text-secondary-foreground hover:bg-muted",
        destructive: "border-destructive/20 bg-destructive/12 text-destructive-strong",
        outline: "border-border text-foreground/70",
        success: "border-success/20 bg-success/12 text-success-strong",
        warning: "border-warning/20 bg-warning/12 text-warning-strong",
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

export { Badge };
