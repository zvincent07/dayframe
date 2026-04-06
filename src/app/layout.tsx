import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

import { Providers } from "@/components/providers"
import { MaintenanceCheck } from "@/components/maintenance-check";
import { SettingsService } from "@/services/settings.service";
import { auth } from "@/auth";

export async function generateMetadata(): Promise<Metadata> {
  const config = await SettingsService.getSystemConfig();
  
  return {
    title: config.appName,
    description: "Journaling application",
    icons: config.logoUrl ? [{ rel: "icon", url: config.logoUrl }] : undefined,
  };
}

 

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen font-sans bg-background text-foreground`}
      >
        <MaintenanceCheck />
        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          session={session}
        >
          {children}
          <Toaster position="top-center" closeButton />
        </Providers>
      </body>
    </html>
  );
}
