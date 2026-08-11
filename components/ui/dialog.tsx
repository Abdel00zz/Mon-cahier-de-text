import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "./icons";
import { cn } from "@/lib/utils";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogTrigger = DialogPrimitive.Trigger;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "dialog-overlay fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]",
      "data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out motion-reduce:animate-none",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideClose?: boolean;
  onSwipeDown?: () => void;
  /** Empêche toute fermeture hors bouton explicite (clic overlay, Échap). */
  blockDismiss?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, hideClose = false, onSwipeDown, blockDismiss = false, style, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerDownOutside, onEscapeKeyDown, ...props }, ref) => {
  const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const closeLabel = isRtl ? "إغلاق" : "Fermer";
  const swipe = useSwipeToDismiss({ onDismiss: onSwipeDown ?? (() => undefined), enabled: Boolean(onSwipeDown) });

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        dir={isRtl ? "rtl" : "ltr"}
        className={cn(
          "rtl-flow dialog-content fixed inset-x-0 bottom-0 top-auto z-50 grid h-fit min-h-0 max-h-[calc(var(--app-viewport-height,100dvh)-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden overscroll-contain rounded-t-[28px] rounded-b-none border border-border/40 bg-card p-0 text-card-foreground shadow-[0_8px_40px_rgba(0,0,0,0.08)] outline-none",
          "will-change-transform transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.4,0,1,1)]",
          "data-[state=open]:animate-sheet-in-bottom sm:data-[state=open]:animate-pop-in",
          "data-[state=closed]:translate-y-full data-[state=closed]:opacity-0 sm:data-[state=closed]:translate-y-0 sm:data-[state=closed]:scale-[0.97]",
          "motion-reduce:animate-none motion-reduce:transition-none motion-reduce:data-[state=closed]:translate-y-0 motion-reduce:data-[state=closed]:scale-100 motion-reduce:data-[state=closed]:opacity-100",
          "sm:inset-0 sm:m-auto sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100vw-2rem)] sm:rounded-[28px] sm:pb-0",
          "pb-[env(safe-area-inset-bottom)]",
          swipe.isDragging && "select-none",
          className
        )}
        style={{ ...style, ...swipe.dragStyle }}
        onPointerDownOutside={(e) => { onPointerDownOutside?.(e); if (blockDismiss) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { onEscapeKeyDown?.(e); if (blockDismiss) e.preventDefault(); }}
        onPointerDown={(e) => { onPointerDown?.(e); if (!e.defaultPrevented) swipe.onPointerDown(e); }}
        onPointerMove={(e) => { onPointerMove?.(e); if (!e.defaultPrevented) swipe.onPointerMove(e); }}
        onPointerUp={(e) => { onPointerUp?.(e); if (!e.defaultPrevented) swipe.onPointerUp(e); }}
        onPointerCancel={(e) => { onPointerCancel?.(e); if (!e.defaultPrevented) swipe.onPointerCancel(e); }}
        {...props}
      >
        <div data-swipe-dismiss-handle aria-hidden className="absolute left-1/2 top-2.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/30 sm:hidden" />
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className={cn(
              "dialog-close absolute top-3.5 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:top-4",
              isRtl ? "left-4" : "right-4"
            )}
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex min-w-0 flex-col space-y-1 pe-12 text-start", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(
    "dialog-footer relative z-10 flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5",
    className
  )} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-bold tracking-tight text-foreground sm:text-lg", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("max-w-2xl text-xs font-normal leading-relaxed text-muted-foreground sm:text-sm", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
