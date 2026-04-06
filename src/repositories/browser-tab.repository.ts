import connectDB, { toObjectId } from "@/lib/mongodb";
import { BrowserTabState, IBrowserTabState, IBrowserTabItem, IBrowserTabGroup } from "@/models/BrowserTab";
import mongoose from "mongoose";

export interface PlainBrowserTabState {
  tabs: IBrowserTabItem[];
  groups: IBrowserTabGroup[];
  activeTabId: string;
}

const EMPTY_STATE: PlainBrowserTabState = { tabs: [], groups: [], activeTabId: "" };

export class BrowserTabRepository {
  static async get(userId: string): Promise<PlainBrowserTabState> {
    await connectDB();
    const uid = toObjectId(userId);
    if (!uid) return EMPTY_STATE;
    const doc = await BrowserTabState.findOne({ userId: uid }).lean<IBrowserTabState>();
    if (!doc) return EMPTY_STATE;
    return {
      tabs: doc.tabs ?? [],
      groups: doc.groups ?? [],
      activeTabId: doc.activeTabId ?? "",
    };
  }

  static async save(
    userId: string,
    data: { tabs: IBrowserTabItem[]; groups: IBrowserTabGroup[]; activeTabId: string }
  ): Promise<PlainBrowserTabState> {
    await connectDB();
    const uid = toObjectId(userId);
    if (!uid) throw new Error("Invalid userId");

    const doc = await BrowserTabState.findOneAndUpdate(
      { userId: uid },
      { $set: { tabs: data.tabs, groups: data.groups, activeTabId: data.activeTabId } },
      { upsert: true, returnDocument: "after", lean: true }
    );
    if (!doc) throw new Error("Failed to save browser state");
    const plain = doc as unknown as IBrowserTabState;
    return {
      tabs: plain.tabs ?? [],
      groups: plain.groups ?? [],
      activeTabId: plain.activeTabId ?? "",
    };
  }
}
