"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Book,
  Bookmark,
  User,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  MoreVertical,
  Layout,
  Dumbbell,
  type LucideIcon,
  Globe,
  Monitor,
  Activity,
  Shield,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logout } from "@/actions/auth";
import Link from "next/link";
import { isDesktop } from "@/lib/desktop";

interface SidebarItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/user/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "News",
        href: "/user/news",
        icon: Globe,
      },
      {
        title: "Browser",
        href: "/user/browser",
        icon: Monitor,
      },
    ],
  },
  {
    label: "Personal",
    items: [
      {
        title: "Today",
        href: "/user/today",
        icon: Sun,
      },
      { title: "Journal", href: "/user/journal", icon: Book },
      { title: "Workout", href: "/user/workout", icon: Dumbbell },
      { title: "Bookmarks", href: "/user/bookmarks", icon: Bookmark },
      { title: "Profile", href: "/user/profile", icon: User },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        title: "Preferences",
        href: "/user/settings",
        icon: Settings,
      },
    ],
  },
];

interface UserSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const mountedStore = { mounted: false, listeners: new Set<() => void>() };
function subscribeMounted(cb: () => void) {
  mountedStore.listeners.add(cb);
  return () => mountedStore.listeners.delete(cb);
}
function getMountedSnapshot() {
  return mountedStore.mounted;
}
function getMountedServerSnapshot() {
  return false;
}
function useMounted() {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      mountedStore.mounted = true;
      mountedStore.listeners.forEach((l) => l());
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);
}

export function UserSidebar({ 
  className, 
  collapsed = false, 
  onToggleCollapse, 
  user, 
  ...props 
}: UserSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  const handleSidebarClick = () => {
    // Only toggle if collapsed and the click is on the container (not stopped by children)
    if (collapsed && onToggleCollapse) {
      onToggleCollapse();
    }
  };

  const handleChildClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className={cn(
        "relative flex flex-col h-full bg-background transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", 
        collapsed ? "cursor-pointer hover:bg-muted/5" : "",
        className
      )} 
      onClick={handleSidebarClick}
      {...props}
    >
      {/* Sidebar Content - Flex column to push profile to bottom */}
      <div className="flex-1 py-4 flex flex-col h-full overflow-hidden">
        {/* Header / Logo */}
        <div className={cn(
          "flex items-center mb-6 px-4 h-10 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0", 
          collapsed ? "justify-center px-2" : "justify-start"
        )}>
          <div className="flex items-center">
            <Layout className="h-6 w-6 text-emerald-500 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]" />
            <div 
              className={cn(
                "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap",
                collapsed ? "w-0 opacity-0 -translate-x-2" : "w-auto opacity-100 ml-2 translate-x-0"
              )}
            >
              <h2 className="text-lg font-semibold tracking-tight">
                DayFrame
              </h2>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={0}>
          <div className={cn(
            "px-2 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] space-y-6 overflow-y-auto overflow-x-hidden flex-1", 
            collapsed ? "flex flex-col items-center" : ""
          )}>
            {sidebarGroups.map((group) => (
              <div key={group.label} className={cn("space-y-1 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", collapsed ? "w-full flex flex-col items-center" : "")}>
                <div className={cn(
                  "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  collapsed ? "h-0 opacity-0 mb-0" : "h-auto opacity-100"
                )}>
                   <h4 className="mt-6 mb-2 whitespace-nowrap px-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </h4>
                </div>
               
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  
                  // Hide Browser on non-desktop environments entirely
                  if (item.href === "/user/browser" && !isDesktop()) return null;

                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          onClick={handleChildClick}
                          className={cn(
                            "flex items-center rounded-md transition-all duration-200 group relative overflow-hidden whitespace-nowrap",
                            collapsed 
                              ? "h-9 w-9 justify-center" 
                              : "px-3 py-2 text-sm font-medium w-full",
                            isActive 
                              ? "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium shadow-sm"
                              : "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className={cn(
                            "shrink-0 h-4 w-4 transition-colors", 
                            isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground group-hover:text-foreground"
                          )} />
                          
                          <span className={cn(
                            "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                            collapsed 
                              ? "w-0 opacity-0 absolute" 
                              : "w-auto opacity-100 ml-3 static"
                          )}>
                            {item.title}
                          </span>

                          {/* Active indicator removed for cleaner aesthetic */}
                        </Link>
                      </TooltipTrigger>
                      {collapsed && !(isDesktop() && pathname.startsWith("/user/browser")) && (
                        <TooltipContent side="right" className="flex items-center gap-4">
                          {item.title}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Toggle Button */}
        {onToggleCollapse && (
           <div className={cn("hidden md:flex px-4 py-2 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", collapsed ? "justify-center" : "justify-end")}>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { handleChildClick(e); onToggleCollapse(); }}
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
              >
                {collapsed ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
           </div>
        )}

        {/* User Profile Section */}
        <div className="mt-auto border-t p-4 shrink-0 overflow-hidden">
          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  onClick={handleChildClick}
                  className={cn(
                    "w-full justify-start px-0 hover:bg-muted/50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", 
                    collapsed ? "justify-center" : "px-2 py-6"
                  )}
                >
                  <div className={cn("flex items-center w-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", collapsed ? "justify-center gap-0" : "gap-3")}>
                    <Avatar className="h-9 w-9 border-2 border-background shadow-sm shrink-0">
                      <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "flex flex-col items-start text-left min-w-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
                      collapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 flex-1"
                    )}>
                      <span className="text-sm font-medium truncate w-full">{user?.name || "User"}</span>
                      <span className="text-xs text-muted-foreground truncate w-full">{user?.email || "user@example.com"}</span>
                    </div>
                    <div className={cn(
                      "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
                      collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    )}>
                      <MoreVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" forceMount>
                <DropdownMenuItem onClick={() => router.push("/user/activity")}>
                  <Activity className="mr-2 h-4 w-4" />
                  <span>My Activity</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/user/security")}>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Security</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start px-0 transition-all", 
                collapsed ? "justify-center" : "px-2 py-6"
              )}
            >
              <div className={cn("flex items-center w-full", collapsed ? "justify-center gap-0" : "gap-3")}>
                <Avatar className="h-9 w-9 border-2 border-background shadow-sm shrink-0">
                  <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-col items-start text-left min-w-0 overflow-hidden flex-1">
                    <span className="text-sm font-medium truncate w-full">{user?.name || "User"}</span>
                    <span className="text-xs text-muted-foreground truncate w-full">{user?.email || "user@example.com"}</span>
                  </div>
                )}
              </div>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
