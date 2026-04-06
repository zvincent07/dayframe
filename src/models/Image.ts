import mongoose, { Schema, Document, Model } from "mongoose";

export interface IImage extends Document {
  userId: mongoose.Types.ObjectId;
  filename: string;
  data: Buffer;
  contentType: string;
  type: "avatar" | "journal";
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema = new Schema<IImage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    filename: { type: String, required: true, unique: true, index: true },
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    type: { type: String, enum: ["avatar", "journal"], required: true },
  },
  { timestamps: true, collection: "images" }
);

export const Image: Model<IImage> =
  mongoose.models.Image || mongoose.model<IImage>("Image", ImageSchema);
