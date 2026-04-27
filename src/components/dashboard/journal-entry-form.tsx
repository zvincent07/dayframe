"use client";

import { useState, useTransition, useRef, useEffect, useCallback, useSyncExternalStore, useOptimistic, useMemo } from "react";
import { subscribeToJournalDate, getJournalDateSnapshot, notifyJournalDateChange } from "@/lib/journal-date-store";
import { formatCurrency, isJournalEntryNonEmpty } from "@/lib/journal-utils";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { enUS } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Modal } from "@/components/ui/modal";
import { CalendarIcon, Trash2, ImagePlus, Plus, Star, PenLine, ImageIcon, Utensils, Wallet, Receipt, Undo2, Redo2, Check, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getJournal, updateJournal, updateJournalFoodImagesAndCurrency, toggleJournalBookmark } from "@/actions/journal";
import { uploadJournalImage } from "@/actions/upload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";

import { FoodNutrition } from "./food-nutrition";
import { useGlobalHistory } from "@/hooks/use-global-history";
import { analyzeFoodImageAI } from "@/actions/nutrition";
import { MAX_FOOD_IMAGES, MAX_IMAGES, MAX_IMAGE_SIZE_MB } from "@/lib/constants";
import type { JournalEntry, JournalState, SpendingEntry } from "@/types/journal";

const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  USD: { symbol: "$", label: "USD ($)" },
  EUR: { symbol: "€", label: "EUR (€)" },
  GBP: { symbol: "£", label: "GBP (£)" },
  JPY: { symbol: "¥", label: "JPY (¥)" },
  PHP: { symbol: "₱", label: "₱ (PHP)" },
  CAD: { symbol: "C$", label: "CAD (C$)" },
  AUD: { symbol: "A$", label: "AUD (A$)" },
  INR: { symbol: "₹", label: "INR (₹)" },
};

// Client-only mount flag for Radix (avoids setState in effect / hydration mismatch)
const mountedStore = { mounted: false, listeners: new Set<() => void>() };
function subscribeMounted(cb: () => void) {
  mountedStore.listeners.add(cb);
  return () => mountedStore.listeners.delete(cb);
}
function getMountedSnapshot() {
  return mountedStore.mounted;
}
function getMountedServerSnapshot() {
  return false;
}
function useMounted() {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      mountedStore.mounted = true;
      mountedStore.listeners.forEach((l) => l());
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);
}

interface JournalEntryFormProps {
  initialDate: string;
  initialNotes?: string;
  initialTitle?: string;
  initialImages?: string[];
  totalEntries?: number;
  /** When the journal row has no currency yet, default spending UI to this (from profile). */
  preferredCurrency?: string;
  showTabs?: boolean;
  onSave?: () => void;
}

