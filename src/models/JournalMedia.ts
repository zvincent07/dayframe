import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJournalMedia extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  images: string[];
  foodImages: string[];
  /** Encrypted payload for sensitive fields (images, foodImages). */
  enc?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JournalMediaSchema = new Schema<IJournalMedia>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    images: [{ type: String }],
    foodImages: [{ type: String }],
    enc: { type: String },
  },
  { timestamps: true, collection: "journal_media" }
);

JournalMediaSchema.index({ userId: 1, date: 1 }, { unique: true });

export const JournalMedia: Model<IJournalMedia> =
  mongoose.models.JournalMedia ||
  mongoose.model<IJournalMedia>("JournalMedia", JournalMediaSchema);
