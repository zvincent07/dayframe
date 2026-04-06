import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  isActive: boolean;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["info", "warning", "success"], default: "info" },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement || mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
