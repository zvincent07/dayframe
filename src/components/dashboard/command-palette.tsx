"use client";

import * as React from "react";
import {
  Settings,
  User,
  LayoutDashboard,
  Book,
  Users,
  BarChart,
  FileText,
  Sun,
  LayoutGrid,
  Globe,
  Dumbbell,
  Newspaper,
  Bookmark,
  Activity,
  Shield,
  Sparkles,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useRouter, usePathname } from "next/navigation";
import { DialogProps } from "@radix-ui/react-dialog";

interface CommandPaletteProps extends DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onOpenChange, open]);

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages and commands…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {isAdmin ? (
          <>
            <CommandGroup heading="Admin">
              <CommandItem
                value="admin dashboard home overview /admin/dashboard"
                onSelect={() => runCommand(() => router.push("/admin/dashboard"))}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Admin Dashboard</span>
              </CommandItem>
              <CommandItem
                value="users manage people /admin/users"
                onSelect={() => runCommand(() => router.push("/admin/users"))}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Manage Users</span>
              </CommandItem>
              <CommandItem
                value="analytics stats charts /admin/analytics"
                onSelect={() => runCommand(() => router.push("/admin/analytics"))}
              >
                <BarChart className="mr-2 h-4 w-4" />
                <span>Analytics</span>
              </CommandItem>
              <CommandItem
                value="content moderation posts /admin/content"
                onSelect={() => runCommand(() => router.push("/admin/content"))}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>Content Moderation</span>
              </CommandItem>
              <CommandItem
                value="mentors /admin/mentors"
                onSelect={() => runCommand(() => router.push("/admin/mentors"))}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Mentors</span>
              </CommandItem>
              <CommandItem
                value="notifications /admin/notifications"
                onSelect={() => runCommand(() => router.push("/admin/notifications"))}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Notifications</span>
              </CommandItem>
              <CommandItem
                value="billing /admin/billing"
                onSelect={() => runCommand(() => router.push("/admin/billing"))}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="System">
              <CommandItem
                value="system settings admin /admin/settings"
                onSelect={() => runCommand(() => router.push("/admin/settings"))}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>System Settings</span>
                <CommandShortcut>⌘S</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </>
        ) : (
          <>
            <CommandGroup heading="Go to">
              <CommandItem
                value="today home start day /user/today"
                onSelect={() => runCommand(() => router.push("/user/today"))}
              >
                <Sun className="mr-2 h-4 w-4" />
                <span>Today</span>
              </CommandItem>
              <CommandItem
                value="dashboard overview summary /user/dashboard"
                onSelect={() => runCommand(() => router.push("/user/dashboard"))}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </CommandItem>
              <CommandItem
                value="journal diary notes /user/journal"
                onSelect={() => runCommand(() => router.push("/user/journal"))}
              >
                <Book className="mr-2 h-4 w-4" />
                <span>Journal</span>
              </CommandItem>
              <CommandItem
                value="browser web internet /user/browser"
                onSelect={() => runCommand(() => router.push("/user/browser"))}
              >
                <Globe className="mr-2 h-4 w-4" />
                <span>Browser</span>
              </CommandItem>
              <CommandItem
                value="workout gym fitness training /user/workout"
                onSelect={() => runCommand(() => router.push("/user/workout"))}
              >
                <Dumbbell className="mr-2 h-4 w-4" />
                <span>Workout</span>
              </CommandItem>
              <CommandItem
                value="news feed articles /user/news"
                onSelect={() => runCommand(() => router.push("/user/news"))}
              >
                <Newspaper className="mr-2 h-4 w-4" />
                <span>News</span>
              </CommandItem>
              <CommandItem
                value="bookmarks saved links /user/bookmarks"
                onSelect={() => runCommand(() => router.push("/user/bookmarks"))}
              >
                <Bookmark className="mr-2 h-4 w-4" />
                <span>Bookmarks</span>
              </CommandItem>
              <CommandItem
                value="activity log timeline /user/activity"
                onSelect={() => runCommand(() => router.push("/user/activity"))}
              >
                <Activity className="mr-2 h-4 w-4" />
                <span>Activity</span>
              </CommandItem>
              <CommandItem
                value="profile account me stats /user/profile"
                onSelect={() => runCommand(() => router.push("/user/profile"))}
              >
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              <CommandItem
                value="settings preferences account /user/settings"
                onSelect={() => runCommand(() => router.push("/user/settings"))}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
                <CommandShortcut>⌘S</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="security password 2fa /user/security"
                onSelect={() => runCommand(() => router.push("/user/security"))}
              >
                <Shield className="mr-2 h-4 w-4" />
                <span>Security</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
