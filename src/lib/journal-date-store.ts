/**
 * External store for journal last-viewed date (sessionStorage).
 * Used with useSyncExternalStore to avoid setState-in-effect.
 */
const listeners = new Set<() => void>();

export function subscribeToJournalDate(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getJournalDateSnapshot(urlDate: string | null, initialDate: string): string {
  if (urlDate) return urlDate;
  if (typeof window === "undefined") return initialDate;
  try {
    return sessionStorage.getItem("journal-last-date") ?? initialDate;
  } catch {
    return initialDate;
  }
}

export function notifyJournalDateChange() {
  listeners.forEach((l) => l());
}
