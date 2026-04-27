import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFoodLog {
  morning?: string;
  lunch?: string;
  noon?: string;
  dinner?: string;
}

export interface IJournalFood extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  food: IFoodLog;
  /** Encrypted payload for sensitive fields (food). */
  enc?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JournalFoodSchema = new Schema<IJournalFood>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    food: {
      morning: String,
      lunch: String,
      noon: String,
      dinner: String,
    },
    enc: { type: String },
  },
  { timestamps: true, collection: "journal_foods" }
);

JournalFoodSchema.index({ userId: 1, date: 1 }, { unique: true });

export const JournalFood: Model<IJournalFood> =
  mongoose.models.JournalFood ||
  mongoose.model<IJournalFood>("JournalFood", JournalFoodSchema);
