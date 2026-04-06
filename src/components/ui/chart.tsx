"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function ChartContainer({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn("h-[220px] sm:h-[260px] md:h-[320px] w-full", className)}>{children}</div>
}
