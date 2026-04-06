import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: "draft" | "published";
  tags: string[];
  coverImage?: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String },
    content: { type: String, required: true },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    tags: [{ type: String }],
    coverImage: { type: String },
    author: { type: String, required: true },
  },
  { timestamps: true }
);

export const BlogPost: Model<IBlogPost> =
  mongoose.models.BlogPost || mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);
