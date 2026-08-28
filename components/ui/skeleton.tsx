import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md bg-muted/70 will-change-transform", className)}
      {...props}
    />
  )
}

export { Skeleton }
