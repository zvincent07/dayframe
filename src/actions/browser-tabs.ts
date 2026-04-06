"use server";

import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import { BrowserTabService } from "@/services/browser-tab.service";
import { browserTabStateSchema } from "@/schemas/browser-tabs";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export interface BrowserTabStateResponse {
  tabs: { tabId: string; title: string; url: string; groupId: string | null; position: number }[];
  groups: { groupId: string; name: string; color: string; collapsed: boolean; position: number }[];
  activeTabId: string;
}

export async function getBrowserTabs(): Promise<BrowserTabStateResponse> {
  const session = await auth();
  if (!session?.user?.id) return { tabs: [], groups: [], activeTabId: "" };
  requirePermission(session.user, "view:own-browser-tabs");
  const state = await BrowserTabService.getState(session.user.id);
  return {
    tabs: state.tabs.map((t) => ({
      tabId: t.tabId,
      title: t.title,
      url: t.url,
      groupId: t.groupId,
      position: t.position,
    })),
    groups: state.groups.map((g) => ({
      groupId: g.groupId,
      name: g.name,
      color: g.color,
      collapsed: g.collapsed,
      position: g.position,
    })),
    activeTabId: state.activeTabId,
  };
}

export async function saveBrowserTabs(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  requirePermission(session.user, "update:own-browser-tabs");

  const allowed = await rateLimit(`browser-tabs:save:${session.user.id}`, 50);
  if (!allowed) return { success: false, error: "Too many requests" };

  const parsed = browserTabStateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid browser tab data" };
  }

  try {
    await BrowserTabService.saveState(session.user.id, parsed.data);
    return { success: true };
  } catch (err) {
    logger.error("saveBrowserTabs error", err as unknown);
    return { success: false, error: "Failed to save browser tabs" };
  }
}
