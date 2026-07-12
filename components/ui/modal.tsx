import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"

interface ModalProps {
  isOpen?: boolean
  onClose?: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string // e.g. "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"
  className?: string
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
}: ModalProps) {
  const onChange = (open: boolean) => {
    if (!open && onClose) {
      onClose()
    }
  }

  const mwClass = maxWidthClassMap[maxWidth] || maxWidthClassMap.md

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent className={`${mwClass} ${className || ""}`}>
        {(title || description) && (
          <DialogHeader className="pb-3">
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {/* -mx-2/px-2 : la zone défilable déborde de 8 px de chaque côté puis
            se re-remplit — les anneaux de focus des champs ne sont plus COUPÉS
            à gauche/droite par l'overflow, sans décaler le contenu. */}
        <div className="custom-scrollbar -mx-2 min-h-0 min-w-0 scroll-pb-24 overflow-y-auto overscroll-contain px-2 py-1.5 [overflow-anchor:none]">{children}</div>
        {footer && <DialogFooter className="pt-3">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
