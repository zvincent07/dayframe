import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer } from "lucide-react";
import { SettingsService } from "@/services/settings.service";

export default async function MaintenancePage() {
  const config = await SettingsService.getSystemConfig();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Hammer className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Under Maintenance</CardTitle>
          <CardDescription>
            {config.appName} is currently unavailable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {config.maintenanceMessage}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
