import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dayframe_v2";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: String,
    username: { type: String, unique: true, sparse: true },
    password: { type: String, select: false },
    role: { type: String, enum: ["user", "mentor", "admin"], default: "user" },
    avatarUrl: String,
    googleId: String,
    bio: String,
    goals: [String],
    timezone: String,
  },
  { timestamps: true }
);

const SystemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, collection: "system_settings" }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
// Use existing compiled model if present to avoid recompilation errors
const SystemSetting =
  mongoose.models.SystemSetting || mongoose.model("SystemSetting", SystemSettingSchema);

type SeedResult = { status: "skipped" | "completed" | "partial" | "error"; details?: unknown };

async function upsertSystemSetting(
  session: mongoose.ClientSession | null,
  key: string,
  value: unknown,
  updatedBy: string,
  description?: string
) {
  const update: Record<string, unknown> = { value, updatedBy };
  if (description) update.description = description;
  return SystemSetting.findOneAndUpdate(
    { key },
    { $setOnInsert: { key }, $set: update },
    { upsert: true, returnDocument: "after", session: session ?? undefined, setDefaultsOnInsert: true }
  ).lean();
}

async function createOrEnsureAdmin(
  session: mongoose.ClientSession | null,
  email: string,
  username: string,
  password: string
) {
  const existing = await User.findOne({ email }).session(session ?? null).lean();
  if (existing) {
    return existing;
  }
  const hash = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { email },
    {
      $setOnInsert: {
        email,
        username,
        password: hash,
        name: "Admin",
        role: "admin",
        timezone: "UTC",
      },
    },
    { upsert: true, returnDocument: "after", session: session ?? undefined, setDefaultsOnInsert: true }
  ).lean();
}

