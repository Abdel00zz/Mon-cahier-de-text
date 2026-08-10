import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useLocale } from "@/i18n/LocaleProvider"
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss"

const SheetDismissContext = React.createContext<(() => void) | undefined>(undefined)

const Sheet = ({ children, onOpenChange, ...props }: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Root>) => {
  const dismiss = React.useCallback(() => onOpenChange?.(false), [onOpenChange])
  return (
    <SheetDismissContext.Provider value={dismiss}>
      <SheetPrimitive.Root onOpenChange={onOpenChange} {...props}>{children}</SheetPrimitive.Root>
    </SheetDismissContext.Provider>
  )
}

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "sheet-overlay fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "sheet-content fixed z-50 gap-3 overflow-y-auto overscroll-contain bg-white/90 dark:bg-slate-950/90 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/50 dark:ring-slate-800/50 backdrop-blur-2xl custom-scrollbar pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-5 data-[state=open]:animate-in data-[state=closed]:animate-out duration-300 ease-in-out will-change-transform",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[28px] border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-[min(86vw,22rem)] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm rounded-r-[28px]",
        right:
          "inset-y-0 right-0 h-full w-[min(86vw,22rem)] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm rounded-l-[28px]",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  side?: "top" | "bottom" | "left" | "right"
  /** Callback used when the mobile bottom sheet is swiped down from its handle. */
  onSwipeDown?: () => void
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, onSwipeDown, style, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, ...props }, ref) => {
  const { isRtl } = useLocale()
  const inheritedDismiss = React.useContext(SheetDismissContext)
  const dismiss = onSwipeDown ?? inheritedDismiss
  const swipe = useSwipeToDismiss({ onDismiss: dismiss ?? (() => undefined), enabled: side === "bottom" && Boolean(dismiss) })
  return (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      data-side={side}
      dir={isRtl ? "rtl" : "ltr"}
      className={cn("rtl-flow", swipe.isDragging && "select-none", sheetVariants({ side }), className)}
      style={{ ...style, ...swipe.dragStyle }}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        if (!event.defaultPrevented) swipe.onPointerDown(event)
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event)
        if (!event.defaultPrevented) swipe.onPointerMove(event)
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event)
        if (!event.defaultPrevented) swipe.onPointerUp(event)
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event)
        if (!event.defaultPrevented) swipe.onPointerCancel(event)
      }}
      {...props}
    >
      {side === "bottom" && (
        <div data-swipe-dismiss-handle aria-hidden className="absolute left-1/2 top-2.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-slate-300/80 dark:bg-slate-700 sm:hidden" />
      )}
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("font-display text-lg font-bold tracking-[-0.02em] text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-xs font-medium leading-relaxed text-muted-foreground/85", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
}
