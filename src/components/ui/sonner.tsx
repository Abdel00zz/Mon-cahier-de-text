import * as React from "react"
import {
  Check,
  Info,
  Loader2,
  X,
  TriangleAlert,
} from "./icons"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      duration={4500}
      visibleToasts={3}
      className="toaster group font-sans"
      icons={{
        success: <Check className="h-5 w-5 text-success-strong shrink-0" />,
        info: <Info className="h-5 w-5 text-primary shrink-0" />,
        warning: <TriangleAlert className="h-5 w-5 text-warning-strong shrink-0" />,
        error: <X className="h-5 w-5 text-destructive shrink-0" />,
        loading: <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none shrink-0" />,
      }}
      toastOptions={{
        classNames: {
          toast: "!py-3.5 !px-4 !min-h-0 !gap-3 !rounded-2xl !shadow-lg !border !border-border/70 !bg-card/95 !text-foreground backdrop-blur-md font-sans tracking-tight leading-tight",
          title: "!text-[13px] !font-semibold !leading-snug",
          description: "!text-[12px] !text-muted-foreground !leading-relaxed",
          actionButton: "!text-xs !font-semibold !min-h-11 !px-3 !rounded-xl !bg-primary !text-primary-foreground",
          cancelButton: "!text-xs !font-semibold !min-h-11 !px-3 !rounded-xl !bg-muted !text-foreground",
          closeButton: "!h-4 !w-4 !text-xs",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
