import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss"

const Dialog = DialogPrimitive.Root

const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "dialog-overlay fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 transition-all duration-300",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideClose?: boolean;
  /** Active la fermeture tactile sur la poignée ou l'en-tête de la feuille mobile. */
  onSwipeDown?: () => void;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, hideClose = false, onSwipeDown, style, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, ...props }, ref) => {
  const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl"
  const closeLabel = isRtl ? "إغلاق" : "Fermer"
  const swipe = useSwipeToDismiss({ onDismiss: onSwipeDown ?? (() => undefined), enabled: Boolean(onSwipeDown) })
  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      dir={isRtl ? "rtl" : "ltr"}
        className={cn(
          "rtl-flow dialog-content fixed inset-x-0 bottom-0 top-auto z-50 grid h-fit min-h-0 max-h-[calc(var(--app-viewport-height,100dvh)-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden overscroll-contain rounded-t-[28px] rounded-b-none border border-slate-200/50 bg-white/90 p-0 text-slate-900 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] outline-none backdrop-blur-2xl transition-all duration-300 will-change-transform data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full dark:border-slate-800/50 dark:bg-slate-950/90 dark:text-slate-100 sm:inset-0 sm:m-auto sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100vw-2rem)] sm:rounded-[28px] pb-[env(safe-area-inset-bottom)] sm:pb-0 sm:shadow-[0_28px_64px_-16px_rgba(0,0,0,0.22)] sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
          swipe.isDragging && "select-none",
          className
        )}
        style={{ ...style, ...swipe.dragStyle }}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          if (!event.defaultPrevented) swipe.onPointerDown(event);
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          if (!event.defaultPrevented) swipe.onPointerMove(event);
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          if (!event.defaultPrevented) swipe.onPointerUp(event);
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          if (!event.defaultPrevented) swipe.onPointerCancel(event);
        }}
        {...props}
      >
      <div data-swipe-dismiss-handle aria-hidden className="absolute left-1/2 top-2.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-slate-300/80 dark:bg-slate-700 sm:hidden" />
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className={cn(
            "dialog-close absolute top-3.5 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 sm:top-4",
            isRtl ? "left-4" : "right-4",
          )}
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
          <span className="sr-only">{closeLabel}</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex min-w-0 flex-col space-y-1 pe-12 text-start",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "dialog-footer relative z-10 flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("max-w-2xl text-xs font-normal leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
