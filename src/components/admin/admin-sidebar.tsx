"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Settings,
  Shield,
  GraduationCap,
  BarChart3,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  MoreVertical,
  Activity,
  type LucideIcon,
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
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";

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
    label: "DASHBOARD",
    items: [
      {
        title: "Overview",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      {
        title: "Users",
        href: "/admin/users",
        icon: Users,
      },
      {
        title: "Mentors",
        href: "/admin/mentors",
        icon: GraduationCap,
      },
      {
        title: "Content",
        href: "/admin/content",
        icon: FileText,
      },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      {
        title: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
      },
      {
        title: "Billing",
        href: "/admin/billing",
        icon: CreditCard,
      },
      {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

interface AdminSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AdminSidebar({ 
  className, 
  collapsed = false, 
  onToggleCollapse, 
  user, 
  ...props 
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

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
            <Shield className="h-6 w-6 text-emerald-500 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]" />
            <div 
              className={cn(
                "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap",
                collapsed ? "w-0 opacity-0 -translate-x-2" : "w-auto opacity-100 ml-2 translate-x-0"
              )}
            >
              <h2 className="text-lg font-semibold tracking-tight">
                Admin Panel
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
                      {collapsed && (
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

        {/* Toggle Button (Always visible at bottom now) */}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                onClick={handleChildClick}
                className={cn(
                  "w-full justify-start px-0 hover:bg-muted/50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", 
                  collapsed ? "justify-center" : "px-2 py-6"
                )}
                suppressHydrationWarning
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
                    <span className="text-sm font-medium truncate w-full">{user?.name || "Admin User"}</span>
                    <span className="text-xs text-muted-foreground truncate w-full">{user?.email || "admin@example.com"}</span>
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
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault();
                  setTheme(theme === "dark" ? "light" : "dark");
                }}
              >
                {theme === "dark" ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                <span>Toggle theme</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
