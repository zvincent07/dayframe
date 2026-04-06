"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Home,
  Dumbbell,
  Book,
  LayoutDashboard,
  Menu,
  Globe,
  Bookmark,
  User,
  Settings,
  Activity,
  Shield,
  LogOut,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";

const primaryNav = [
  { href: "/user/today", icon: Home, label: "Today" },
  { href: "/user/journal", icon: Book, label: "Journal" },
  { href: "/user/workout", icon: Dumbbell, label: "Workout" },
  { href: "/user/dashboard", icon: LayoutDashboard, label: "Dashboard" },
] as const;

const moreNav = [
  { href: "/user/news", icon: Globe, label: "News" },
  { href: "/user/bookmarks", icon: Bookmark, label: "Bookmarks" },
  { href: "/user/profile", icon: User, label: "Profile" },
  { href: "/user/settings", icon: Settings, label: "Preferences" },
  { href: "/user/activity", icon: Activity, label: "My activity" },
  { href: "/user/security", icon: Shield, label: "Security" },
] as const;

function isPrimaryActive(pathname: string, href: string): boolean {
  if (href === "/user/today") return pathname === "/user/today" || pathname === "/user";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMoreActive(pathname: string): boolean {
  if (primaryNav.some((p) => isPrimaryActive(pathname, p.href))) return false;
  return pathname.startsWith("/user/");
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutPending, startLogout] = useTransition();
  const moreHighlighted = isMoreActive(pathname);

  const handleLogout = () => {
    startLogout(async () => {
      setMoreOpen(false);
      await logout();
    });
  };

  return (
    <>
      <nav
        className="md:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] left-3 right-3 z-50 rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-card/85"
        aria-label="Primary"
      >
        <ul className="grid grid-cols-5 gap-1 p-1.5">
          {primaryNav.map(({ href, icon: Icon, label }) => {
            const active = isPrimaryActive(pathname, href);
            return (
              <li key={href} className="flex min-w-0 justify-center">
                <Link
                  href={href}
                  title={label}
                  aria-label={label}
                  className={cn(
                    "flex h-12 w-full max-w-[3.75rem] items-center justify-center rounded-xl transition-colors",
                    active
                      ? "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-6 w-6 shrink-0" aria-hidden />
                </Link>
              </li>
            );
          })}
          <li className="flex min-w-0 justify-center">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex h-12 w-full max-w-[4rem] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium leading-tight transition-colors",
                moreHighlighted
                  ? "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              aria-label="More navigation and account"
            >
              <Menu className="h-5 w-5 shrink-0" aria-hidden />
              {/* <span className="max-w-full truncate px-0.5">More</span> */}
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] rounded-t-2xl border-border px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-2"
        >
          <SheetHeader className="space-y-1 border-b border-border pb-3 text-left">
            <SheetTitle className="text-lg">More</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              News, bookmarks, profile, and settings
            </SheetDescription>
          </SheetHeader>
          <nav className="flex max-h-[min(60dvh,28rem)] flex-col gap-1 overflow-y-auto py-3" aria-label="Additional pages">
            {moreNav.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
          <Separator className="my-2" />
          <Button
            type="button"
            variant="outline"
            className="mb-1 h-12 w-full justify-start gap-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={logoutPending}
            onClick={handleLogout}
          >
            {logoutPending ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <LogOut className="h-5 w-5 shrink-0" aria-hidden />
            )}
            Log out
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
