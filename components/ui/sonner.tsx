import * as React from "react"
import {
  Info,
  Loader2,
  CircleX,
  TriangleAlert,
} from "./icons"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group font-sans"
      icons={{
        success: <div className="hidden" />,
        info: <Info className="h-3 w-3 text-cyan-500 shrink-0" />,
        warning: <TriangleAlert className="h-3 w-3 text-amber-500 shrink-0" />,
        error: <CircleX className="h-3 w-3 text-red-500 shrink-0" />,
        loading: <Loader2 className="h-3 w-3 animate-spin shrink-0" />,
      }}
      toastOptions={{
        classNames: {
          toast: "!py-2 !px-3 !min-h-0 !gap-2 !rounded-xl !shadow-sm !border !border-border/60 !bg-slate-900/95 !text-slate-50 dark:!bg-slate-800/95 dark:!text-slate-100 font-sans tracking-tight leading-tight",
          title: "!text-[13px] !font-semibold !leading-snug",
          description: "!text-[12px] !opacity-90 !leading-snug",
          actionButton: "!text-[12.5px] !font-semibold !h-9 !px-3 !rounded-lg",
          cancelButton: "!text-[12.5px] !font-semibold !h-9 !px-3 !rounded-lg",
          closeButton: "!h-4 !w-4 !text-xs",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

