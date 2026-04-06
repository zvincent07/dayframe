import { z } from "zod";

export const GROUP_COLORS = [
  "red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink",
] as const;

export type GroupColor = (typeof GROUP_COLORS)[number];

const tabItemSchema = z.object({
  tabId: z.string().min(1),
  title: z.string().max(500).default("New Tab"),
  url: z.string().max(4096),
  groupId: z.string().nullable().default(null),
  position: z.number().int().min(0),
});

const tabGroupSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().min(1).max(100),
  color: z.enum(GROUP_COLORS).default("blue"),
  collapsed: z.boolean().default(false),
  position: z.number().int().min(0),
});

export const browserTabStateSchema = z.object({
  tabs: z.array(tabItemSchema).max(100),
  groups: z.array(tabGroupSchema).max(20),
  activeTabId: z.string(),
});

export type BrowserTabStateInput = z.infer<typeof browserTabStateSchema>;
export type TabItemInput = z.infer<typeof tabItemSchema>;
export type TabGroupInput = z.infer<typeof tabGroupSchema>;
