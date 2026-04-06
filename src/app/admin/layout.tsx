import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { SettingsService } from "@/services/settings.service";
import { hasPermission } from "@/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || !hasPermission(session.user, "view:settings")) {
    redirect("/");
  }

  // Fetch system configuration for the admin shell
  const config = await SettingsService.getSystemConfig();

  return (
    <AdminShell 
      user={session.user} 
      systemTimezone={config.systemTimezone}
      dateFormat={config.dateFormat}
    >
      {children}
    </AdminShell>
  );
}
