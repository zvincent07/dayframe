import { AuditLog, IAuditLog } from "@/models/AuditLog";
import connectDB from "@/lib/mongodb";
import { mongo } from "mongoose";

export interface AuditLogFilter {
  actorId?: string; // For exact ID match
  actor?: string; // For email or ID search
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

export class AuditLogRepository {
  static async create(log: Partial<IAuditLog>): Promise<IAuditLog> {
    await connectDB();
    const newLog = await AuditLog.create(log);
    return newLog.toObject(); // Use .toObject() or manual serialization if needed
  }

  static async find(
    page: number = 1,
    limit: number = 20,
    filter: AuditLogFilter = {}
  ): Promise<{ logs: IAuditLog[]; total: number; pages: number }> {
    await connectDB();

    const query: mongo.Filter<IAuditLog> = {};
    
    // Support searching by actor email or ID
    if (filter.actor) {
      query.$or = [
        { actorEmail: { $regex: filter.actor, $options: "i" } },
        { actorId: filter.actor }
      ];
    } else if (filter.actorId) {
      query.actorId = filter.actorId;
    }

    if (filter.action) query.action = { $regex: filter.action, $options: "i" };
    if (filter.startDate || filter.endDate) {
      // Initialize createdAt query object if it doesn't exist
      if (!query.createdAt) {
         query.createdAt = {};
      }
      
      const dateQuery = query.createdAt as { $gte?: Date; $lte?: Date };

      if (filter.startDate) dateQuery.$gte = filter.startDate;
      if (filter.endDate) {
        // Set end date to end of day if it's the same as start date or just provided
        const endOfDay = new Date(filter.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        dateQuery.$lte = endOfDay;
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query as unknown as Parameters<typeof AuditLog.find>[0]).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IAuditLog[]>(),
      AuditLog.countDocuments(query as unknown as Parameters<typeof AuditLog.countDocuments>[0]),
    ]);

    return {
      logs,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  static async findAll(filter: AuditLogFilter = {}): Promise<IAuditLog[]> {
    await connectDB();
    const query: mongo.Filter<IAuditLog> = {};
    
    if (filter.actor) {
      query.$or = [
        { actorEmail: { $regex: filter.actor, $options: "i" } },
        { actorId: filter.actor }
      ];
    } else if (filter.actorId) {
      query.actorId = filter.actorId;
    }

    if (filter.action) query.action = { $regex: filter.action, $options: "i" };
    if (filter.startDate || filter.endDate) {
      if (!query.createdAt) {
         query.createdAt = {};
      }
      
      const dateQuery = query.createdAt as { $gte?: Date; $lte?: Date };

      if (filter.startDate) dateQuery.$gte = filter.startDate;
      if (filter.endDate) {
        // Set end date to end of day if it's the same as start date or just provided
        const endOfDay = new Date(filter.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        dateQuery.$lte = endOfDay;
      }
    }

    return AuditLog.find(query as unknown as Parameters<typeof AuditLog.find>[0]).sort({ createdAt: -1 }).lean<IAuditLog[]>();
  }
}
