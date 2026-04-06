import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyTask extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  duration: string;
  isCompleted: boolean;
  lastCompletedAt: Date | null;
  lastCompletedDateKey?: string | null;
  lastTouchedDateKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const DailyTaskSchema = new Schema<IDailyTask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    duration: { type: String, default: '' },
    isCompleted: { type: Boolean, default: false },
    lastCompletedAt: { type: Date, default: null },
    lastCompletedDateKey: { type: String, default: null },
    lastTouchedDateKey: { type: String, default: null },
  },
  { timestamps: true, collection: "daily_tasks" }
);

export const DailyTask: Model<IDailyTask> =
  mongoose.models.DailyTask || mongoose.model<IDailyTask>('DailyTask', DailyTaskSchema);
