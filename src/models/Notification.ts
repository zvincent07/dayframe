import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  type: "alert" | "announcement" | "email"; 
  isGlobal: boolean;
  status: "published" | "draft";
  userId?: mongoose.Types.ObjectId; 
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["alert", "announcement", "email"], required: true },
    isGlobal: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ["published", "draft"], default: "draft", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { 
    timestamps: true,
    collection: "notifications"
  }
);

// Prevent mongoose overwrite
export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
