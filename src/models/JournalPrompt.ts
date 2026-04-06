import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJournalPrompt extends Document {
  text: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const JournalPromptSchema = new Schema<IJournalPrompt>(
  {
    text: { type: String, required: true },
    category: { type: String, required: true, default: "General" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const JournalPrompt: Model<IJournalPrompt> =
  mongoose.models.JournalPrompt || mongoose.model<IJournalPrompt>("JournalPrompt", JournalPromptSchema);
