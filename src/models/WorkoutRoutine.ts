import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWorkoutRoutineExercise {
  id?: string;
  exerciseId: string;
  targetSets: number;
  targetReps: string;
  targetRPE: number;
  targetWeight?: string;
  restTime: string;
}

export interface IWorkoutRoutine extends Document {
  userId: mongoose.Types.ObjectId;
  routineId: string;
  name: string;
  exercises: IWorkoutRoutineExercise[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutRoutineExerciseSchema = new Schema<IWorkoutRoutineExercise>(
  {
    id: { type: String },
    exerciseId: { type: String, required: true },
    targetSets: { type: Number, required: true },
    targetReps: { type: String, required: true },
    targetRPE: { type: Number, required: true },
    targetWeight: { type: String },
    restTime: { type: String, required: true },
  },
  { _id: false }
);

const WorkoutRoutineSchema = new Schema<IWorkoutRoutine>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    routineId: { type: String, required: true },
    name: { type: String, required: true },
    exercises: { type: [WorkoutRoutineExerciseSchema], default: [] },
  },
  { timestamps: true, collection: "workout_routines" }
);

WorkoutRoutineSchema.index({ userId: 1, routineId: 1 }, { unique: true });

export const WorkoutRoutine: Model<IWorkoutRoutine> =
  mongoose.models.WorkoutRoutine ||
  mongoose.model<IWorkoutRoutine>("WorkoutRoutine", WorkoutRoutineSchema);

