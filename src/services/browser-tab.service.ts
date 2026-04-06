import { BrowserTabRepository, PlainBrowserTabState } from "@/repositories/browser-tab.repository";
import type { IBrowserTabItem, IBrowserTabGroup } from "@/models/BrowserTab";

const MAX_TABS = 100;
const MAX_GROUPS = 20;

export class BrowserTabService {
  static async getState(userId: string): Promise<PlainBrowserTabState> {
    return BrowserTabRepository.get(userId);
  }

  static async saveState(
    userId: string,
    data: { tabs: IBrowserTabItem[]; groups: IBrowserTabGroup[]; activeTabId: string }
  ): Promise<PlainBrowserTabState> {
    if (data.tabs.length > MAX_TABS) {
      throw new Error(`Too many tabs (max ${MAX_TABS})`);
    }
    if (data.groups.length > MAX_GROUPS) {
      throw new Error(`Too many groups (max ${MAX_GROUPS})`);
    }
    return BrowserTabRepository.save(userId, data);
  }
}
