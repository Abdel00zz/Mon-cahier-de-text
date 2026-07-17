import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useLocale } from "@/i18n/LocaleProvider"

const Dialog = DialogPrimitive.Root

const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "dialog-overlay fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { isRtl, t } = useLocale()
  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "rtl-flow dialog-content fixed inset-x-0 bottom-0 top-auto z-50 grid h-fit min-h-0 max-h-[calc(100dvh-0.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden overscroll-contain rounded-t-[1.25rem] rounded-b-none border border-zinc-200/90 bg-white p-0 text-zinc-900 shadow-[0_-18px_55px_rgba(15,23,42,0.18)] outline-none will-change-transform sm:inset-0 sm:m-auto sm:max-h-[calc(100dvh-2.5rem)] sm:w-[calc(100vw-2rem)] sm:rounded-[1.25rem] sm:border-zinc-200/80 sm:shadow-[0_28px_90px_rgba(15,23,42,0.18),0_4px_18px_rgba(15,23,42,0.08)]",
        className
      )}
      {...props}
    >
      <div aria-hidden className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-zinc-300 sm:hidden" />
      {children}
      <DialogPrimitive.Close
        aria-label={t('common.close')}
        className="dialog-close absolute right-3 top-3 z-30 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-zinc-400 transition-colors hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:right-4 sm:top-4"
      >
        <X className="h-4 w-4" strokeWidth={2} />
        <span className="sr-only">Fermer la fenêtre</span>
      </DialogPrimitive.Close>
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
      "flex min-w-0 flex-col space-y-1 pr-10 text-left",
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
    /* Pas de trait séparateur : l'espacement suffit — aucune ligne parasite. */
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
