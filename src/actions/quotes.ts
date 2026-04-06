'use server';

import { auth } from '@/auth';
import { QuoteService } from '@/services/quote.service';
import { revalidatePath } from 'next/cache';

export async function getQuotes() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return await QuoteService.getQuotes(session.user.id);
}

export async function createQuote(content: string, author: string = '') {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    const quote = await QuoteService.createQuote(session.user.id, { content, author });
    revalidatePath('/user/today');
    return { success: true, quote };
  } catch {
    return { error: 'Failed to create quote' };
  }
}

export async function deleteQuote(quoteId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    await QuoteService.deleteQuote(session.user.id, quoteId);
    revalidatePath('/user/today');
    return { success: true };
  } catch {
    return { error: 'Failed to delete quote' };
  }
}
