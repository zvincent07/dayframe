import connectDB, { toObjectId } from "@/lib/mongodb";
import { Bookmark, IBookmark } from "@/models/Bookmark";

export class BookmarkRepository {
  static async list(userId: string): Promise<IBookmark[]> {
    await connectDB();
    const uid = toObjectId(userId);
    if (!uid) return [];
    const items = await Bookmark.find({ userId: uid }).sort({ createdAt: -1 }).lean<IBookmark[]>();
    return items;
  }

  static async create(userId: string, data: Partial<IBookmark>): Promise<IBookmark> {
    await connectDB();
    const uid = toObjectId(userId);
    if (!uid) {
      throw new Error("Invalid userId");
    }
    const created = await Bookmark.create({ userId: uid, ...data });
    return created.toObject();
  }

  static async update(userId: string, id: string, data: Partial<IBookmark>): Promise<IBookmark | null> {
    await connectDB();
    const uid = toObjectId(userId);
    const _id = toObjectId(id);
    if (!uid || !_id) return null;
    const updated = await Bookmark.findOneAndUpdate(
      { _id, userId: uid },
      data,
      { returnDocument: "after" }
    ).lean<IBookmark | null>();
    return updated;
  }

  static async delete(userId: string, id: string): Promise<void> {
    await connectDB();
    const uid = toObjectId(userId);
    const _id = toObjectId(id);
    if (!uid || !_id) return;
    await Bookmark.deleteOne({ _id, userId: uid });
  }

  static async setPlayInline(userId: string, id: string, playInline: boolean): Promise<IBookmark | null> {
    return this.update(userId, id, { playInline });
  }
}
