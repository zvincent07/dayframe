import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWorkoutEntry {
  exercise: string;
  sets?: number;
  reps?: string;
  rpe?: number;
  weight?: any;
  history?: {
    set: number;
    targetWeight?: any;
    actualWeight?: any;
    targetReps?: number;
    actualReps?: number;
    completed?: boolean;
  }[];
}

export interface IJournalWorkouts extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  workouts: IWorkoutEntry[];
  finished?: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const JournalWorkoutsSchema = new Schema<IJournalWorkouts>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    workouts: [
      {
        exercise: { type: String, required: true },
        sets: Number,
        reps: String,
        rpe: Number,
        weight: { type: Schema.Types.Mixed },
        history: [
          {
            set: { type: Number, required: true },
            targetWeight: { type: Schema.Types.Mixed },
            actualWeight: { type: Schema.Types.Mixed },
            targetReps: Number,
            actualReps: Number,
            completed: Boolean,
          },
        ],
      },
    ],
    finished: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "journal_workouts" }
);

JournalWorkoutsSchema.index({ userId: 1, date: 1 }, { unique: true });

// Force re-registration in dev to ensure schema changes are picked up
if (process.env.NODE_ENV === "development" && mongoose.models.JournalWorkouts) {
  delete (mongoose.models as any).JournalWorkouts;
}

export const JournalWorkouts: Model<IJournalWorkouts> =
  mongoose.models.JournalWorkouts ||
  mongoose.model<IJournalWorkouts>("JournalWorkouts", JournalWorkoutsSchema);
