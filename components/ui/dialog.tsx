import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "dialog-overlay fixed inset-0 z-50 bg-slate-950/32 backdrop-blur-[6px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideClose?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, hideClose = false, ...props }, ref) => {
  // Le portail Radix est volontairement autonome : il ne doit pas dépendre
  // d'un contexte React externe pour pouvoir afficher une modale au démarrage.
  const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl"
  const closeLabel = isRtl ? "إغلاق" : "Fermer"
  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "rtl-flow dialog-content fixed inset-x-0 bottom-0 top-auto z-50 grid h-fit min-h-0 max-h-[calc(var(--app-viewport-height,100dvh)-0.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden overscroll-contain rounded-t-[1.5rem] rounded-b-none border border-white/65 bg-card/96 p-0 text-card-foreground shadow-[0_-18px_55px_rgba(15,23,42,0.18)] outline-none backdrop-blur-[28px] backdrop-saturate-[1.8] will-change-transform data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full dark:border-white/10 sm:inset-0 sm:m-auto sm:max-h-[calc(100dvh-2.5rem)] sm:w-[calc(100vw-2rem)] sm:rounded-2xl sm:border-border/80 sm:shadow-[0_28px_90px_rgba(15,23,42,0.18),0_4px_18px_rgba(15,23,42,0.08)] sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      <div aria-hidden className="absolute left-1/2 top-2 h-1.5 w-9 -translate-x-1/2 rounded-full bg-muted-foreground/25 sm:hidden" />
      {children}
      {!hideClose && (
          <DialogPrimitive.Close
          aria-label={closeLabel}
          className={cn(
            "dialog-close absolute top-2 z-30 inline-flex !h-11 !w-11 items-center justify-center rounded-full border border-transparent bg-muted/75 text-muted-foreground transition-[background-color,color,transform] hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:top-4 sm:!h-8 sm:!w-8",
            isRtl ? "left-3 sm:left-4" : "right-3 sm:right-4",
          )}
        >
          <X className="h-4 w-4" strokeWidth={2} />
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
      "flex min-w-0 flex-col space-y-1 pe-10 text-start",
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
    /* Pas de trait séparateur : l'espacement suffit, aucune ligne parasite. */
    className={cn(
      "dialog-footer relative z-10 flex shrink-0 flex-col-reverse gap-1.5 sm:flex-row sm:items-center sm:justify-end sm:gap-2",
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
      "font-display text-[15px] font-extrabold leading-tight tracking-[-0.018em] text-zinc-900 sm:text-base",
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
    className={cn("max-w-2xl text-[11px] font-medium leading-relaxed text-zinc-500 sm:text-xs", className)}
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
