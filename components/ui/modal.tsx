import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"
import { cn } from "@/lib/utils"

interface ModalProps {
  isOpen?: boolean
  onClose?: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string // e.g. "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"
  className?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string
  hideClose?: boolean
  swipeToDismiss?: boolean
  /** Empêche toute fermeture hors bouton explicite (clic overlay, Échap). */
  blockDismiss?: boolean
}

const maxWidthClassMap: Record<string, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  hideClose = false,
  swipeToDismiss = true,
  blockDismiss = false,
}: ModalProps) {
  const onChange = (open: boolean) => {
    if (!open && onClose) {
      onClose()
    }
  }

  const mwClass = maxWidthClassMap[maxWidth] || maxWidthClassMap.md

  // Toujours rendu : Radix garde le contenu monté pendant l'animation de
  // sortie, puis le démonte lui-même une fois celle-ci terminée.
  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent className={cn(mwClass, className)} hideClose={hideClose} blockDismiss={blockDismiss} onSwipeDown={swipeToDismiss ? onClose : undefined}>
        {(title || description) && (
          <DialogHeader
            className={cn(
              "modal-header shrink-0 border-b border-border bg-card/50 px-6 pt-6 pb-4 text-card-foreground",
              headerClassName,
            )}
          >
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div
          className={cn(
            "modal-body min-h-0 min-w-0 overflow-y-auto overscroll-contain px-6 py-5 [overflow-anchor:none]",
            !(title || description) && "pt-12",
            !footer && "pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer && (
          <DialogFooter
            className={cn(
              "modal-footer border-t border-border bg-card/50 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 text-card-foreground",
              footerClassName,
            )}
          >
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
