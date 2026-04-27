import mongoose, { Schema, Document, Model } from 'mongoose';
import { ROLES, Role } from '@/permissions/roles';

// Rule 106: Schemas are mandatory.
// Rule 107: Align schema with TypeScript interface.

export interface IUser extends Document {
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string;
  preferredCurrency?: string;
  preferredUnits?: "metric" | "imperial";
  /** Weekly calendars and Weekly Focus column order */
  firstDayOfWeek?: "sunday" | "monday";
  /**
   * Encrypt local, browser-cached session data (e.g. workout session drafts) so it isn't readable
   * from localStorage. This is client-side encryption; losing the session key will discard drafts.
   */
  encryptLocalCache?: boolean;
  
  // Auth provider fields
  password?: string; // Hashed password
  username?: string; // Optional unique username
  googleId?: string;
  emailVerified?: Date;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;

  // 2FA fields
  twoFactorSecret?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorBackupCodes?: string[];

  // Extended User Details (for profile/mentorship context)
  bio?: string;
  goals?: string[];
  timezone?: string; // Important for journal dates
  
  // Admin fields
  isBanned?: boolean;
  lastLogin?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    role: { type: String, enum: Object.keys(ROLES), default: 'user' },
    avatarUrl: { type: String },
    preferredCurrency: { type: String, default: "USD" },
    preferredUnits: { type: String, enum: ["metric", "imperial"], default: "metric" },
    firstDayOfWeek: { type: String, enum: ["sunday", "monday"], default: "sunday" },
    encryptLocalCache: { type: Boolean, default: false },
    
    // Auth fields
    password: { type: String, select: false }, // Security: Never return password by default
    username: { type: String, unique: true, sparse: true, trim: true, minlength: 3 },
    googleId: { type: String, unique: true, sparse: true },
    emailVerified: { type: Date },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    // 2FA
    twoFactorSecret: { type: String, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorBackupCodes: { type: [String], select: false },

    // Extended Details
    bio: { type: String, maxlength: 500 },
    goals: [{ type: String }],
    timezone: { type: String, default: 'UTC' },

    // Admin fields
    isBanned: { type: Boolean, default: false },
    lastLogin: { type: Date },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
    collection: "users"
  }
);

// Prevent model overwrite in development (hot reload)
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
