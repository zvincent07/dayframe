"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LogIn, LogOut, KeyRound, Shield, ShieldOff, Pencil, Trash2,
  Plus, BookOpen, RefreshCw, type LucideIcon, Clock, Globe, Activity,
  CheckCircle, Dumbbell, ShoppingBag, Utensils, Quote, Calendar, Soup
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMyActivity } from "@/actions/security";

interface LogEntry {
  id: string;
  action: string;
  targetType: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_META: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  LOGIN_SUCCESS: { icon: LogIn, label: "Signed in", color: "text-emerald-500" },
  LOGIN_FAILED: { icon: LogIn, label: "Failed sign-in attempt", color: "text-red-500" },
  LOGOUT: { icon: LogOut, label: "Signed out", color: "text-muted-foreground" },
  PASSWORD_CHANGED: { icon: KeyRound, label: "Password changed", color: "text-amber-500" },
  PASSWORD_RESET_REQUESTED: { icon: KeyRound, label: "Password reset requested", color: "text-amber-500" },
  PASSWORD_RESET_COMPLETED: { icon: KeyRound, label: "Password reset completed", color: "text-emerald-500" },
  "2FA_ENABLED": { icon: Shield, label: "Two-factor authentication enabled", color: "text-emerald-500" },
  "2FA_DISABLED": { icon: ShieldOff, label: "Two-factor authentication disabled", color: "text-red-500" },
  "2FA_SETUP_STARTED": { icon: Shield, label: "2FA setup initiated", color: "text-blue-500" },
  "2FA_BACKUP_CODE_USED": { icon: Shield, label: "Backup code used for 2FA", color: "text-amber-500" },
  PROFILE_UPDATED: { icon: Pencil, label: "Profile updated", color: "text-blue-500" },
  BOOKMARK_CREATED: { icon: Plus, label: "Bookmark added", color: "text-emerald-500" },
  BOOKMARK_DELETED: { icon: Trash2, label: "Bookmark deleted", color: "text-red-500" },
  JOURNAL_CREATED: { icon: BookOpen, label: "Journal entry created", color: "text-emerald-500" },
  JOURNAL_UPDATED: { icon: Pencil, label: "Journal entry updated", color: "text-blue-500" },
  PREFERENCES_UPDATED: { icon: RefreshCw, label: "Preferences updated", color: "text-blue-500" },
  TASK_COMPLETED: { icon: CheckCircle, label: "Task completed", color: "text-emerald-500" },
  TASK_UNCHECKED: { icon: Activity, label: "Task unchecked", color: "text-muted-foreground" },
  WORKOUT_FINISHED: { icon: Dumbbell, label: "Workout finished", color: "text-orange-600" },
  WEEKLY_FOCUS_UPDATED: { icon: Calendar, label: "Weekly focus set", color: "text-blue-500" },
  QUOTE_CREATED: { icon: Quote, label: "Inspiration added", color: "text-purple-500" },
  QUOTE_DELETED: { icon: Quote, label: "Inspiration removed", color: "text-rose-400" },
  SPENDING_LOGGED: { icon: ShoppingBag, label: "Expense recorded", color: "text-amber-600" },
  FOOD_LOGGED: { icon: Soup, label: "Nutrition logged", color: "text-orange-500" },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { icon: Activity, label: action.replace(/_/g, " ").toLowerCase(), color: "text-muted-foreground" };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function formatDetail(details: Record<string, unknown> | null): string | null {
  if (!details) return null;
  if (details.title) return String(details.title);

  // Weekly Focus
  if (details.day && details.focus) {
    const day = String(details.day).charAt(0).toUpperCase() + String(details.day).slice(1);
    return `${day}: ${details.focus}`;
  }

  // Quotes
  if (details.content && typeof details.content === 'string') {
    const clean = details.content.replace(/<[^>]*>?/gm, ''); // Remove HTML if present
    return clean.length > 60 ? `"${clean.substring(0, 60)}..."` : `"${clean}"`;
  }

  // Spending
  if (details.items && typeof details.items === 'string') {
    return details.items;
  }

  // Food/Nutrition
  if (details.calories !== undefined) {
    return `Estimated ${details.calories} calories logged`;
  }

  if (details.exercises && Array.isArray(details.exercises) && details.exercises.length > 0) {
    const list = details.exercises.slice(0, 2).join(", ");
    const more = details.exercises.length > 2 ? ` (+${details.exercises.length - 2} more)` : "";
    return `${list}${more}`;
  }
  if (details.provider) return `via ${String(details.provider)}`;
  if (details.method) return String(details.method);
  return null;
}

export function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [isPending, startTransition] = useTransition();

  const loadPage = (p: number) => {
    startTransition(async () => {
      const data = await getMyActivity(p);
      setLogs(data.logs);
      setPages(data.pages);
      setTotal(data.total);
      setPage(p);
    });
  };

  useEffect(() => { loadPage(1); }, []);

  if (!isPending && logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const meta = getActionMeta(log.action);
              const Icon = meta.icon;
              const detail = formatDetail(log.details);
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3.5">
                  <div className={cn("mt-0.5 rounded-full p-1.5 bg-muted/50 shrink-0", meta.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{meta.label}</p>
                    {detail && (
                      <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(log.createdAt)}
                    </span>
                    {log.ipAddress && log.ipAddress !== "unknown" && (
                      <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />
                        {log.ipAddress}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{total} total events</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isPending} onClick={() => loadPage(page - 1)}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages || isPending} onClick={() => loadPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
