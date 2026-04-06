import mongoose, { Schema, Document, Model } from "mongoose";

// Rule 106: Schemas are mandatory.
// Rule 108: Avoid deep nesting. Prefer references when needed.
// Journal data is split into separate collections: Journal (core), JournalMedia, JournalFood, JournalSpending, JournalTasks, JournalWorkouts.

export interface IMentorComment {
  mentorId: mongoose.Types.ObjectId;
  comment: string;
  createdAt: Date;
}

export interface IJournal extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  mainTask?: string;
  notes?: string;
  isBookmarked?: boolean;
  mentorsComments: IMentorComment[];
  createdAt: Date;
  updatedAt: Date;
}

const JournalSchema = new Schema<IJournal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    mainTask: { type: String },
    notes: { type: String },
    isBookmarked: { type: Boolean, default: false },
    mentorsComments: [
      {
        mentorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        comment: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, collection: "journals" }
);

JournalSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Journal: Model<IJournal> =
  mongoose.models.Journal || mongoose.model<IJournal>("Journal", JournalSchema);
