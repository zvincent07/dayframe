"use client";

import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TopBarWidgets } from "@/components/shared/topbar-widgets";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CommandPalette } from "@/components/dashboard/command-palette";

const AdminSidebarMobile = dynamic(
  () => import("@/components/admin/admin-sidebar").then((mod) => mod.AdminSidebar),
  { ssr: false }
);

interface AdminHeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  systemTimezone?: string;
  dateFormat?: string;
}

export function AdminHeader({ user, systemTimezone, dateFormat }: AdminHeaderProps) {
  const pathname = usePathname();
  const [modifierKey, setModifierKey] = useState("Cmd");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user is on macOS
    if (typeof window !== "undefined") {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      // Use setTimeout to avoid synchronous state update warning during effect
      setTimeout(() => {
        setModifierKey(isMac ? "⌘" : "Ctrl");
      }, 0);
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <CommandPalette open={open} onOpenChange={setOpen} />
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost" className="md:hidden -ml-2" suppressHydrationWarning>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs p-0">
          <AdminSidebarMobile className="border-none" user={user} />
        </SheetContent>
      </Sheet>
      
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        {/* Breadcrumbs (Left) */}
        <div className="hidden md:flex items-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Admin</span>
          <span className="mx-2">/</span>
          <span className="capitalize">{pathname.split("/").pop() || "Dashboard"}</span>
        </div>

        {/* Global Search Placeholder (Middle) */}
        <div className="flex-1 flex justify-center max-w-md mx-auto">
          <Button 
            variant="outline" 
            className="w-full max-w-sm justify-between text-muted-foreground h-9 px-3 hidden md:flex" 
            onClick={() => setOpen(true)}
          >
            <span className="flex items-center">
              <Search className="mr-2 h-4 w-4" />
              <span>Search...</span>
            </span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">{modifierKey}</span>K
            </kbd>
          </Button>
        </div>

        <div className="ml-auto flex items-center justify-end gap-2 md:gap-4">
           <TopBarWidgets systemTimezone={systemTimezone} dateFormat={dateFormat} />
        </div>
      </div>
    </header>
  );
}
