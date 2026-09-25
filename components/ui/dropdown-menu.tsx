/* ── Menu déroulant académique ───────────────────────────────────────────── */

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const DropdownMenu = ({ dir, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>) => {
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  return <DropdownMenuPrimitive.Root dir={dir ?? (isRtl ? 'rtl' : 'ltr')} {...props} />;
};
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "paper-menu modern-scrollbar z-[200] max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8.5rem] overflow-y-auto overflow-x-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-popover/95 dark:bg-popover/90 p-1.5 text-popover-foreground shadow-[0_16px_36px_-12px_rgba(0,0,0,0.18),0_4px_12px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_50px_-16px_rgba(0,0,0,0.65)] backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 text-start",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-150 ease-out",
          "origin-[--radix-dropdown-menu-content-transform-origin]",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  ));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
    destructive?: boolean;
  }
>(({ className, inset, destructive, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "group relative flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium outline-none transition-all duration-150 active:scale-[0.98]",
      "text-popover-foreground hover:bg-muted/70 hover:text-foreground focus:bg-muted/80 focus:text-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[2] [&_svg]:text-muted-foreground/80 group-hover:[&_svg]:text-foreground group-focus:[&_svg]:text-foreground group-hover:[&_svg]:scale-105 [&_svg]:transition-transform",
      inset && "ps-8",
      destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive font-semibold [&_svg]:text-destructive group-hover:[&_svg]:text-destructive",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border/60 dark:bg-white/10", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider",
      inset && "ps-8",
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
