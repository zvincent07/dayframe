"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider as NextThemesProvider } from "@/components/theme-provider"
import type { Session } from "next-auth"
import * as React from "react"

export function Providers({
  children,
  session,
  ...props
}: {
  children: React.ReactNode
  session?: Session | null
  [key: string]: unknown
}) {
  return (
    <SessionProvider 
      session={session} 
      refetchOnWindowFocus={true}
    >
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </SessionProvider>
  )
}
