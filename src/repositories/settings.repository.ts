import { SystemSetting, ISystemSetting } from "@/models/SystemSetting";
import connectDB from "@/lib/mongodb";

export class SettingsRepository {
  static async get(key: string): Promise<unknown> {
    await connectDB();
    const setting = await SystemSetting.findOne({ key }).lean<ISystemSetting>();
    return setting?.value;
  }

  static async set(key: string, value: unknown, updatedBy: string, description?: string): Promise<ISystemSetting> {
    await connectDB();
    const update: Partial<ISystemSetting> = { value, updatedBy };
    if (description) update.description = description;

    const setting = await SystemSetting.findOneAndUpdate(
      { key },
      { $set: update },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean<ISystemSetting>();

    // If setting is null (which shouldn't happen with upsert and returnDocument: 'after'), throw or return
    if (!setting) throw new Error("Failed to set system setting");

    return setting;
  }

  static async getAll(): Promise<Record<string, unknown>> {
    await connectDB();
    const settings = await SystemSetting.find().lean<ISystemSetting[]>();
    return settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, unknown>);
  }
}
