import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

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
      "dialog-overlay fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[4px]",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // style resserré et net : arrondis réduits (xl mobile / lg desktop),
        // espacement plus compact — sans toucher aux couleurs
        "dialog-content fixed inset-x-0 bottom-0 top-auto z-50 grid h-fit min-h-0 max-h-[calc(100dvh-0.75rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 overflow-hidden overscroll-contain rounded-t-[1.5rem] rounded-b-none border border-white/80 bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-card-foreground shadow-[0_-12px_42px_rgba(30,37,72,0.16)] backdrop-blur-2xl will-change-transform sm:inset-0 sm:m-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-1.5rem)] sm:rounded-xl sm:border-border/80 sm:p-5 sm:shadow-[0_26px_80px_rgba(30,37,72,0.18)]",
        className
      )}
      {...props}
    >
      <div aria-hidden className="mx-auto -mt-1 h-1.5 w-9 rounded-full bg-muted-foreground/25 sm:hidden" />
      {children}
      <DialogPrimitive.Close className="hidden">
        <span className="sr-only">Fermer la fenêtre</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1 pb-2 text-left",
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
      "relative z-10 flex shrink-0 flex-col-reverse gap-2 bg-card pt-2 shadow-[0_-8px_18px_-16px_rgba(30,37,72,0.55)] [&>button]:min-h-11 [&>button]:w-full [&>div]:w-full sm:flex-row sm:justify-end sm:[&>button]:w-auto",
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
      "font-display text-lg font-semibold leading-tight tracking-[-0.01em] text-foreground",
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
    className={cn("mt-1 text-xs font-medium leading-relaxed text-muted-foreground", className)}
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
