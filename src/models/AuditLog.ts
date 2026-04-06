import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  actorId: string;
  actorEmail: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true, index: true },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetId: { type: String, index: true },
    targetType: { type: String },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "audit_logs" } // Only createdAt matters for logs
);

// Prevent overwrite if compiled multiple times (Next.js hot reload issue)
export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
