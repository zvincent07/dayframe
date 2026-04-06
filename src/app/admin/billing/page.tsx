import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing & Subscriptions" />
      <Card>
        <CardHeader>
          <CardTitle>Stripe Integration</CardTitle>
          <CardDescription>Monitor revenue, manage subscriptions, and configure plans.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-muted-foreground font-medium text-amber-500 bg-amber-500/10">
            To be continued for now
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
