import { User, IUser } from "@/models/User";
import connectDB, { toObjectId } from "@/lib/mongodb";
import { Role } from "@/permissions/roles";
import { SettingsRepository } from "@/repositories/settings.repository";
import { SETTINGS_KEYS, DEFAULT_CONFIG } from "@/types/settings";

export interface UserFilter {
  search?: string;
  role?: string;
  isBanned?: boolean;
  emailVerified?: boolean;
}

export class UserRepository {
  static async findByEmail(email: string): Promise<IUser | null> {
    await connectDB();
    // Rule 163: Prevent NoSQL injection (Mongoose handles basic string sanitization, but careful with objects)
    const user = await User.findOne({ email }).lean<IUser>(); // Rule 173: Return plain objects
    return user;
  }

  static async findById(id: string): Promise<IUser | null> {
    await connectDB();
    try {
      return User.findById(id).lean<IUser>();
    } catch {
      // Handle invalid ObjectId format
      return null;
    }
  }

  static async findByGoogleId(googleId: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({ googleId }).lean<IUser>();
  }

  static async findByUsername(username: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({ username }).lean<IUser>();
  }

  static async findByUsernameWithPassword(username: string): Promise<IUser | null> {
    await connectDB();
    // Cannot use .lean() directly here if we need to check password on the document, 
    // but .select('+password') returns a mongoose document usually. 
    // However, for consistency and Rule 173 (Return plain objects), we should convert to object.
    const user = await User.findOne({ username }).select("+password").lean<IUser>();
    return user;
  }

