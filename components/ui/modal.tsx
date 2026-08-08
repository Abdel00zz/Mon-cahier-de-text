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
}: ModalProps) {
  const onChange = (open: boolean) => {
    if (!open && onClose) {
      onClose()
    }
  }

  const mwClass = maxWidthClassMap[maxWidth] || maxWidthClassMap.md

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent className={cn(mwClass, className)} hideClose={hideClose}>
        {(title || description) && (
          <DialogHeader
            className={cn(
              "modal-header shrink-0 bg-card text-card-foreground px-5 pt-5 pb-2 sm:px-6 sm:pt-6",
              headerClassName,
            )}
          >
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div
          className={cn(
            "modal-body custom-scrollbar min-h-0 min-w-0 scroll-pb-20 overflow-y-auto overscroll-contain bg-background/50 px-5 py-4 [overflow-anchor:none] sm:px-6 sm:py-5",
            !(title || description) && "pt-12",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer && (
          <DialogFooter
            className={cn(
              "modal-footer bg-card text-card-foreground px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4",
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
