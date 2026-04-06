export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/ui/page-header";
import { getAnalyticsGrowth } from "@/actions/admin-analytics";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";

export default async function AnalyticsPage() {
  const data = await getAnalyticsGrowth();

  return (
    <div className="flex flex-col gap-6 w-full max-w-[100vw]">
      <PageHeader title="Analytics" />
      <AnalyticsCharts data={data} />
    </div>
  );
}
