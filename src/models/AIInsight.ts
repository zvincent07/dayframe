import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAIInsight extends Document {
  userId: mongoose.Types.ObjectId;
  timeframe: "7d" | "30d" | "1y" | string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  summary?: string;
  insight: string;
  checksum?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AIInsightSchema = new Schema<IAIInsight>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    timeframe: { type: String, required: true },
    startDate: { type: String },
    endDate: { type: String },
    currency: { type: String },
    summary: { type: String },
    insight: { type: String, required: true },
    checksum: { type: String },
  },
  { timestamps: true, collection: "ai_insights" }
);

AIInsightSchema.index({ userId: 1, createdAt: -1 });

export const AIInsight: Model<IAIInsight> =
  mongoose.models.AIInsight || mongoose.model<IAIInsight>("AIInsight", AIInsightSchema);
