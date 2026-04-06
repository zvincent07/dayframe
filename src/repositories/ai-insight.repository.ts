import connectDB, { toObjectId } from "@/lib/mongodb";
import { AIInsight, IAIInsight } from "@/models/AIInsight";

export class AIInsightRepository {
  static async create(userId: string, data: { timeframe: string; startDate?: string; endDate?: string; currency?: string; summary?: string; insight: string; checksum?: string }) {
    await connectDB();
    const uid = toObjectId(userId);
    if (!uid) throw new Error("Invalid userId");
    const doc = await AIInsight.create({ userId: uid, ...data });
    return doc.toObject();
  }

  static async findByUser(userId: string, page = 1, limit = 10) {
    await connectDB();
    const uid = toObjectId(userId);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      AIInsight.find({ userId: uid })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IAIInsight[]>(),
      AIInsight.countDocuments({ userId: uid }),
    ]);
    return { items, total, pages: Math.ceil(total / limit) };
  }
}
