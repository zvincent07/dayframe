"use client";

import { useState } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Clock, ImageIcon, Utensils, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/journal-utils";
import Link from "next/link";

interface JournalHistoryEntry {
  _id: string;
  date: string;
  mainTask?: string;
  notes?: string;
  isBookmarked: boolean;
  lastEdited?: string;
  imagesCount?: number;
  calories?: number;
  hasLogged?: boolean;
  totalSpent?: number;
  currency?: string;
}

interface JournalHistoryFeedProps {
  initialHistory: JournalHistoryEntry[];
  onEntryClick?: () => void;
}

export function JournalHistoryFeed({ initialHistory, onEntryClick }: JournalHistoryFeedProps) {
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'bookmarked'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredHistory = initialHistory.filter(entry => 
    archiveFilter === 'all' ? true : entry.isBookmarked
  );
  const pageSize = 9;
  const totalPages = Math.ceil(filteredHistory.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayStart = filteredHistory.length ? startIndex + 1 : 0;
  const displayEnd = Math.min(endIndex, filteredHistory.length);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-6 bg-zinc-50 dark:bg-zinc-900/50 p-1 w-fit rounded-lg border border-zinc-200 dark:border-zinc-800/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setArchiveFilter('all'); setCurrentPage(1); }}
          className={cn(
            "rounded-md text-sm font-medium transition-all",
            archiveFilter === 'all' 
              ? "bg-[#1b1b1d] text-zinc-100 shadow-sm" 
              : "text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
          )}
        >
          All Entries
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setArchiveFilter('bookmarked'); setCurrentPage(1); }}
          className={cn(
            "rounded-md text-sm font-medium transition-all gap-2",
            archiveFilter === 'bookmarked' 
              ? "bg-[#1b1b1d] text-zinc-100 shadow-sm" 
              : "text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", archiveFilter === 'bookmarked' ? "fill-zinc-900 dark:fill-zinc-100 text-zinc-900 dark:text-zinc-100" : "")} />
          Bookmarks
        </Button>
      </div>

      {/* Feed Grid */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900/30">
          <p className="text-muted-foreground">No entries found.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* TODO: Ensure Save function triggers a state update or calls Next.js revalidatePath('/journal') so this archive list automatically reflects new edits from the Editor tab. */}
          {filteredHistory.slice(startIndex, endIndex).map((entry) => (
            <Link 
              key={entry._id} 
              href={`/user/journal?date=${entry.date}`} 
              className="block group h-full"
              onClick={onEntryClick}
            >
              <Card className="flex flex-col h-full p-5 bg-card border border-zinc-800/50 hover:bg-card hover:border-zinc-700 transition-all duration-200 rounded-xl cursor-pointer group relative">
                {/* Header (Top) */}
                <div className="flex items-start justify-between w-full mb-1">
                  <h3 className="text-base font-semibold text-zinc-100">
                    {format(parseISO(entry.date), "MMMM d, yyyy")}
                  </h3>
                  {entry.isBookmarked && (
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" />
                  )}
                </div>
                
                {/* Last Edited Timestamp */}
                <div className="text-[11px] font-medium text-zinc-400 mt-1 mb-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 
                  {entry.lastEdited 
                    ? `Last edited ${formatDistanceToNow(parseISO(entry.lastEdited))} ago`
                    : "Last edited recently"
                  }
                </div>

                {/* Body (Compact Text) */}
                <div className="flex-1 flex flex-col">
                  {entry.mainTask && (
                    <div className="mb-2">
                      <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider mb-1 block">FOCUS</span>
                      <p className="text-sm text-zinc-200 line-clamp-1 font-medium">{entry.mainTask}</p>
                    </div>
                  )}
                  {entry.notes ? (
                    <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2">
                      {entry.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-500 italic">No additional notes.</p>
                  )}
                </div>

                {/* Content Badges (Footer) */}
                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-zinc-800/50 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {(entry.imagesCount || 0) > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400 shrink-0">
                      <ImageIcon className="w-3 h-3 text-blue-400" /> {entry.imagesCount} Photos
                    </div>
                  )}
                  {(entry.calories || 0) > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400 shrink-0">
                      <Utensils className="w-3 h-3 text-amber-400" /> {entry.calories} kcal
                    </div>
                  )}
                  {(entry.totalSpent || 0) > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400 shrink-0">
                      <Wallet className="w-3 h-3 text-emerald-400" /> {formatCurrency(entry.totalSpent!, entry.currency)}
                    </div>
                  )}
                  {entry.hasLogged && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400 shrink-0">
                      <Wallet className="w-3 h-3 text-blue-400" /> Logged
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between w-full mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800/50 pb-8">
          <span className="text-sm font-medium text-zinc-500">
            Showing {displayStart} to {displayEnd} of {filteredHistory.length} entries
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {totalPages <= 5 ? (
              Array.from({ length: totalPages }, (_v, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "min-w-[2rem]",
                    n === currentPage
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700"
                      : "text-zinc-500 border border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                  onClick={() => setCurrentPage(n)}
                >
                  {n}
                </Button>
              ))
            ) : (
              <span className="text-sm text-zinc-500 px-2">Page {currentPage} of {totalPages}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
