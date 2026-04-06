import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserActivity extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD format in user's timezone
  createdAt: Date;
}

const UserActivitySchema = new Schema<IUserActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true },
  },
  { timestamps: { updatedAt: false }, collection: "user_activities" } // Only createdAt is needed
);

// Ensure a user can only have one activity entry per day
UserActivitySchema.index({ userId: 1, date: 1 }, { unique: true });

export const UserActivity: Model<IUserActivity> =
  mongoose.models.UserActivity ||
  mongoose.model<IUserActivity>("UserActivity", UserActivitySchema);
