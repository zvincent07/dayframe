import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditLogTable } from "@/components/admin/settings/audit-log-table";
import { AuditLogToolbar } from "@/components/admin/settings/audit-log-toolbar";
import { getAuditLogs, getSystemConfig } from "@/app/admin/settings/actions";
import { Metadata } from "next";
import { SettingsTabs } from "@/components/admin/settings/settings-tabs";
import { GeneralSettings } from "@/components/admin/settings/general-settings";
import { PageHeader } from "@/components/ui/page-header";
import { SecuritySettings } from "@/components/dashboard/security-settings";

export const metadata: Metadata = {
  title: "Admin Settings | Dayframe",
  description: "System configuration and audit logs",
};

export default async function SettingsPage(props: {
  searchParams: Promise<{ 
    page?: string; 
    tab?: string;
    actor?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const systemConfig = await getSystemConfig();
  
  const page = Number(searchParams.page) || 1;
  const limit = 10;
  
  const filter = {
    actor: searchParams.actor,
    action: searchParams.action,
    startDate: searchParams.startDate ? new Date(searchParams.startDate) : undefined,
    endDate: searchParams.endDate ? new Date(searchParams.endDate) : undefined,
  };

  const logsData = await getAuditLogs(page, limit, filter);
  
  const logs = logsData.success ? logsData.logs : [];
  const totalPages = logsData.success ? logsData.pages : 1;
  const defaultTab = searchParams.tab || "general";

  return (
    <div className="flex flex-col gap-6 w-full max-w-[100vw]">
      <PageHeader title="Settings" />

      <SettingsTabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid h-9 w-full grid-cols-3 bg-muted/40 sm:inline-flex sm:h-10 sm:justify-start sm:w-auto border border-border/60">
          <TabsTrigger value="general" className="px-2 text-xs sm:px-5 sm:text-sm">General</TabsTrigger>
          <TabsTrigger value="security" className="px-2 text-xs sm:px-5 sm:text-sm">Security</TabsTrigger>
          <TabsTrigger value="logs" className="px-2 text-xs sm:px-5 sm:text-sm">Audit Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <GeneralSettings initialConfig={systemConfig} />
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4 w-full">
          <SecuritySettings />
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4 w-full">
          <Card className="w-full">
            <CardHeader className="px-4 md:px-6">
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                View detailed logs of administrative actions and system events.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              <div className="px-4 md:px-0">
                <AuditLogToolbar />
              </div>
              <div className="overflow-x-auto w-full scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                <AuditLogTable 
                  logs={logs} 
                  totalPages={totalPages} 
                  currentPage={page}
                  systemTimezone={systemConfig.systemTimezone}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </SettingsTabs>
    </div>
  );
}
