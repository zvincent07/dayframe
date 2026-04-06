import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function MentorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mentors" />
      <Card>
        <CardHeader>
          <CardTitle>Mentor Management</CardTitle>
          <CardDescription>Review applications, assign students, and monitor performance.</CardDescription>
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
