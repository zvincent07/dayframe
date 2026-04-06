"use client";

import { useOptimistic, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setMaintenanceMode } from "@/app/admin/settings/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface MaintenanceToggleProps {
  initialValue: boolean;
}

export function MaintenanceToggle({ initialValue }: MaintenanceToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticEnabled, setOptimisticEnabled] = useOptimistic(
    initialValue,
    (state, newState: boolean) => newState
  );

  const handleToggle = async (checked: boolean) => {
    startTransition(async () => {
      setOptimisticEnabled(checked);
      try {
        const result = await setMaintenanceMode(checked);
        if (result.success) {
          toast.success(checked ? "Maintenance mode enabled" : "Maintenance mode disabled");
        } else {
          // Revert handled by revalidation/next render or manual error toast
          toast.error(result.error || "Failed to update maintenance mode");
        }
      } catch {
        toast.error("An error occurred while updating maintenance mode");
      }
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="maintenance-mode"
        checked={optimisticEnabled}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
      <Label htmlFor="maintenance-mode" className="flex items-center gap-2 cursor-pointer">
        Maintenance Mode
        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
      </Label>
    </div>
  );
}
