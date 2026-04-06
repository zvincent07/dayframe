import { SettingsService } from "@/services/settings.service";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { hasPermission } from "@/permissions";

export async function MaintenanceCheck() {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Allow access to auth routes and admin routes
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login")
  ) {
    return null;
  }

  let isMaintenance = false;
  try {
    isMaintenance = await SettingsService.getMaintenanceMode();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Maintenance check failed:", error);
    // Fail open: if DB check fails, assume maintenance is OFF to avoid locking everyone out
    return null;
  }

  // Handle maintenance page access
  if (pathname.startsWith("/maintenance")) {
    if (!isMaintenance) {
      redirect("/");
    }
    return null;
  }

  if (isMaintenance) {
    const session = await auth();
    const canBypassMaintenance = hasPermission(session?.user, "manage:maintenance-mode");

    if (!canBypassMaintenance) {
      redirect("/maintenance");
    }
  }

  return null;
}
