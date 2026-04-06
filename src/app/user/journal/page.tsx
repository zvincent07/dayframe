import { format } from "date-fns";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getJournalCore, getJournalStats } from "@/actions/journal";
import { JournalPageShell } from "@/components/dashboard/journal-page-shell";
import { UserRepository } from "@/repositories/user.repository";

interface JournalPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const params = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");
  const dateParam = params.date ?? today;

  const userId = session.user.id;
  if (typeof userId !== "string") redirect("/");

  const [entry, stats, dbUser] = await Promise.all([
    getJournalCore(dateParam),
    getJournalStats(),
    UserRepository.findById(userId),
  ]);

  const preferredCurrency = (dbUser?.preferredCurrency || "USD").trim().toUpperCase();

  return (
    <JournalPageShell
      dateParam={dateParam}
      initialNotes={entry?.notes ?? ""}
      initialTitle={entry?.mainTask ?? ""}
      totalEntries={stats.totalJournalEntries}
      preferredCurrency={preferredCurrency}
    />
  );
}
