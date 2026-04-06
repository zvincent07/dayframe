"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  systemTimezone?: string;
  dateFormat?: string;
}

export function AdminShell({ children, user, systemTimezone, dateFormat }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 md:flex-row">
      {/* Desktop Sidebar Container */}
      <aside 
        className={cn(
          "hidden md:block shrink-0 z-20 border-r bg-background transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] sticky top-0 h-screen overflow-y-auto overflow-x-hidden",
          collapsed ? "w-[70px]" : "w-[280px]"
        )}
      >
        <AdminSidebar 
          collapsed={collapsed} 
          onToggleCollapse={() => setCollapsed(!collapsed)} 
          user={user}
          className="border-none"
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminHeader user={user} systemTimezone={systemTimezone} dateFormat={dateFormat} />
        <main className="shell-main shell-main-padding">
          {children}
        </main>
      </div>
    </div>
  );
}
