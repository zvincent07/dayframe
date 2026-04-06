import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISpendingEntry {
  price: number;
  item: string;
  description?: string;
}

export interface IJournalSpending extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  currency: string;
  spending: ISpendingEntry[];
  totalSpent?: number;
  createdAt: Date;
  updatedAt: Date;
}

const JournalSpendingSchema = new Schema<IJournalSpending>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    currency: { type: String, default: "USD" },
    totalSpent: { type: Number, default: 0 },
    spending: [
      {
        price: { type: Number, required: true },
        item: { type: String, required: true },
        description: String,
      },
    ],
  },
  { timestamps: true, collection: "journal_spending" }
);

JournalSpendingSchema.index({ userId: 1, date: 1 }, { unique: true });

export const JournalSpending: Model<IJournalSpending> =
  mongoose.models.JournalSpending ||
  mongoose.model<IJournalSpending>("JournalSpending", JournalSpendingSchema);
