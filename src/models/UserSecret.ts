import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserSecret extends Document {
  userId: mongoose.Types.ObjectId;
  provider: string;
  keyEnc: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSecretSchema = new Schema<IUserSecret>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, required: true, index: true },
    keyEnc: { type: String, required: true },
  },
  { timestamps: true, collection: "user_secrets" }
);

UserSecretSchema.index({ userId: 1, provider: 1 }, { unique: true });

export const UserSecret: Model<IUserSecret> =
  mongoose.models.UserSecret || mongoose.model<IUserSecret>("UserSecret", UserSecretSchema);

