'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { InsightHistoryFeedSkeleton } from '@/components/skeletons/insight-history-skeleton';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface Insight {
  _id: string;
  createdAt: string | Date;
  insight: string;
  timeframe: string;
}

interface InsightHistoryFeedProps {
  initialItems: Insight[];
  isLoading?: boolean;
}

export function InsightHistoryFeed({ initialItems, isLoading }: InsightHistoryFeedProps) {
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(() => initialItems?.[0] || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(15);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setVisibleCount(15);
  };


  // For simplicity and responsiveness:
  // We'll use CSS hidden/block classes to toggle views on mobile based on selectedInsight state.
  
  const timeframeLabels: Record<string, string> = {
    today: 'Daily',
    '7d': 'Weekly',
    '30d': 'Monthly',
    '1y': 'Yearly',
  };

  const filteredItems = initialItems.filter((item) => {
    const dateObj = new Date(item.createdAt);
    const dateString = format(dateObj, 'MMMM d, yyyy').toLowerCase();
    const contentString = item.insight.toLowerCase();
    const timeframeString = (
      timeframeLabels[item.timeframe] ?? item.timeframe ?? ''
    ).toLowerCase();
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      dateString.includes(query) ||
      contentString.includes(query) ||
      timeframeString.includes(query)
    );
  });

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredItems.length) {
          setVisibleCount((prev) => prev + 15);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, filteredItems.length]);

  useEffect(() => {
    if (initialItems && initialItems.length > 0 && !selectedInsight) {
      const id = setTimeout(() => {
        setSelectedInsight(initialItems[0]);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [initialItems, selectedInsight]);

  const groupedHistory = filteredItems.reduce((acc, insight) => {
    const monthYear = new Date(insight.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);
  const sortedMonths = Object.keys(groupedHistory);

  if (isLoading) {
    return <InsightHistoryFeedSkeleton />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col w-full">
      <div className="flex shrink-0 flex-col gap-4 border-b border-zinc-200 p-6 pb-4 pr-14 dark:border-zinc-800/50 md:flex-row md:items-center md:justify-between">
        <div className="m-0 space-y-1 text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">
            AI Insight History
          </h2>
          <p className="text-sm text-muted-foreground">Recent AI-generated insights</p>
        </div>
      </div>

      <div className="shrink-0 border-b border-zinc-200 px-6 pb-4 dark:border-zinc-800/50">
        <Input
          placeholder="Search insights..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="border-input bg-muted/50 focus-visible:ring-emerald-500/20"
          aria-label="Search insights"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6 md:grid md:grid-cols-12 md:gap-6">
        {/* Left pane: on mobile, stay visible above detail (scrollable) so no back button is required */}
        <div
          className={cn(
            'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background/50 backdrop-blur-sm md:col-span-4 lg:col-span-4',
            selectedInsight
              ? 'max-h-[42vh] shrink-0 md:max-h-none md:h-full'
              : 'min-h-[220px] flex-1 md:h-full md:flex-none',
          )}
        >
        <div className="flex-1 overflow-y-auto h-full p-2 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No insights found.
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
              {sortedMonths.map((month) => (
                <AccordionItem value={month} key={month} className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2 px-1 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    {month} ({groupedHistory[month].length})
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1 pb-4 px-2">
                    {groupedHistory[month].map((insight) => {
                      const dateObj = new Date(insight.createdAt);
                      const formattedDate = format(dateObj, 'MMMM d, yyyy');
                      const formattedTime = format(dateObj, 'h:mm a');
                      const isSelected = selectedInsight?._id === insight._id;

                      return (
                        <button
                          key={insight._id}
                          onClick={() => setSelectedInsight(insight)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-all duration-200 border border-transparent",
                            isSelected 
                              ? "border-l-2 border-emerald-500 bg-muted/40 text-foreground shadow-sm" 
                              : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <div className="flex justify-between items-baseline mb-1">
                            <span className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-foreground/80")}>
                              {formattedDate}
                            </span>
                            <span className="text-[10px] opacity-60 font-mono uppercase tracking-wider">
                              {timeframeLabels[insight.timeframe] || insight.timeframe}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {insight.insight}
                            </span>
                            <span className="text-[10px] opacity-50 whitespace-nowrap ml-2">
                              {formattedTime}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>

      {/* Right Pane (Reading Canvas / Detail View) */}
      <div className={cn(
        "relative flex min-h-0 flex-col overflow-y-auto rounded-xl border border-border bg-card/30 p-4 md:col-span-8 md:flex md:h-full md:p-8 lg:col-span-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        selectedInsight ? "flex flex-1 md:flex-none" : "hidden md:flex",
      )}>
        {!selectedInsight ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
            <p>Select an insight from the list to read.</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-8 border-b border-border pb-4 flex items-center gap-3">
              {format(new Date(selectedInsight.createdAt), 'MMMM d, yyyy')}
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border">
                {format(new Date(selectedInsight.createdAt), 'h:mm a')}
              </span>
            </h2>
            <div className="prose dark:prose-invert prose-zinc max-w-none 
              prose-headings:text-foreground 
              prose-h3:text-emerald-600 dark:prose-h3:text-emerald-400 prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-4 prose-h3:border-b prose-h3:border-border prose-h3:pb-2 
              prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4 
              prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-6 
              prose-li:text-muted-foreground prose-li:marker:text-muted-foreground/50 prose-li:mb-2 
              prose-strong:text-foreground prose-strong:font-semibold 
              whitespace-pre-wrap">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h3: ({...props}) => <h3 className="text-emerald-600 dark:text-emerald-400 text-xl font-semibold mt-8 mb-4 border-b border-border pb-2" {...props} />,
                  ul: ({...props}) => <ul className="list-disc pl-6 mb-6 space-y-2 text-muted-foreground" {...props} />,
                  p: ({...props}) => <p className="leading-relaxed mb-4 text-muted-foreground" {...props} />,
                  strong: ({...props}) => <strong className="text-foreground font-semibold" {...props} />
                }}
              >
                {selectedInsight.insight}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
  );
}
