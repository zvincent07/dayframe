import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWeeklyFocus extends Document {
  userId: mongoose.Types.ObjectId;
  tasks: {
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

const WeeklyFocusSchema = new Schema<IWeeklyFocus>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    tasks: {
      sunday: { type: String, default: '' },
      monday: { type: String, default: '' },
      tuesday: { type: String, default: '' },
      wednesday: { type: String, default: '' },
      thursday: { type: String, default: '' },
      friday: { type: String, default: '' },
      saturday: { type: String, default: '' },
    },
  },
  { timestamps: true, collection: "weekly_focus" }
);

export const WeeklyFocus: Model<IWeeklyFocus> =
  mongoose.models.WeeklyFocus || mongoose.model<IWeeklyFocus>('WeeklyFocus', WeeklyFocusSchema);
