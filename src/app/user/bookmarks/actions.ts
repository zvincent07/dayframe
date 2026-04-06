"use server";

import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import { revalidatePath } from "next/cache";
import { BookmarkService } from "@/services/bookmark.service";
import { addBookmarkSchema, updateBookmarkSchema } from "@/schemas/bookmarks";
import type { BookmarkType } from "@/models/Bookmark";
import { after } from "next/server";
import { AuditService } from "@/services/audit.service";

export interface BookmarkPageItem {
  _id: string;
  url: string;
  type: BookmarkType;
  title?: string;
  description?: string;
  image?: string;
  domain: string;
  provider?: string | null;
  videoId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function addBookmark(formData: FormData): Promise<{ success: boolean; item?: BookmarkPageItem; error?: string }> {
  const session = await auth();
  requirePermission(session?.user, "update:own-bookmarks");
  const url = String(formData.get("url") || "").trim();
  const parsed = addBookmarkSchema.safeParse({ url });
  if (!parsed.success) {
    return { success: false, error: "Invalid URL" };
  }
  try {
    const created = await BookmarkService.add(session!.user.id!, parsed.data.url);
    const idRaw = (created as { _id?: unknown })._id;
    const createdId = typeof idRaw === "string" ? idRaw : String(idRaw);
    const rawType = (created as { type?: string }).type || "other";
    const type = rawType === "video" ? "video" : rawType === "article" ? "article" : "other";
    after(async () => {
      await BookmarkService.refreshMeta(session!.user.id!, createdId, parsed.data.url, type);
      await AuditService.log("BOOKMARK_CREATED", createdId, "Bookmark", { url: parsed.data.url });
      revalidatePath("/user/bookmarks");
    });
    revalidatePath("/user/bookmarks");
    const idVal = (created as { _id?: unknown })._id;
    const createdAtVal = (created as { createdAt?: unknown }).createdAt;
    const updatedAtVal = (created as { updatedAt?: unknown }).updatedAt;
    const item: BookmarkPageItem = {
      _id: typeof idVal === "string" ? idVal : String(idVal),
      url: (created as { url?: string }).url || "",
      type,
      title: (created as { title?: string }).title,
      description: (created as { description?: string }).description,
      image: (created as { image?: string }).image,
      domain: (created as { domain?: string }).domain || "",
      provider: (created as { provider?: string | null }).provider ?? null,
      videoId: (created as { videoId?: string | null }).videoId ?? null,
      createdAt: createdAtVal instanceof Date ? createdAtVal.toISOString() : String(createdAtVal ?? ""),
      updatedAt: updatedAtVal instanceof Date ? updatedAtVal.toISOString() : String(updatedAtVal ?? ""),
    };
    return { success: true, item };
  } catch {
    return { success: false, error: "Failed to save bookmark" };
  }
}

export async function getBookmarks(): Promise<BookmarkPageItem[]> {
  const session = await auth();
  requirePermission(session?.user, "view:own-bookmarks");
  const list = await BookmarkService.list(session!.user.id!);
  const items: BookmarkPageItem[] = list.map(i => {
    const idVal = (i as { _id?: unknown })._id;
    const createdAtVal = (i as { createdAt?: unknown }).createdAt;
    const updatedAtVal = (i as { updatedAt?: unknown }).updatedAt;
    const rawType = (i as { type?: string }).type || "other";
    const type = rawType === "video" ? "video" : rawType === "article" ? "article" : "other";
    return {
      _id: typeof idVal === "string" ? idVal : String(idVal),
      url: (i as { url?: string }).url || "",
      type,
      title: (i as { title?: string }).title,
      description: (i as { description?: string }).description,
      image: (i as { image?: string }).image,
      domain: (i as { domain?: string }).domain || "",
      provider: (i as { provider?: string | null }).provider ?? null,
      videoId: (i as { videoId?: string | null }).videoId ?? null,
      createdAt: createdAtVal instanceof Date ? createdAtVal.toISOString() : String(createdAtVal ?? ""),
      updatedAt: updatedAtVal instanceof Date ? updatedAtVal.toISOString() : String(updatedAtVal ?? ""),
    };
  });
  return items;
}

export async function deleteBookmark(id: string) {
  const session = await auth();
  requirePermission(session?.user, "update:own-bookmarks");
  try {
    await BookmarkService.remove(session!.user.id!, id);
    after(async () => {
      await AuditService.log("BOOKMARK_DELETED", id, "Bookmark");
    });
    revalidatePath("/user/bookmarks");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete bookmark" };
  }
}

export async function updateBookmark(id: string, data: { title?: string; description?: string }) {
  const session = await auth();
  requirePermission(session?.user, "update:own-bookmarks");
  const parsed = updateBookmarkSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid data" };
  }
  const updated = await BookmarkService.update(session!.user.id!, id, parsed.data);
  if (!updated) return { success: false, error: "Not found" };
  revalidatePath("/user/bookmarks");
  return { success: true };
}

export async function toggleInline(id: string, enabled: boolean) {
  const session = await auth();
  requirePermission(session?.user, "update:own-bookmarks");
  const updated = await BookmarkService.setInline(session!.user.id!, id, enabled);
  if (!updated) return { success: false, error: "Not found" };
  revalidatePath("/user/bookmarks");
  return { success: true, playInline: updated.playInline };
}