export async function runSeed(): Promise<SeedResult> {
  const now = new Date().toISOString();
  if (process.env.SEED !== "true") {
    console.log(JSON.stringify({ at: now, level: "info", message: "seed_skipped_env_disabled" }));
    return { status: "skipped" };
  }
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PROD !== "true") {
    console.log(
      JSON.stringify({ at: now, level: "info", message: "seed_skipped_prod_guard" })
    );
    return { status: "skipped" };
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminUsername || !adminPassword) {
    console.error(JSON.stringify({ at: now, level: "error", message: "seed_missing_admin_env" }));
    return { status: "error", details: "missing_admin_env" };
  }

  console.log(
    JSON.stringify({
      at: now,
      level: "info",
      message: "seed_connecting",
      uri: MONGO_URI.replace(/\/\/[^@]+@/, "//***@"),
    })
  );
  await mongoose.connect(MONGO_URI);
  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      level: "info",
      message: "seed_connected",
      db: mongoose.connection.db?.databaseName ?? "unknown",
    })
  );

  let session: mongoose.ClientSession | null = null;
  try {
    const perform = async (sess: mongoose.ClientSession | null) => {
      const userCount = await User.countDocuments({}).session(sess ?? null);
      const isEmpty = userCount === 0;
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          level: "info",
          message: "seed_state_detected",
          users: userCount,
          isEmpty,
        })
      );

      const createdAdmin = await createOrEnsureAdmin(
        sess,
        adminEmail,
        adminUsername,
        adminPassword
      );

      const defaults = {
        app_name: "Dayframe Journal",
        app_description:
          "Capture your day, track your habits, and grow with mentorship. Your personal space for reflection and progress.",
        support_email: process.env.EMAIL_FROM || "support@dayframe.com",
        maintenance_mode: false,
        maintenance_message: "We are currently undergoing maintenance. Please check back later.",
        allow_public_registration: true,
        email_verification_required: true,
        system_timezone: "UTC",
        date_format: "MM/DD/YYYY",
        logo_url: undefined,
      } as Record<string, unknown>;

      let settingsUpserted = 0;
      for (const [key, value] of Object.entries(defaults)) {
        const res = await upsertSystemSetting(
          sess,
          key,
          value,
          (createdAdmin as any)?._id?.toString?.() || "system",
          "default"
        );
        if (res) settingsUpserted++;
      }
      await upsertSystemSetting(
        sess,
        "seed:version",
        1,
        (createdAdmin as any)?._id?.toString?.() || "system",
        "internal_seed_version"
      );

      return { isEmpty, settingsUpserted, createdAdmin };
    };

    const safeEnd = async (s: mongoose.ClientSession | null) => {
      if (!s) return;
      try {
        await s.abortTransaction();
      } catch {}
      try {
        s.endSession();
      } catch {}
    };

    let usedTransactions = false;
    try {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        usedTransactions = true;
        console.log(
          JSON.stringify({
            at: new Date().toISOString(),
            level: "info",
            message: "seed_txn_started",
          })
        );
      } catch {
        session = null;
        usedTransactions = false;
        console.log(
        JSON.stringify({ at: new Date().toISOString(), level: "info", message: "seed_no_txn" })
        );
      }

    // Optional guard: only use transactions if explicitly enabled
    const allowTxn = process.env.SEED_USE_TXN === "true";
    const effectiveSession = allowTxn ? session : null;
    if (!allowTxn && session) {
      try {
        await session.abortTransaction();
      } catch {}
      try {
        session.endSession();
      } catch {}
      session = null;
      usedTransactions = false;
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          level: "info",
          message: "seed_txn_skipped",
        })
      );
    }

    const { isEmpty, settingsUpserted, createdAdmin } = await perform(effectiveSession);

      try {
        if (effectiveSession) {
          await effectiveSession.commitTransaction();
        }
      } finally {
        await safeEnd(session);
      }
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          level: "info",
          message: "seed_completed",
          createdAdmin: !!createdAdmin,
          settingsUpserted,
          isEmpty,
          usedTransactions,
        })
      );
      await mongoose.disconnect();
      return { status: "completed", details: { isEmpty, settingsUpserted } };
    } catch (innerErr: unknown) {
      const msg =
        innerErr instanceof Error ? innerErr.message : typeof innerErr === "string" ? innerErr : "";
      let code: number | undefined;
      let codeName: string | undefined;
      if (typeof innerErr === "object" && innerErr !== null) {
        const maybe = innerErr as { code?: number; codeName?: string };
        code = maybe.code;
        codeName = maybe.codeName;
      }
      const txnUnsupported =
        msg.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
        msg.includes("replica set") ||
        msg.includes("mongos") ||
        code === 20 ||
        codeName === "IllegalOperation";

      await safeEnd(session);

      if (txnUnsupported) {
        console.log(
          JSON.stringify({
            at: new Date().toISOString(),
            level: "info",
            message: "seed_txn_unsupported_fallback",
          })
        );
        session = null;
        const { isEmpty, settingsUpserted, createdAdmin } = await perform(null);
        console.log(
          JSON.stringify({
            at: new Date().toISOString(),
            level: "info",
            message: "seed_completed",
            createdAdmin: !!createdAdmin,
            settingsUpserted,
            isEmpty,
            usedTransactions: false,
          })
        );
        await mongoose.disconnect();
        return { status: "completed", details: { isEmpty, settingsUpserted } };
      }
      throw innerErr;
    }
  } catch (err) {
    const end = async () => {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {}
        try {
          session.endSession();
        } catch {}
      }
    };
    await end();
    console.error(
      JSON.stringify({
        at: new Date().toISOString(),
        level: "error",
        message: "seed_failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
    try {
      await mongoose.disconnect();
    } catch {}
    return { status: "error", details: err };
  }
}

if (typeof require !== "undefined" && require.main === module) {
  runSeed()
    .then((res) => {
      const code = res.status === "error" ? 1 : 0;
      process.exit(code);
    })
    .catch(() => {
      process.exit(1);
    });
}
