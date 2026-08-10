import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[90px] w-full rounded-2xl border border-slate-200/80 bg-[#f0f4f9] px-4 py-3 text-sm text-slate-900 transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-[#e9eef6] focus-visible:bg-white focus-visible:border-[#0b57d0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0b57d0]/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700/70 dark:bg-[#282a2c] dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:bg-[#313335] dark:focus-visible:bg-[#1e1f20] dark:focus-visible:border-[#a8c7fa]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
