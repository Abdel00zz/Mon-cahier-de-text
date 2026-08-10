import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-normal transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0b57d0]/30",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#0b57d0] text-white hover:bg-[#0842a0] dark:bg-[#a8c7fa] dark:text-[#001d35]",
        secondary:
          "border-transparent bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3d7ef] dark:bg-[#004a77] dark:text-[#c2e7ff]",
        destructive:
          "border-transparent bg-[#fce8e6] text-[#c5221f] dark:bg-[#601410] dark:text-[#f2b8b5]",
        outline: "border-slate-300 text-slate-700 bg-white/80 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge }
