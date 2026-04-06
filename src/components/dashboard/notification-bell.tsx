"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getGlobalNotifications } from "@/actions/notifications";
import { isDesktop } from "@/lib/desktop";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

export type ClientNotification = {
  _id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const isBrowserTabOverlay = typeof window !== "undefined" && isDesktop() && pathname === "/user/browser";

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const data = await getGlobalNotifications();
        setNotifications(data);
        if (data.length > 0) {
          // In a real app we'd compare this to a user's 'lastRead' timestamp.
          // For now, if there is a notification, we show the badge until clicked.
          setHasUnread(true);
        }
      } catch (err) {
        console.error("Failed to load notifications", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative focus-visible:ring-0 focus-visible:ring-offset-0"
      onClick={(e) => {
        if (isBrowserTabOverlay) {
          e.preventDefault();
          setHasUnread(false);
          toast.info("Exit browser to view notifications.");
        }
      }}
    >
      <Bell className="h-5 w-5 text-muted-foreground" />
      {hasUnread && (
        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-background"></span>
        </span>
      )}
    </Button>
  );

  if (isBrowserTabOverlay) {
    return triggerButton;
  }

  return (
    <DropdownMenu onOpenChange={(open) => {
      if (open) setHasUnread(false);
    }}>
      <DropdownMenuTrigger asChild>
        {triggerButton}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="font-semibold text-base py-3">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            You're all caught up!
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((notif) => (
              <DropdownMenuItem
                key={notif._id}
                className="flex flex-col items-start p-4 hover:bg-muted/50 focus:bg-muted cursor-default border-b border-border/40 last:border-0"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="font-semibold text-sm leading-none text-foreground">
                    {notif.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground mt-2 line-clamp-3">
                  {notif.message}
                </span>
                {notif.type === "alert" && (
                  <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded mt-2">
                    System Alert
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