  static async findByEmailOrUsernameWithPassword(identifier: string): Promise<IUser | null> {
    await connectDB();
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    })
      .select("+password +twoFactorSecret +twoFactorBackupCodes")
      .lean<IUser>();
    return user;
  }

  static async findByIdWithPassword(id: string): Promise<IUser | null> {
    await connectDB();
    const uid = toObjectId(id);
    if (!uid) return null;
    const doc = await User.findById(uid).select("+password +twoFactorSecret +twoFactorBackupCodes").lean<IUser>();
    return doc;
  }

  /** Normal update to replace raw update, since dev hot reload shouldn't rely on raw collection access. */
  static async updateRaw(userId: string, fields: Record<string, unknown>): Promise<void> {
    await connectDB();
    const uid = toObjectId(userId);
    if (!uid) return;
    await User.updateOne({ _id: uid }, { $set: fields });
  }

  static async create(data: Partial<IUser>): Promise<IUser> {
    await connectDB();
    const user = await User.create(data);
    
    return user.toObject(); // Rule 173: Repositories return plain objects
  }

  static async update(userId: string, data: Partial<IUser>): Promise<IUser | null> {
    await connectDB();
    const uid = toObjectId(userId);
    if (!uid) {
      return null;
    }
    const raw = { ...(data as Record<string, unknown>) };
    delete raw._id;
    delete raw.__v;
    const payload = Object.fromEntries(
      Object.entries(raw).filter(([, value]) => value !== undefined)
    ) as Record<string, unknown>;
    if (Object.keys(payload).length === 0) {
      return User.findById(userId).lean<IUser>();
    }
    try {
      const result = await User.findByIdAndUpdate(
        userId,
        { $set: payload },
        { new: true, runValidators: true }
      ).lean<IUser | null>();
      return result ?? null;
    } catch {
      return null;
    }
  }

  static async updateLastLogin(userId: string): Promise<void> {
    await connectDB();
    await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
  }

  static async setResetToken(email: string, token: string, expires: Date): Promise<IUser | null> {
    await connectDB();
    // Using findOneAndUpdate to ensure we get the updated document back
    const result = await User.findOneAndUpdate(
      { email },
      {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
      { returnDocument: 'after' }
    ).lean<IUser>();
    return result;
  }

  static async findByResetToken(token: string): Promise<{ user: IUser | null, error?: string }> {
    await connectDB();
    
    // 1. Find user by token only
    const user = await User.findOne({ resetPasswordToken: token }).select("+password").lean<IUser>();
    
    if (!user) {
      return { user: null, error: "Invalid reset token" };
    }

    // 2. Check expiry
    if (!user.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {
      return { user: null, error: "Reset token has expired" };
    }

    return { user };
  }

  static async findByVerificationToken(token: string): Promise<{ user: IUser | null, error?: string }> {
    await connectDB();
    
    // 1. Find user by token
    const user = await User.findOne({ emailVerificationToken: token }).lean<IUser>();
    
    if (!user) {
      return { user: null, error: "Invalid verification token" };
    }

    // 2. Check expiry (if you want to enforce expiry, which is good practice)
    // Assuming you have emailVerificationExpires field in your User model
    if (user.emailVerificationExpires && new Date() > new Date(user.emailVerificationExpires)) {
      return { user: null, error: "Verification token has expired" };
    }

    return { user };
  }

  static async verifyEmail(userId: string): Promise<IUser | null> {
    await connectDB();
    const result = await User.findByIdAndUpdate(
      userId,
      {
        emailVerified: new Date(),
        emailVerificationToken: null as unknown as string,
        emailVerificationExpires: null as unknown as Date,
      },
      { returnDocument: 'after' }
    ).lean<IUser>();
    return result;
  }

  static async setVerificationToken(email: string, token: string, expires: Date): Promise<IUser | null> {
    await connectDB();
    const result = await User.findOneAndUpdate(
      { email },
      {
        emailVerificationToken: token,
        emailVerificationExpires: expires,
      },
      { returnDocument: 'after' }
    ).lean<IUser>();
    return result;
  }

  static async upsertGoogleUser(profile: { email: string; name: string; image?: string; googleId: string }): Promise<IUser> {
    await connectDB();
    const { email, name, image, googleId } = profile;
    
    // Check if user exists first
    let user = await User.findOne({ email }).lean<IUser>();

    if (!user) {
      // New user - Check public registration setting
      const allowPublicRegistration = (await SettingsRepository.get(SETTINGS_KEYS.ALLOW_PUBLIC_REGISTRATION) as boolean) ?? DEFAULT_CONFIG.allowPublicRegistration;
      if (!allowPublicRegistration) {
        throw new Error("Public registration is disabled.");
      }
    }

    user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          image,
          avatarUrl: image,
          googleId,
          emailVerified: new Date(),
          lastLogin: new Date(),
        },
        $setOnInsert: {
          role: 'user', // Default role for new users
        }
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean<IUser>();
    
    // Safety check - should not happen if upsert works
    if (!user) throw new Error("Failed to upsert user");

    return user;
  }

  // Admin Methods
  static async findAll(
    page: number = 1, 
    limit: number = 10, 
    filter: UserFilter = {}
  ): Promise<{ users: IUser[], total: number, pages: number }> {
    await connectDB();
    
    const query: Record<string, unknown> = {};
    
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { email: { $regex: filter.search, $options: 'i' } },
        { username: { $regex: filter.search, $options: 'i' } }
      ];
    }
    
    if (filter.role && filter.role !== 'all') {
      query.role = filter.role as Role;
    }
    
    if (filter.isBanned !== undefined) {
      query.isBanned = filter.isBanned;
    }

    if (filter.emailVerified !== undefined) {
      if (filter.emailVerified) {
        // Use 'as unknown as Date' to bypass strict type checking for Mongoose query operators on Date fields
        query.emailVerified = { $ne: null } as unknown as Date;
      } else {
        query.emailVerified = null as unknown as Date;
      }
    }

    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find(query as unknown as Parameters<typeof User.find>[0])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IUser[]>(),
      User.countDocuments(query as unknown as Parameters<typeof User.countDocuments>[0])
    ]);

    return {
      users,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  static async delete(userId: string): Promise<boolean> {
    await connectDB();
    const result = await User.findByIdAndDelete(userId);
    return !!result;
  }
}
