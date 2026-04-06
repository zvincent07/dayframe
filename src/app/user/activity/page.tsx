import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityLog } from "@/components/dashboard/activity-log";

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user, "view:own-activity");

  return (
    <div className="space-y-6">
      <PageHeader title="My Activity" description="A log of your recent actions and security events." />
      <ActivityLog />
    </div>
  );
}
