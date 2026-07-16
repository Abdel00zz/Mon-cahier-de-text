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
}: ModalProps) {
  const onChange = (open: boolean) => {
    if (!open && onClose) {
      onClose()
    }
  }

  const mwClass = maxWidthClassMap[maxWidth] || maxWidthClassMap.md

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent className={cn(mwClass, className)}>
        {(title || description) && (
          <DialogHeader
            className={cn(
              "modal-header shrink-0 border-b border-zinc-100 bg-white px-4 pb-3 pt-4 sm:px-5 sm:pb-3.5 sm:pt-[1.125rem]",
              headerClassName,
            )}
          >
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div
          className={cn(
            "modal-body custom-scrollbar min-h-0 min-w-0 scroll-pb-20 overflow-y-auto overscroll-contain bg-zinc-50/55 px-4 py-3.5 [overflow-anchor:none] sm:px-5 sm:py-4",
            !(title || description) && "pt-12",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer && (
          <DialogFooter
            className={cn(
              "modal-footer border-t border-zinc-100 bg-white px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-3",
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
