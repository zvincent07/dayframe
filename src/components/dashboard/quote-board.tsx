'use client';

import { useOptimistic, useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Quote as QuoteIcon, Loader2 } from 'lucide-react';
import { createQuote, deleteQuote } from '@/actions/quotes';
import { toast } from 'sonner';
import type { Quote } from '@/types/quote';

type QuoteOptimisticUpdate =
  | { type: 'reset' }
  | { type: 'add'; id: string; content: string; author: string }
  | { type: 'remove'; id: string }
  | { type: 'restore'; quote: Quote };

function quoteReducer(state: Quote[], update: QuoteOptimisticUpdate): Quote[] {
  switch (update.type) {
    case 'reset':
      return state;
    case 'add':
      return [{ _id: update.id, content: update.content, author: update.author }, ...state];
    case 'remove':
      return state.filter((q) => q._id !== update.id);
    case 'restore':
      return [update.quote, ...state];
    default:
      return state;
  }
}

export function QuoteBoard({ initialQuotes }: { initialQuotes: Quote[] }) {
  const router = useRouter();
  const [optimisticQuotes, addOptimistic] = useOptimistic(initialQuotes, quoteReducer);
  const [newQuote, setNewQuote] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    if (!newQuote.trim()) return;
    const content = newQuote.trim();
    const tempId = `temp-${Date.now()}`;
    setNewQuote('');

    startTransition(async () => {
      addOptimistic({ type: 'add', id: tempId, content, author: '' });
      const result = await createQuote(content);
      if (result.success && result.quote) {
        addOptimistic({ type: 'reset' });
        router.refresh();
        toast.success('Quote added');
      } else {
        addOptimistic({ type: 'remove', id: tempId });
        toast.error('Failed to add quote');
      }
    });
  };

  const handleDelete = (quoteId: string) => {
    const removed = optimisticQuotes.find((q) => q._id === quoteId);
    startTransition(async () => {
      addOptimistic({ type: 'remove', id: quoteId });
      const result = await deleteQuote(quoteId);
      if (!result.success) {
        if (removed) addOptimistic({ type: 'restore', quote: removed });
        toast.error('Failed to delete quote');
      } else {
        router.refresh();
      }
    });
  };

  const quotes = optimisticQuotes;

  return (
    <Card className="h-[450px] bg-card border-border/50 shadow-sm flex flex-col transition-colors">
      <CardHeader className="pb-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <QuoteIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">Quote Bank</h2>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="shrink-0 p-4 pb-0">
          <div className="flex items-stretch bg-muted/30 border border-border/50 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <Textarea
              placeholder="Add a new quote..."
              value={newQuote}
              onChange={(e) => setNewQuote(e.target.value)}
              rows={1}
              className="min-h-10 max-h-10 flex-1 resize-none border-0 bg-transparent py-2 pl-3 pr-2 text-sm leading-normal focus-visible:ring-0 placeholder:text-muted-foreground/50 touch-manipulation md:min-h-11 md:max-h-none md:py-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <div className="w-px self-stretch bg-border/50 shrink-0" />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCreate}
              disabled={isPending || !newQuote.trim()}
              className="h-10 w-10 shrink-0 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/50 md:h-9 md:w-9 touch-manipulation"
              aria-label="Add quote"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 mt-4 pb-2 pr-2">
          {quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 flex-1">
              <QuoteIcon className="w-8 h-8 text-zinc-800 mb-3" />
              <span className="text-muted-foreground/50 text-sm italic">No quotes added yet.</span>
            </div>
          ) : (
            quotes.map((quote) => (
              <div key={quote._id} className="relative group pl-4 py-1 border-l-2 border-emerald-500/40 hover:border-emerald-400 transition-colors">
                <p className="text-sm italic text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  &quot;{quote.content}&quot;
                </p>
                {quote.author && (
                  <p className="text-xs text-zinc-400 mt-1 font-medium uppercase tracking-wide">
                    — {quote.author}
                  </p>
                )}
                
                <button
                  onClick={() => handleDelete(quote._id)}
                  aria-label="Delete quote"
                  className="absolute top-1 right-0 p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
