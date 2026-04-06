export function formatCurrency(value: number, currency: string = "USD"): string {
  const isZeroDecimal = ["JPY", "KRW", "VND", "CLP", "PYG"].includes(currency.toUpperCase());
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(value);
}

export function isJournalEntryNonEmpty(mainTask?: string | null, notes?: string | null): boolean {
  const hasTitle = mainTask != null && mainTask.trim() !== "";
  const hasNotes = notes != null && notes.trim() !== "";
  return hasTitle || hasNotes;
}

export function getMostFrequentCurrency(
  docs: Array<{ currency?: string; spending?: Array<{ price?: number }> }>,
  fallbackCurrency: string = "USD"
): string {
  const currencyCount = new Map<string, number>();
  
  for (const doc of docs) {
    const c = (doc.currency || "").trim().toUpperCase();
    const spendingCount = (doc.spending || []).length;
    
    if (c && spendingCount > 0) {
      currencyCount.set(c, (currencyCount.get(c) || 0) + spendingCount);
    }
  }

  if (currencyCount.size > 0) {
    return [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  
  return fallbackCurrency;
}
