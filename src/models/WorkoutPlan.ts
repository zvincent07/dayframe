import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWorkoutPlan extends Document {
  userId: mongoose.Types.ObjectId;
  title?: string;
  isActive: boolean; // Flag to indicate the currently active plan
  schedule: {
    sunday: string;
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "Push/Pull/Legs split" },
    isActive: { type: Boolean, default: false },
    schedule: {
      sunday: { type: String, default: "REST" },
      monday: { type: String, default: "REST" },
      tuesday: { type: String, default: "REST" },
      wednesday: { type: String, default: "REST" },
      thursday: { type: String, default: "REST" },
      friday: { type: String, default: "REST" },
      saturday: { type: String, default: "REST" },
    },
  },
  { timestamps: true, collection: "workout_plans" }
);

WorkoutPlanSchema.index({ userId: 1, isActive: 1 });

export const WorkoutPlan: Model<IWorkoutPlan> =
  mongoose.models.WorkoutPlan ||
  mongoose.model<IWorkoutPlan>("WorkoutPlan", WorkoutPlanSchema);

