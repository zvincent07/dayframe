import { Quote } from '@/models/Quote';
import connectDB from '@/lib/mongodb';
import { logger } from '@/lib/logger';

export class QuoteService {
  private static async logAudit(action: string, userId: string, details?: Record<string, any>) {
    try {
      const { AuditService } = await import("@/services/audit.service");
      const { User } = await import("@/models/User");
      const user = await User.findById(userId).select("email").lean();
      if (user) {
        await AuditService.log(action, undefined, "Quote", details, { id: userId, email: user.email || "" });
      }
    } catch (err) {
      logger.error("Failed to log quote audit", err);
    }
  }

  static async getQuotes(userId: string) {
    await connectDB();
    const quotes = await Quote.find({ userId }).sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(quotes));
  }

  static async createQuote(userId: string, data: { content: string; author?: string }) {
    await connectDB();
    const quote = await Quote.create({ userId, ...data });
    QuoteService.logAudit("QUOTE_CREATED", userId, { content: data.content }).catch(() => {});
    return JSON.parse(JSON.stringify(quote));
  }

  static async deleteQuote(userId: string, quoteId: string) {
    await connectDB();
    const quote = await Quote.findOne({ _id: quoteId, userId }).lean();
    if (quote) {
      QuoteService.logAudit("QUOTE_DELETED", userId, { content: (quote as any).content }).catch(() => {});
      await Quote.deleteOne({ _id: quoteId, userId });
    }
    return { success: true };
  }
}
