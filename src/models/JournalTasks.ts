import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITaskEntry {
  title: string;
  duration?: string;
  done: boolean;
}

export interface IJournalTasks extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  tasks: ITaskEntry[];
  /** Encrypted payload for sensitive fields (tasks). */
  enc?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JournalTasksSchema = new Schema<IJournalTasks>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    tasks: [
      {
        title: { type: String, required: true },
        duration: String,
        done: { type: Boolean, default: false },
      },
    ],
    enc: { type: String },
  },
  { timestamps: true, collection: "journal_tasks" }
);

JournalTasksSchema.index({ userId: 1, date: 1 }, { unique: true });

export const JournalTasks: Model<IJournalTasks> =
  mongoose.models.JournalTasks ||
  mongoose.model<IJournalTasks>("JournalTasks", JournalTasksSchema);
