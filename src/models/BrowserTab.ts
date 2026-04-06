import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBrowserTabItem {
  tabId: string;
  title: string;
  url: string;
  groupId: string | null;
  position: number;
}

export interface IBrowserTabGroup {
  groupId: string;
  name: string;
  color: string;
  collapsed: boolean;
  position: number;
}

export interface IBrowserTabState extends Document {
  userId: mongoose.Types.ObjectId;
  tabs: IBrowserTabItem[];
  groups: IBrowserTabGroup[];
  activeTabId: string;
  updatedAt: Date;
}

const BrowserTabItemSchema = new Schema<IBrowserTabItem>(
  {
    tabId: { type: String, required: true },
    title: { type: String, default: "New Tab" },
    url: { type: String, required: true },
    groupId: { type: String, default: null },
    position: { type: Number, default: 0 },
  },
  { _id: false }
);

const BrowserTabGroupSchema = new Schema<IBrowserTabGroup>(
  {
    groupId: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, default: "blue" },
    collapsed: { type: Boolean, default: false },
    position: { type: Number, default: 0 },
  },
  { _id: false }
);

const BrowserTabStateSchema = new Schema<IBrowserTabState>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    tabs: { type: [BrowserTabItemSchema], default: [] },
    groups: { type: [BrowserTabGroupSchema], default: [] },
    activeTabId: { type: String, default: "" },
  },
  { timestamps: true, collection: "browser_tabs" }
);

export const BrowserTabState: Model<IBrowserTabState> =
  mongoose.models.BrowserTabState || mongoose.model<IBrowserTabState>("BrowserTabState", BrowserTabStateSchema);