export function JournalEntryForm({
  initialDate,
  initialNotes = "",
  initialTitle = "",
  initialImages = [],
  preferredCurrency = "USD",
  showTabs = false,
  onSave,
}: JournalEntryFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  // Real State
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState(initialNotes);
  const [images, setImages] = useState<string[]>(initialImages);
  const [food, setFood] = useState({ morning: "", lunch: "", noon: "", dinner: "" });
  const [foodImages, setFoodImages] = useState<string[]>([]);
  const [spending, setSpending] = useState<SpendingEntry[]>([]);
  const defaultCurrency = preferredCurrency.trim().toUpperCase() || "USD";
  const [localPreferredCurrency, setLocalPreferredCurrency] = useState<string | null>(null);
  const resolveDisplayCurrency = useCallback(
    (entryCurrency?: string | null) => {
      let stored = entryCurrency?.trim().toUpperCase() || "";
      // Match JournalService.resolveJournalCurrency: DB often has USD as default, not a real choice
      if (stored === "USD" && defaultCurrency !== "USD") {
        stored = "";
      }
      if (stored) return stored;
      if (localPreferredCurrency) return localPreferredCurrency;
      return defaultCurrency;
    },
    [defaultCurrency, localPreferredCurrency]
  );
  const initialResolvedCurrency = resolveDisplayCurrency(null);
  const [currency, setCurrency] = useState(initialResolvedCurrency);
  const [bookmarked, setBookmarked] = useState(false);
  // Track if the entry for this specific date was empty on load
  const [, setEntryWasInitiallyEmpty] = useState(true);

  // Last Saved State
  const [lastSavedTitle, setLastSavedTitle] = useState(initialTitle);
  const [lastSavedNotes, setLastSavedNotes] = useState(initialNotes);
  const [lastSavedImages, setLastSavedImages] = useState<string[]>(initialImages);
  const [lastSavedFood, setLastSavedFood] = useState({ morning: "", lunch: "", noon: "", dinner: "" });
  const [lastSavedFoodImages, setLastSavedFoodImages] = useState<string[]>([]);
  const [lastSavedSpending, setLastSavedSpending] = useState<SpendingEntry[]>([]);
  const [lastSavedCurrency, setLastSavedCurrency] = useState(initialResolvedCurrency);
  const [lastSavedBookmarked, setLastSavedBookmarked] = useState(false);

  // Optimistic State
  const [optimisticState, addOptimisticUpdate] = useOptimistic<JournalState & { bookmarked: boolean }, Partial<JournalState & { bookmarked: boolean }>>(
    { title, notes, images, food, foodImages, spending, currency, bookmarked },
    (state, updates) => ({ ...state, ...updates })
  );

  const [, startTransition] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);
  const mounted = useMounted();
  // Notes are always editable; no explicit edit mode
  const [fullImageIndex, setFullImageIndex] = useState<number | null>(null);
  const [fullFoodImageIndex, setFullFoodImageIndex] = useState<number | null>(null);
  const foodImageInputRef = useRef<HTMLInputElement>(null);
  const loadCompleteRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedTick, setShowSavedTick] = useState(false);
  const savedTickTimeoutRef = useRef<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(0);
  useEffect(() => {
    try {
      const v = localStorage.getItem("df_preferred_currency");
      setLocalPreferredCurrency(v?.trim().toUpperCase() || null);
    } catch {
      setLocalPreferredCurrency(null);
    }
    const read = () => {
      try {
        const pref = localStorage.getItem("df_first_day_of_week");
        setWeekStartsOn(pref === "monday" ? 1 : 0);
      } catch {
        setWeekStartsOn(0);
      }
    };
    read();
    window.addEventListener("df-first-day-updated", read);
    return () => window.removeEventListener("df-first-day-updated", read);
  }, []);
  const dayPickerLocale = useMemo(() => {
    return { ...enUS, options: { ...enUS.options, weekStartsOn } } as typeof enUS;
  }, [weekStartsOn]);
  useEffect(() => {
    if (typeof window !== "undefined" && "ononline" in window) {
      const onOnline = () => setIsOffline(false);
      const onOffline = () => setIsOffline(true);
      setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }
  }, []);

  type Snapshot = {
    title: string;
    notes: string;
    images: string[];
    food: { morning: string; lunch: string; noon: string; dinner: string };
    foodImages: string[];
    spending: SpendingEntry[];
    currency: string;
    bookmarked: boolean;
  };
  const initialSnapshot: Snapshot = {
    title: initialTitle,
    notes: initialNotes,
    images: initialImages,
    food: { morning: "", lunch: "", noon: "", dinner: "" },
    foodImages: [],
    spending: [],
    currency: initialResolvedCurrency,
    bookmarked: false,
  };
  const { present, update, undo, redo, canUndo, canRedo, setPresent } = useGlobalHistory<Snapshot>(initialSnapshot);
  const historySyncRef = useRef(false);

  const applyUpdate = useCallback((patch: Partial<Snapshot>) => {
    update(patch);
    const next = { ...present, ...patch };
    if (patch.title !== undefined) setTitle(next.title);
    if (patch.notes !== undefined) setNotes(next.notes);
    if (patch.images !== undefined) setImages(next.images);
    if (patch.food !== undefined) setFood(next.food);
    if (patch.foodImages !== undefined) setFoodImages(next.foodImages);
    if (patch.spending !== undefined) setSpending(next.spending);
    if (patch.currency !== undefined) setCurrency(next.currency);
    if (patch.bookmarked !== undefined) setBookmarked(next.bookmarked);
    startTransition(() => {
      const optimisticPatch = { ...patch } as unknown as Partial<JournalState & { bookmarked: boolean }>;
      addOptimisticUpdate(optimisticPatch);
    });
  }, [present, update, addOptimisticUpdate]);

  const onUndo = useCallback(() => {
    historySyncRef.current = true;
    undo();
  }, [undo]);
  const onRedo = useCallback(() => {
    historySyncRef.current = true;
    redo();
  }, [redo]);

  useEffect(() => {
    if (!historySyncRef.current) return;
    const s = present;
    setTitle(s.title);
    setNotes(s.notes);
    setImages(s.images);
    setFood(s.food);
    setFoodImages(s.foodImages);
    setSpending(s.spending);
    setCurrency(s.currency);
    setBookmarked(s.bookmarked);
    startTransition(() => {
      addOptimisticUpdate({
        title: s.title,
        notes: s.notes,
        images: s.images,
        food: s.food,
        foodImages: s.foodImages,
        spending: s.spending,
        currency: s.currency,
        bookmarked: s.bookmarked,
      });
    });
    historySyncRef.current = false;
  }, [present, addOptimisticUpdate]);

  // Keep latest form state in a ref (updated in effect only) so submit handler always has current values
  const latestRef = useRef({
    title: "",
    notes: "",
    images: [] as string[],
    food: { morning: "", lunch: "", noon: "", dinner: "" },
    foodImages: [] as string[],
    spending: [] as SpendingEntry[],
    currency: initialResolvedCurrency,
  });
  useEffect(() => {
    latestRef.current = {
      title,
      notes,
      images,
      food,
      foodImages,
      spending,
      currency,
    };
  });

  const urlDate = searchParams.get("date");
  const effectiveDate = useSyncExternalStore(
    subscribeToJournalDate,
    () => getJournalDateSnapshot(urlDate, initialDate),
    () => urlDate ?? initialDate
  );

  // Sync urlDate to sessionStorage (external system) when it changes; no setState
  useEffect(() => {
    if (typeof window === "undefined" || !urlDate) return;
    try {
      sessionStorage.setItem("journal-last-date", urlDate);
      notifyJournalDateChange();
    } catch {
      // ignore
    }
  }, [urlDate]);

  // Load full entry (including images) on client to avoid passing large base64 arrays in RSC payload
  useEffect(() => {
    loadCompleteRef.current = false;
    getJournal(effectiveDate).then((entry: JournalEntry | null) => {
      if (entry) {
        const t = (entry as { mainTask?: string }).mainTask ?? "";
        const n = entry.notes ?? "";
        const f = entry.food ?? { morning: "", lunch: "", noon: "", dinner: "" };
        const fi = (entry as { foodImages?: string[] }).foodImages ?? [];
        const sp = (entry.spending ?? []).map((s: { price: number; item: string; description?: string }) => ({
          price: Number(s.price),
          item: String(s.item ?? ""),
          description: String(s.description ?? ""),
        }));
        const bm = entry.isBookmarked ?? false;
        
        const hasContent = isJournalEntryNonEmpty(t, n);
        setEntryWasInitiallyEmpty(!hasContent);

        startTransition(() => {
          setTitle(t);
          setNotes(n);
          setImages(entry.images ?? []);
          setFood(typeof f === "object" ? f : { morning: "", lunch: "", noon: "", dinner: "" });
          setFoodImages(Array.isArray(fi) ? fi : []);
          setSpending(Array.isArray(sp) ? sp : []);
          const resolvedCur = resolveDisplayCurrency((entry as { currency?: string }).currency);
          setCurrency(resolvedCur);
          setBookmarked(bm);
          
          setLastSavedTitle(t);
          setLastSavedNotes(n);
          setLastSavedImages(entry.images ?? []);
          setLastSavedFood(typeof f === "object" ? f : { morning: "", lunch: "", noon: "", dinner: "" });
          setLastSavedFoodImages(Array.isArray(fi) ? fi : []);
          setLastSavedSpending(Array.isArray(sp) ? sp : []);
          setLastSavedCurrency(resolvedCur);
          setLastSavedBookmarked(bm);
        });
        setPresent({
          title: t,
          notes: n,
          images: entry.images ?? [],
          food: typeof f === "object" ? f : { morning: "", lunch: "", noon: "", dinner: "" },
          foodImages: Array.isArray(fi) ? fi : [],
          spending: Array.isArray(sp) ? sp : [],
          currency: resolveDisplayCurrency((entry as { currency?: string }).currency),
          bookmarked: bm,
        });
      } else {
        setEntryWasInitiallyEmpty(true);
        const emptyCur = resolveDisplayCurrency(null);
        startTransition(() => {
          setCurrency(emptyCur);
          setLastSavedCurrency(emptyCur);
          addOptimisticUpdate({ currency: emptyCur });
        });
      }
      loadCompleteRef.current = true;
    });
  }, [effectiveDate, setPresent, addOptimisticUpdate, resolveDisplayCurrency]);


  const spendingEqual =
    spending.length === lastSavedSpending.length &&
    spending.every((s, i) => {
      const o = lastSavedSpending[i];
      return o && s.price === o.price && s.item === o.item && s.description === o.description;
    });
  
  const [totalNutrition, setTotalNutrition] = useState({ p: 0, c: 0, f: 0, k: 0 });
  const [mealNutrition, setMealNutrition] = useState<{
    morning: { p: number, c: number, f: number, k: number },
    lunch: { p: number, c: number, f: number, k: number },
    noon: { p: number, c: number, f: number, k: number },
    dinner: { p: number, c: number, f: number, k: number }
  }>({
    morning: { p: 0, c: 0, f: 0, k: 0 },
    lunch: { p: 0, c: 0, f: 0, k: 0 },
    noon: { p: 0, c: 0, f: 0, k: 0 },
    dinner: { p: 0, c: 0, f: 0, k: 0 }
  });

  const handleMorningNutrition = useCallback((n: { p: number, c: number, f: number, k: number }) => {
    setMealNutrition(prev => {
      if (prev.morning.p === n.p && prev.morning.c === n.c && prev.morning.f === n.f && prev.morning.k === n.k) return prev;
      return { ...prev, morning: n };
    });
  }, []);

  const handleLunchNutrition = useCallback((n: { p: number, c: number, f: number, k: number }) => {
    setMealNutrition(prev => {
      if (prev.lunch.p === n.p && prev.lunch.c === n.c && prev.lunch.f === n.f && prev.lunch.k === n.k) return prev;
      return { ...prev, lunch: n };
    });
  }, []);

  const handleNoonNutrition = useCallback((n: { p: number, c: number, f: number, k: number }) => {
    setMealNutrition(prev => {
      if (prev.noon.p === n.p && prev.noon.c === n.c && prev.noon.f === n.f && prev.noon.k === n.k) return prev;
      return { ...prev, noon: n };
    });
  }, []);

  const handleDinnerNutrition = useCallback((n: { p: number, c: number, f: number, k: number }) => {
    setMealNutrition(prev => {
      if (prev.dinner.p === n.p && prev.dinner.c === n.c && prev.dinner.f === n.f && prev.dinner.k === n.k) return prev;
      return { ...prev, dinner: n };
    });
  }, []);
  useEffect(() => {
    setTotalNutrition({
      p: mealNutrition.morning.p + mealNutrition.lunch.p + mealNutrition.noon.p + mealNutrition.dinner.p,
      c: mealNutrition.morning.c + mealNutrition.lunch.c + mealNutrition.noon.c + mealNutrition.dinner.c,
      f: mealNutrition.morning.f + mealNutrition.lunch.f + mealNutrition.noon.f + mealNutrition.dinner.f,
      k: mealNutrition.morning.k + mealNutrition.lunch.k + mealNutrition.noon.k + mealNutrition.dinner.k,
    });
  }, [mealNutrition]);

  // Sync local baseline when typing so UI doesn't lag while waiting for AI
  useEffect(() => {
    // Only update empty meals or fallback to local if AI isn't active
    setMealNutrition(prev => ({
      morning: prev.morning,
      lunch: prev.lunch,
      noon: prev.noon,
      dinner: prev.dinner,
    }));
  }, [optimisticState.food]);

  const hasUnsavedChanges =
    title !== lastSavedTitle ||
    notes !== lastSavedNotes ||
    images.length !== lastSavedImages.length ||
    images.some((img, i) => lastSavedImages[i] !== img) ||
    food.morning !== lastSavedFood.morning ||
    food.lunch !== lastSavedFood.lunch ||
    food.noon !== lastSavedFood.noon ||
    food.dinner !== lastSavedFood.dinner ||
    foodImages.length !== lastSavedFoodImages.length ||
    foodImages.some((img, i) => lastSavedFoodImages[i] !== img) ||
    !spendingEqual ||
    currency !== lastSavedCurrency ||
    bookmarked !== lastSavedBookmarked;

  const selectedDate = effectiveDate ? parseISO(effectiveDate) : new Date();

  const setDateParam = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", format(date, "yyyy-MM-dd"));
    router.push(`/user/journal?${params.toString()}`);
  };

  const handleBookmarkToggle = useCallback(async () => {
    // Determine the next state based on the current optimistic state
    const current = optimisticState.bookmarked;
    const next = !current;
    
    // Optimistically update UI
    applyUpdate({ bookmarked: next });

    try {
      const result = await toggleJournalBookmark(effectiveDate);
      if (result.success) {
        // Update real state with server response
        const newBookmarkedState = result.bookmarked ?? next;
        applyUpdate({ bookmarked: newBookmarkedState });
        setLastSavedBookmarked(newBookmarkedState);
        toast.success(newBookmarkedState ? "Bookmarked" : "Bookmark removed");
      } else {
        // Revert on error
        toast.error(result.error || "Failed to toggle bookmark");
        applyUpdate({ bookmarked: current });
      }
    } catch (err) {
      // Revert on exception
      toast.error((err as Error).message || "Failed to toggle bookmark");
      applyUpdate({ bookmarked: current });
    }
  }, [effectiveDate, optimisticState.bookmarked, applyUpdate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const replaceIndex = replaceIndexRef.current;
    replaceIndexRef.current = null;

    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPEG, PNG, GIF, WebP)");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await uploadJournalImage(formData);
      if (!res.success || !res.url) {
        toast.error(res.error || "Failed to add image");
        return;
      }
      const imageUrl = res.url;
      
      if (replaceIndex != null && replaceIndex >= 0) {
        let next = [...images];
        if (replaceIndex >= next.length) {
          next = [...next, imageUrl];
        } else {
          next[replaceIndex] = imageUrl;
        }
        applyUpdate({ images: next });
        toast.success("Image updated");
      } else {
        if (images.length >= MAX_IMAGES) return;
        const next = [...images, imageUrl];
        applyUpdate({ images: next });
        toast.success("Image added");
      }
    } catch {
      toast.error("Failed to add image");
    }
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    applyUpdate({ images: next });
  };

  const handleFoodImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await uploadJournalImage(formData);
      if (!res.success || !res.url) {
        toast.error(res.error || "Failed to add food image");
        return;
      }
      const imageUrl = res.url;
      const next = foodImages.length >= MAX_FOOD_IMAGES ? foodImages : [...foodImages, imageUrl];
      applyUpdate({ foodImages: next });
      toast.success("Food photo added");
    } catch {
      toast.error("Failed to add image");
    }
  };

  const removeFoodImage = (index: number) => {
    const next = foodImages.filter((_, i) => i !== index);
    applyUpdate({ foodImages: next });
  };

  const getMealSlotByLocalTime = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return "morning" as const;
    if (h >= 11 && h < 15) return "lunch" as const;
    if (h >= 15 && h < 18) return "noon" as const;
    return "dinner" as const;
  };

  const handleAnalyzeFoodImage = async (img: string, index: number) => {
    setAnalyzingIndex(index);
    try {
      const res = await analyzeFoodImageAI(img);
      if (res && "success" in res && res.success && res.data) {
        const slot = getMealSlotByLocalTime();
        const current = (food as { [k: string]: string })[slot] || "";
        const prefix = current ? current + "\n" : "";
        const nextFood = { ...food, [slot]: prefix + res.data.description };
        applyUpdate({ food: nextFood });
        
        // Push the high-accuracy AI macro estimation to our nutrition state
        setMealNutrition(prev => ({
          ...prev,
          [slot]: {
            p: res.data.protein,
            c: res.data.carbs,
            f: res.data.fats,
            k: res.data.calories,
            source: 'ai'
          }
        }));

        toast.success("Food added to " + (slot === "noon" ? "snack" : slot));
      } else {
        const errMsg = (res && "error" in res && typeof res.error === "string") ? res.error : "Could not analyze image";
        toast.error(errMsg);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAnalyzingIndex(null);
    }
  };

  const addSpendingEntry = () => {
    const next = [...spending, { price: 0, item: "", description: "" }];
    applyUpdate({ spending: next });
  };

  const updateSpending = (index: number, field: keyof SpendingEntry, value: number | string) => {
    const next = [...spending];
    next[index] = { ...next[index], [field]: value };
    applyUpdate({ spending: next });
  };

  const removeSpendingEntry = (index: number) => {
    const next = spending.filter((_, i) => i !== index);
    applyUpdate({ spending: next });
  };

  const totalSpent = optimisticState.spending.reduce((sum, s) => sum + (Number.isNaN(Number(s.price)) ? 0 : Number(s.price)), 0);
  const performSave = useCallback(
    async (silent: boolean) => {
      setIsSaving(true);
      const latest = latestRef.current;
      const currentSpending = latest.spending;
      const foodImgs = latest.foodImages;
      const curr = latest.currency;
      const result = await updateJournal(effectiveDate, {
        mainTask: latest.title,
        notes: latest.notes,
        images: latest.images,
        food: latest.food,
        foodImages: foodImgs,
        spending: currentSpending
          .filter((s) => s.item.trim() !== "")
          .map((s) => ({ price: Number(s.price) || 0, item: s.item.trim(), description: s.description?.trim() || undefined })),
        currency: curr,
      });
      if (!result.success) {
        if (!silent) toast.error(result.error ?? "Failed to save");
        setIsSaving(false);
        return;
      }
      const foodCurrencyResult = await updateJournalFoodImagesAndCurrency(effectiveDate, {
        foodImages: foodImgs,
        currency: curr,
      });
      if (!foodCurrencyResult.success) {
        if (!silent) toast.error(foodCurrencyResult.error ?? "Failed to save food photos and currency");
        setIsSaving(false);
        return;
      }
      
      startTransition(() => {
        setLastSavedTitle(latest.title);
        setLastSavedNotes(latest.notes);
        setLastSavedImages([...latest.images]);
        setLastSavedFood({ ...latest.food });
        setLastSavedFoodImages([...foodImgs]);
        setLastSavedSpending(latest.spending.map((s) => ({ ...s })));
        setLastSavedCurrency(curr);
      });
      try {
        if (typeof window !== "undefined" && effectiveDate) {
          sessionStorage.setItem("journal-last-date", effectiveDate);
          notifyJournalDateChange();
        }
      } catch {
        // ignore
      }
      if (silent) {
        toast.success("Saved", { duration: 1500 });
      } else {
        toast.success("Journal saved");
      }
      setIsSaving(false);
      setShowSavedTick(true);
      if (savedTickTimeoutRef.current != null) window.clearTimeout(savedTickTimeoutRef.current);
      savedTickTimeoutRef.current = window.setTimeout(() => {
        setShowSavedTick(false);
      }, 3000);
    },
    [effectiveDate]
  );

  // Auto-save after 2.5s of no changes (only run save after initial load for this date has completed)
  const AUTO_SAVE_DELAY_MS = 2500;
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const id = window.setTimeout(() => {
      if (loadCompleteRef.current) {
        startTransition(async () => {
          await performSave(true);
          onSave?.(); // Notify parent of save
        });
      }
    }, AUTO_SAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [
    hasUnsavedChanges,
    // Dependency array simplified to trigger on changes to these values
    title,
    notes,
    images,
    food,
    foodImages,
    spending,
    currency,
    bookmarked,
    performSave,
    onSave,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Manual save if needed, though auto-save handles most cases
    if (hasUnsavedChanges) {
      startTransition(async () => {
        await performSave(false);
        onSave?.(); // Notify parent of save
      });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) onUndo();
      } else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();
        if (canRedo) onRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canUndo, canRedo, onUndo, onRedo]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-3xl">Journal</h1>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {mounted ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn("inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground border-border")}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {effectiveDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar locale={dayPickerLocale} mode="single" selected={selectedDate} onSelect={(d) => d && setDateParam(d)} initialFocus />
                  </PopoverContent>
                </Popover>
              ) : (
                <span className={cn("inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground border-border")}>
                  <CalendarIcon className="h-4 w-4" />
                  {effectiveDate ? format(selectedDate, "PPP") : "Pick a date"}
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleBookmarkToggle}
                className="text-muted-foreground hover:text-amber-500 transition-colors h-8 w-8 shrink-0 rounded-full"
                aria-label="Bookmark entry"
                title="Bookmark entry"
              >
                <Star className={cn("h-4 w-4", optimisticState.bookmarked && "fill-amber-400 text-amber-500")} />
              </Button>
            </div>
          </div>
          <p className="mt-0.5 text-pretty text-sm leading-relaxed text-muted-foreground">
            Capture your daily thoughts, progress, and memories.
          </p>
        </div>
        {showTabs && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pr-4 border-r border-zinc-200 dark:border-zinc-800/50 hidden md:flex">
              {(isOffline || isSaving || showSavedTick) && (
                <div className="flex items-center gap-1.5">
                  {isOffline ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  ) : isSaving ? (
                    <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <Check className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>
              )}
              <div className="flex items-center gap-0.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-md p-0.5">
                <button onClick={onUndo} disabled={!canUndo} className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"><Undo2 className="w-3.5 h-3.5" /></button>
                <button onClick={onRedo} disabled={!canRedo} className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"><Redo2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <TabsList className="inline-flex w-fit justify-start bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50">
              <TabsTrigger value="editor" className="px-6">Editor</TabsTrigger>
              <TabsTrigger value="archive" className="px-6">Archive</TabsTrigger>
            </TabsList>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={foodImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFoodImageChange} />

      {/* Four main cards: unified grid with identical vertical and horizontal gutters */}
      <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-12 lg:items-stretch">
        {/* Left: Notes – 2/3 width, read vs edit mode, max-w-prose for line length */}
        <Card className="flex min-w-0 flex-col overflow-hidden sm:col-span-12 lg:col-span-8 lg:h-[470px]">
        <CardHeader className="flex shrink-0 flex-row items-center gap-2 pb-2">
          <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-muted-foreground" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight">Notes</h2>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="scrollbar-list mt-4 flex h-full min-w-0 flex-1 flex-col overflow-y-auto px-4 pb-6 sm:px-6">
            <Textarea
              placeholder="What's on your mind today?"
              value={optimisticState.title}
              onChange={(e) => {
                const val = e.target.value;
                applyUpdate({ title: val });
              }}
              rows={1}
              spellCheck={false}
              className="mb-4 w-full resize-none min-h-0 border-0 border-transparent bg-transparent p-0 text-2xl font-bold leading-tight text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 lg:text-3xl"
            />
            <Textarea
              placeholder="Write something..."
              value={optimisticState.notes}
              onChange={(e) => {
                const val = e.target.value;
                applyUpdate({ notes: val });
              }}
              spellCheck={false}
              className="w-full flex-1 min-h-[280px] bg-transparent border-none text-zinc-600 dark:text-zinc-400 text-base leading-relaxed placeholder:text-zinc-700 focus:outline-none focus:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none custom-scrollbar lg:min-h-0"
            />
          </div>
          </CardContent>
        </Card>

        {/* Right: Attachments sidebar – 1/3 width, same height as Notes */}
        <Card className="flex flex-col overflow-hidden sm:col-span-12 lg:col-span-4 lg:h-[470px]">
          <CardHeader className="pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-zinc-500" />
              <h2 className="text-lg font-semibold tracking-tight">Images</h2>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col h-full gap-4 p-0">
            {/* Compact dropzone – always at top, fixed height */}
            <div
              role="button"
              tabIndex={optimisticState.images.length >= MAX_IMAGES ? -1 : 0}
              onClick={() => {
                if (optimisticState.images.length >= MAX_IMAGES) return;
                replaceIndexRef.current = null;
                fileInputRef.current?.click();
              }}
              onKeyDown={(e) => e.key === "Enter" && optimisticState.images.length < MAX_IMAGES && fileInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (optimisticState.images.length < MAX_IMAGES && e.dataTransfer.types.includes("Files")) setIsDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                if (optimisticState.images.length >= MAX_IMAGES) return;
                const file = e.dataTransfer.files?.[0];
                if (!file?.type.startsWith("image/")) {
                  toast.error("Please drop an image file (JPEG, PNG, GIF, WebP)");
                  return;
                }
                if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
                  toast.error(`Image must be under ${MAX_IMAGE_SIZE_MB}MB`);
                  return;
                }
                try {
                  const formData = new FormData();
                  formData.append("file", file);
                  
                  const res = await uploadJournalImage(formData);
                  if (!res.success || !res.url) {
                    toast.error(res.error || "Failed to add image");
                    return;
                  }
                  const imageUrl = res.url;
                  
                  const next = images.length >= MAX_IMAGES ? images : [...images, imageUrl];
                  applyUpdate({ images: next });
                  toast.success("Image added");
                } catch {
                  toast.error("Failed to add image");
                }
              }}
              className={cn(
                "mx-4 mb-4 flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
                optimisticState.images.length >= MAX_IMAGES
                  ? "cursor-not-allowed border-muted-foreground/15 bg-muted/10 opacity-60"
                  : isDragOver
                    ? "border-primary/40 bg-primary/10 dark:bg-primary/15"
                    : "border-muted-foreground/25 bg-muted/20 hover:border-muted-foreground/40 hover:bg-muted/30"
              )}
            >
              <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-1.5 text-xs text-muted-foreground">{optimisticState.images.length >= MAX_IMAGES ? "Max reached" : "Add image"}</p>
              <p className="text-[10px] text-muted-foreground/60">Max {MAX_IMAGES}, {MAX_IMAGE_SIZE_MB}MB each</p>
            </div>

            {/* Uploaded images – show 2 (1 row) then scroll; add only via top dropzone */}
            {optimisticState.images.length > 0 && (
              <div className="mt-4 flex-1 max-h-[220px] overflow-y-auto px-4 pb-4 scrollbar-list">
                <div className="grid grid-cols-2 gap-2">
                {optimisticState.images.map((src, index) => (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    onClick={() => setFullImageIndex(index)}
                    onKeyDown={(e) => e.key === "Enter" && setFullImageIndex(index)}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border/50 bg-muted cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URLs from DB; next/image not for dynamic blobs */}
                    <img
                      src={src}
                      alt={`Entry ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" aria-hidden />
                    <div className="absolute inset-0 flex items-start justify-end p-2 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                      <span className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8 shadow-lg"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage(index); }}
                          aria-label="Remove image"
                          title="Remove image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </span>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Food track – same grid, row 2 */}
        <Card className="flex min-w-0 flex-col min-h-[320px] sm:col-span-12 lg:col-span-6">
        <CardHeader className="shrink-0 pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Utensils className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight">Food track</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-border/50 bg-muted/50 px-3 py-2 text-xs text-muted-foreground sm:py-1.5">
              <span className="whitespace-nowrap"><span className="font-medium text-blue-500/90 dark:text-blue-400/80">P:</span> {Math.round(totalNutrition.p)}g</span>
              <span className="whitespace-nowrap"><span className="font-medium text-amber-600/90 dark:text-amber-400/80">C:</span> {Math.round(totalNutrition.c)}g</span>
              <span className="whitespace-nowrap"><span className="font-medium text-yellow-600/90 dark:text-yellow-400/80">F:</span> {Math.round(totalNutrition.f)}g</span>
              <span className="whitespace-nowrap"><span className="font-medium text-emerald-600/90 dark:text-emerald-400/80">Kcal:</span> {Math.round(totalNutrition.k)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Breakfast</label>
              <Textarea
                placeholder="e.g. 4 eggs, 35g whey protein"
                value={optimisticState.food.morning}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = { ...food, morning: val };
                  applyUpdate({ food: next });
                }}
                className="w-full bg-transparent border-none p-0 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px] resize-none"
                rows={2}
              />
              <FoodNutrition 
                text={optimisticState.food.morning || ""} 
                onNutritionCalculated={handleMorningNutrition}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Lunch</label>
              <Textarea
                placeholder="e.g. Salad, chicken breast"
                value={optimisticState.food.lunch}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = { ...food, lunch: val };
                  applyUpdate({ food: next });
                }}
                className="w-full bg-transparent border-none p-0 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px] resize-none"
                rows={2}
              />
              <FoodNutrition 
                text={optimisticState.food.lunch || ""} 
                onNutritionCalculated={handleLunchNutrition}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Snack</label>
              <Textarea
                placeholder="e.g. Fruit, nuts, protein bar"
                value={optimisticState.food.noon}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = { ...food, noon: val };
                  applyUpdate({ food: next });
                }}
                className="w-full bg-transparent border-none p-0 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px] resize-none"
                rows={2}
              />
              <FoodNutrition 
                text={optimisticState.food.noon || ""} 
                onNutritionCalculated={handleNoonNutrition}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Dinner</label>
              <Textarea
                placeholder="e.g. Rice, veggies, fish"
                value={optimisticState.food.dinner}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = { ...food, dinner: val };
                  applyUpdate({ food: next });
                }}
                className="w-full bg-transparent border-none p-0 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px] resize-none"
                rows={2}
              />
              <FoodNutrition 
                text={optimisticState.food.dinner || ""} 
                onNutritionCalculated={handleDinnerNutrition}
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-4 w-full min-w-0">
            <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Food photos</h4>
            <div className="w-full min-w-0">
              <div className="flex flex-nowrap overflow-x-auto gap-3 pb-2 w-full custom-scrollbar">
                {optimisticState.foodImages.map((src, index) => (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    onClick={() => setFullFoodImageIndex(index)}
                    onKeyDown={(e) => e.key === "Enter" && setFullFoodImageIndex(index)}
                    className="group shrink-0 relative w-16 h-16 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Food ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" aria-hidden />
                    <div className="absolute right-1 top-1 bottom-1 flex flex-col gap-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFoodImage(index); }}
                        className="h-7 w-7 rounded p-0 flex items-center justify-center bg-destructive text-destructive-foreground hover:bg-destructive/90 pointer-events-auto"
                        aria-label="Remove photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleAnalyzeFoodImage(src, index); }}
                        disabled={analyzingIndex === index}
                        className="h-7 w-7 rounded flex items-center justify-center bg-emerald-600 text-emerald-50 hover:bg-emerald-500 pointer-events-auto disabled:opacity-60"
                        aria-label="Analyze food"
                        title="Auto-fill meal text from image"
                      >
                        {analyzingIndex === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={optimisticState.foodImages.length >= MAX_FOOD_IMAGES}
              className="w-full mt-4 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => foodImageInputRef.current?.click()}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Upload food photos
            </Button>
          </div>
        </CardContent>
      </Card>

        {/* Today's total spent – same grid, row 2 */}
      <Card className="flex flex-col h-full sm:col-span-12 lg:col-span-6">
        <CardHeader className="pb-2 shrink-0">
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-zinc-500" />
              <h2 className="text-lg font-semibold tracking-tight">Today&apos;s total spent</h2>
            </div>
            {mounted ? (
              <Select
                value={optimisticState.currency}
                onValueChange={(v) => {
                  applyUpdate({ currency: v });
                }}
              >
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCIES).map(([code, { label }]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 flex flex-col gap-4">
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-2">
              {optimisticState.spending.map((entry, index) => {
                const symbol = CURRENCIES[optimisticState.currency]?.symbol ?? optimisticState.currency;
                return (
                <div key={index} className="flex items-center gap-3 mb-3 group">
                  <div className="relative w-28 shrink-0">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {symbol}
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                      value={entry.price === 0 ? "" : entry.price}
                      onChange={(e) =>
                        updateSpending(
                          index,
                          "price",
                          e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-md py-2 pl-6 pr-3 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                    />
                  </div>
                  <Input
                    placeholder="What did you buy?"
                    value={entry.item}
                    onChange={(e) => updateSpending(index, "item", e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-md py-2 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                  />
                  <Input
                    placeholder="Category"
                    value={entry.description}
                    onChange={(e) => updateSpending(index, "description", e.target.value)}
                    className="w-32 shrink-0 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-md py-2 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                  />
                  <button
                    type="button"
                    className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-950/30 rounded-md transition-colors opacity-50 group-hover:opacity-100"
                    onClick={() => removeSpendingEntry(index)}
                    aria-label="Remove entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                )
              })}
            </div>
            {optimisticState.spending.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 py-8 text-sm text-zinc-500 font-medium">
                <Receipt className="w-8 h-8 text-zinc-800 mb-3" />
                No expenses logged today.
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSpendingEntry}
              className="w-full border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 mt-2 gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add entry
            </Button>
          </div>
          {optimisticState.spending.length > 0 && (
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800/50 shrink-0">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-xl font-semibold text-emerald-400 flex items-baseline">
                {formatCurrency(totalSpent, optimisticState.currency)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Full-size image modal */}
      <Modal 
        isOpen={fullImageIndex !== null} 
        onClose={(isOpen) => !isOpen && setFullImageIndex(null)}
        size="lg"
      >
        {fullImageIndex !== null && optimisticState.images[fullImageIndex] && (
          <div className="flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- base64 from DB; next/image not for dynamic data URLs */}
            <img
              src={optimisticState.images[fullImageIndex]}
              alt={`Entry image ${fullImageIndex + 1}`}
              className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-md"
            />
          </div>
        )}
      </Modal>

      {/* Full-size food photo modal */}
      <Modal 
        isOpen={fullFoodImageIndex !== null} 
        onClose={(isOpen) => !isOpen && setFullFoodImageIndex(null)}
        size="lg"
      >
        {fullFoodImageIndex !== null && optimisticState.foodImages[fullFoodImageIndex] && (
          <div className="flex items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- base64 from DB */}
            <img
              src={optimisticState.foodImages[fullFoodImageIndex]}
              alt={`Food photo ${fullFoodImageIndex + 1}`}
              className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-md"
            />
          </div>
        )}
      </Modal>
    </form>
  );
}
