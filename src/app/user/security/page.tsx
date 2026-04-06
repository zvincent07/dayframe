import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SecuritySettings } from "@/components/dashboard/security-settings";

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user, "update:own-security");

  return (
    <div className="space-y-6">
      <PageHeader title="Security" description="Manage your password and two-factor authentication." />
      <SecuritySettings />
    </div>
  );
}
