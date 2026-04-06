import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuote extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<IQuote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    author: { type: String, default: '' },
  },
  { timestamps: true, collection: "quotes" }
);

export const Quote: Model<IQuote> =
  mongoose.models.Quote || mongoose.model<IQuote>('Quote', QuoteSchema);
