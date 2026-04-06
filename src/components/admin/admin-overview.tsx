"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { 
  Users, 
  CreditCard, 
  Activity, 
  AlertTriangle,
  Server, 
  Megaphone,
  Download,
  AlertOctagon,
  TrendingUp,
  CheckCircle2,
  Settings,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/journal-utils";
import { useRouter } from "next/navigation";
import { toggleMaintenance, exportDailyReport } from "@/actions/admin-dashboard";
import { useTransition } from "react";

export type AdminDashboardStats = {
  kpis: {
    totalUsers: number;
    activeSubscriptions: number;
  };
  activity: Array<{ title: string; desc: string; time: string }>;
  health: {
    cpu: number;
    memory: number;
    storage: number;
    uptime: number;
  };
};

export function AdminOverview({ initialStats }: { initialStats: AdminDashboardStats }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleExportDailyReport = () => {
    startTransition(async () => {
      try {
        const res = await exportDailyReport();
        if (res.error) {
          toast.error(res.error);
          return;
        }
        if (res.success && res.data) {
          const blob = new Blob([res.data], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `daily-report-${new Date().toISOString().split("T")[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("Daily report exported");
        }
      } catch (err) {
        toast.error("An error occurred");
      }
    });
  };

  const handleToggleMaintenance = () => {
    startTransition(async () => {
      try {
        const res = await toggleMaintenance();
        if (res.error) {
          toast.error(res.error);
          return;
        }
        if (res.success) {
          toast.success(`Maintenance mode ${res.enabled ? "enabled" : "disabled"}`);
          router.refresh();
        }
      } catch (err) {
        toast.error("An error occurred");
      }
    });
  };

  const activityFeed = initialStats.activity.length > 0 
    ? initialStats.activity.map(a => ({
        icon: Settings,
        color: "text-zinc-500",
        bg: "bg-zinc-500/10",
        title: a.title,
        desc: a.desc,
        time: formatDistanceToNow(new Date(a.time), { addSuffix: true })
      }))
    : [
        { 
          icon: Users,
          color: "text-zinc-500",
          bg: "bg-zinc-500/10",
          title: "System initialized", 
          desc: "Audit logs are empty.", 
          time: "Just now" 
        }
      ];

  return (
    <div className="space-y-6">
      {/* KPI WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <div className="text-2xl font-semibold">{initialStats.kpis.totalUsers.toLocaleString()}</div>
                <span className="text-xs text-emerald-400 font-medium">+0% from last week</span>
              </div>
              <div className="shadow-sm rounded-md p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-muted-foreground">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <div className="text-2xl font-semibold">0</div>
                <span className="text-xs text-amber-500 font-medium">To be continued for now</span>
              </div>
              <div className="shadow-sm rounded-md p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-muted-foreground">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <div className="text-2xl font-semibold">{formatCurrency(12450, "USD")}</div>
                <span className="text-xs text-amber-500 font-medium">To be continued for now</span>
              </div>
              <div className="shadow-sm rounded-md p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-muted-foreground">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <div className="text-2xl font-semibold">0.12%</div>
                <span className="text-xs text-emerald-400 font-medium">steady this week</span>
              </div>
              <div className="shadow-sm rounded-md p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-muted-foreground">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RECENT ACTIVITY FEED */}
        <Card className="lg:col-span-2 flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system and user events</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-6">
              {activityFeed.map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${item.bg}`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                    <p className="text-xs text-muted-foreground opacity-70">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-6" onClick={() => router.push("/admin/settings?tab=logs")}>
              View All Logs
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: SYSTEM HEALTH & QUICK ACTIONS */}
        <div className="flex flex-col gap-6">
          
          {/* SYSTEM HEALTH */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="w-5 h-5 text-zinc-500" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">CPU Usage</span>
                    <span className="font-semibold">{initialStats.health.cpu}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${initialStats.health.cpu > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${initialStats.health.cpu}%` }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Memory (RAM)</span>
                    <span className="font-semibold">{initialStats.health.memory}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${initialStats.health.memory > 80 ? 'bg-red-500' : 'bg-amber-500'}`} 
                      style={{ width: `${initialStats.health.memory}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Storage</span>
                    <span className="font-semibold">{initialStats.health.storage}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${initialStats.health.storage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Uptime</span>
                  <span className="text-sm font-semibold">{initialStats.health.uptime} days</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QUICK ACTIONS */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-zinc-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-zinc-600 dark:text-zinc-400"
                  onClick={() => router.push("/admin/notifications")}
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  Global Announcement
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-zinc-600 dark:text-zinc-400"
                  onClick={handleExportDailyReport}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Export Daily Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/30"
                  onClick={handleToggleMaintenance}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertOctagon className="w-4 h-4 mr-2" />}
                  Toggle Maintenance
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
