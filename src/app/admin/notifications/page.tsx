import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Bell, Mail } from "lucide-react";
import { SystemAlertForm } from "@/components/admin/notifications/system-alert-form";
import { EmailBlastForm } from "@/components/admin/notifications/email-blast-form";
import { getEmailTemplates } from "@/actions/content";

export default async function AdminNotificationsPage() {
  const templates = await getEmailTemplates();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifications & Communication" />

      <div className="grid gap-6 md:grid-cols-2">
        {/* SYSTEM ALERTS */}
        <Card className="flex flex-col h-full border-blue-500/20 shadow-sm shadow-blue-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">System Alerts</CardTitle>
              <CardDescription>Send global push and in-app alerts</CardDescription>
            </div>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-md">
              <Bell className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="flex-1">
             <div className="mt-2 text-sm text-muted-foreground bg-muted/50 border border-border/50 p-3 rounded-md mb-4">
              <strong>Warning:</strong> Broadcasting a System Alert immediately sends a notification payload to all active users globally.
            </div>
            <SystemAlertForm />
          </CardContent>
        </Card>

        {/* EMAIL CAMPAIGNS */}
        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div className="space-y-1">
               <CardTitle className="text-base font-semibold">Email Campaigns</CardTitle>
               <CardDescription>Dispatch newsletters via SES (Mock)</CardDescription>
            </div>
             <div className="p-2 bg-zinc-500/10 text-zinc-500 rounded-md">
              <Mail className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <EmailBlastForm templates={templates} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
