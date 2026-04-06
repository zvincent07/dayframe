import { PageHeader } from "@/components/ui/page-header";
import { AdminOverview } from "@/components/admin/admin-overview";
import { getAdminDashboardStats } from "@/actions/admin-dashboard";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Admin Dashboard" />
      <AdminOverview initialStats={stats} />
    </div>
  );
}
