export interface SpendingEntry {
  price: number;
  item: string;
  description: string;
}

export interface JournalState {
  title: string;
  notes: string;
  images: string[];
  food: { morning: string; lunch: string; noon: string; dinner: string };
  foodImages: string[];
  spending: SpendingEntry[];
  currency: string;
  bookmarked: boolean;
}

export interface JournalEntry {
  mainTask?: string;
  notes?: string;
  images?: string[];
  food?: { morning: string; lunch: string; noon: string; dinner: string };
  foodImages?: string[];
  spending?: SpendingEntry[];
  currency?: string;
  isBookmarked?: boolean;
}
