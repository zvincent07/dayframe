"use client";

import { useState } from "react";
import { UserSidebar } from "@/components/dashboard/user-sidebar";
import { UserHeader } from "@/components/dashboard/user-header";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "@/components/dashboard/mobile-nav";
import { useSession } from "next-auth/react";

interface UserShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserShell({ children, user: initialUser }: UserShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();

  const user = initialUser ?? session?.user;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 md:h-[100dvh] md:max-h-[100dvh] md:flex-row md:overflow-hidden">
      {/* Desktop: sidebar fills column height; main column scrolls independently so the top bar stays put */}
      <aside
        className={cn(
          "hidden shrink-0 border-r bg-background transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:block md:h-full md:max-h-full md:overflow-y-auto md:overflow-x-hidden md:z-20",
          collapsed ? "md:w-[70px]" : "md:w-[280px]",
        )}
      >
        <UserSidebar 
          collapsed={collapsed} 
          onToggleCollapse={() => setCollapsed(!collapsed)} 
          user={user}
          className="border-none"
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:min-h-0 md:overflow-hidden">
        <UserHeader user={user} />
        <main className="shell-main shell-main-padding shell-main-mobile-bottom md:min-h-0 md:flex-1 md:overflow-y-auto md:overflow-x-hidden">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
