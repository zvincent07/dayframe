import { Quote } from '@/models/Quote';
import connectDB from '@/lib/mongodb';

export class QuoteService {
  static async getQuotes(userId: string) {
    await connectDB();
    const quotes = await Quote.find({ userId }).sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(quotes));
  }

  static async createQuote(userId: string, data: { content: string; author?: string }) {
    await connectDB();
    const quote = await Quote.create({ userId, ...data });
    return JSON.parse(JSON.stringify(quote));
  }

  static async deleteQuote(userId: string, quoteId: string) {
    await connectDB();
    await Quote.deleteOne({ _id: quoteId, userId });
    return { success: true };
  }
}
