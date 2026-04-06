"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JournalHistoryFeed } from "@/components/dashboard/journal-history-feed";
import { getJournalHistory } from "@/actions/journal";

const JournalEntryForm = dynamic(
  () => import("@/components/dashboard/journal-entry-form").then((m) => m.JournalEntryForm),
  { ssr: false }
);

interface HistoryItem {
  _id: string;
  date: string;
  mainTask?: string;
  isBookmarked: boolean;
}

interface JournalPageShellProps {
  dateParam: string;
  initialNotes: string;
  initialTitle: string;
  totalEntries: number;
  preferredCurrency: string;
}

export function JournalPageShell({
  dateParam,
  initialNotes,
  initialTitle,
  totalEntries,
  preferredCurrency,
}: JournalPageShellProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState("editor");

  useEffect(() => {
    let mounted = true;
    getJournalHistory()
      .then((h) => {
        if (mounted) {
          setHistory(Array.isArray(h) ? h : []);
        }
      })
      .catch(() => {
        if (mounted) setHistory([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const refreshHistory = async () => {
    try {
      const h = await getJournalHistory();
      if (Array.isArray(h)) {
        setHistory(h);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to refresh journal history:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          if (v === "archive") {
            void refreshHistory();
          }
        }}
        className="w-full"
      >
        <TabsContent value="editor" className="mt-0">
          <JournalEntryForm
            key={dateParam}
            initialDate={dateParam}
            initialNotes={initialNotes}
            initialTitle={initialTitle}
            totalEntries={totalEntries}
            preferredCurrency={preferredCurrency}
            showTabs={true}
            onSave={refreshHistory}
          />
        </TabsContent>
        
        <TabsContent value="archive" className="mt-0">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading history…</div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight sm:text-3xl">Journal</h1>
                  <p className="text-muted-foreground text-sm mt-0.5 truncate sm:truncate-none">Capture your daily thoughts, progress, and memories.</p>
                </div>
                <TabsList className="inline-flex w-fit justify-start bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50">
                  <TabsTrigger value="editor" className="px-6">Editor</TabsTrigger>
                  <TabsTrigger value="archive" className="px-6">Archive</TabsTrigger>
                </TabsList>
              </div>
              <JournalHistoryFeed initialHistory={history} onEntryClick={() => setActiveTab("editor")} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
