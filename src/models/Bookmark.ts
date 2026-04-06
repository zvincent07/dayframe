import mongoose, { Schema, Document, Model } from "mongoose";

export type BookmarkType = "video" | "article" | "other";

export interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  url: string;
  type: BookmarkType;
  title?: string;
  description?: string;
  image?: string;
  domain: string;
  provider?: string | null;
  videoId?: string | null;
  playInline?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    url: { type: String, required: true },
    type: { type: String, enum: ["video", "article", "other"], required: true },
    title: { type: String },
    description: { type: String },
    image: { type: String },
    domain: { type: String, required: true, index: true },
    provider: { type: String, default: null },
    videoId: { type: String, default: null },
    playInline: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "bookmarks" }
);

BookmarkSchema.index({ userId: 1, createdAt: -1 });

export const Bookmark: Model<IBookmark> =
  mongoose.models.Bookmark || mongoose.model<IBookmark>("Bookmark", BookmarkSchema);
