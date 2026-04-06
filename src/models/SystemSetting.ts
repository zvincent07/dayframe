import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemSetting extends Document {
  key: string;
  value: unknown;
  description?: string;
  updatedAt: Date;
  updatedBy: string;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, collection: "system_settings" }
);

// Prevent overwrite if compiled multiple times (Next.js hot reload issue)
export const SystemSetting: Model<ISystemSetting> =
  mongoose.models.SystemSetting || mongoose.model<ISystemSetting>("SystemSetting", SystemSettingSchema);
