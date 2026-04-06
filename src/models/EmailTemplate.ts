import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmailTemplate extends Document {
  name: string;
  subject: string;
  bodyHtml: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const EmailTemplate: Model<IEmailTemplate> =
  mongoose.models.EmailTemplate || mongoose.model<IEmailTemplate>("EmailTemplate", EmailTemplateSchema);
