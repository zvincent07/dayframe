"use client";

import { useState, useEffect, useMemo } from "react";
import { estimateNutrition } from "@/lib/nutrition";
import { estimateNutritionAI } from "@/actions/nutrition";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoodNutritionProps {
  text: string;
  onNutritionCalculated?: (nutrition: { p: number, c: number, f: number, k: number }) => void;
}

export function FoodNutrition({ text, onNutritionCalculated }: FoodNutritionProps) {
  const [aiResult, setAiResult] = useState<{
    protein: number;
    carbs: number;
    fats: number;
    calories: number;
    source: 'local' | 'ai';
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [debouncedText, setDebouncedText] = useState(text);

  // Debounce text changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(text);
    }, 1000); // 1s debounce to avoid spamming API
    return () => clearTimeout(timer);
  }, [text]);

  // Fetch AI nutrition when debounced text changes
  useEffect(() => {
    let active = true;
    if (!debouncedText.trim()) {
      // Defer state update to avoid cascading renders warning
      const id = setTimeout(() => {
        if (active) {
          setAiResult(null);
          setLoading(false);
        }
      }, 0);
      return () => { active = false; clearTimeout(id); };
    }

    // Don't refetch if text hasn't changed meaningfully
    // (This is handled by the debounce effect dependency array)

    // Call the server action. 
    // We defer the loading state update to avoid the setState in effect warning.
    const loadingTimeout = setTimeout(() => {
      if (active) setLoading(true);
    }, 0);

    estimateNutritionAI(debouncedText)
      .then((res) => {
        if (!active) return;
        setAiResult(res);
      })
      .catch((err) => {
        if (!active) return;
        // eslint-disable-next-line no-console
        console.error("Failed to fetch AI nutrition", err);
        // Fallback to local is implicit if aiResult is null
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(loadingTimeout);
    };
  }, [debouncedText]);

  // Always calculate local estimate immediately for instant feedback
  const local = useMemo(() => estimateNutrition(text), [text]);

  // Decide what to show:
  // 1. If loading AI, show local + spinner? Or just local.
  // 2. If AI result exists and matches current text (via debounce cycle), show AI.
  // 3. Otherwise show local.
  
  // Actually, we should probably prefer AI result if available for the *current* debounced text.
  // But if the user is typing (text !== debouncedText), we should show Local (instant) or keep showing old AI result?
  // Showing local while typing is most responsive.
  
  const isTyping = text !== debouncedText;
  const showAi = !isTyping && aiResult && aiResult.source === 'ai';
  const display = showAi ? aiResult : local;

  // Lift the state up so the parent form can accumulate accurate totals
  useEffect(() => {
    if (!onNutritionCalculated || !display) return;
    
    // We only want to trigger this if the actual numbers changed, 
    // to prevent infinite loops from object reference changes
    onNutritionCalculated({
      p: display.protein,
      c: display.carbs,
      f: display.fats,
      k: display.calories
    });
  }, [display, onNutritionCalculated]);

  if (!text.trim()) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded border",
        "bg-blue-950/30 text-blue-400 border-blue-900/30",
        loading ? "opacity-70" : ""
      )}>
        {showAi ? <Sparkles className="inline-block w-3 h-3 mr-1 text-blue-400/70" /> : null}
        P: {Math.round(display?.protein ?? 0)}g
      </span>
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-950/30 text-yellow-400 border border-yellow-900/30">
        C: {Math.round(display?.carbs ?? 0)}g
      </span>
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-950/30 text-orange-400 border border-orange-900/30">
        F: {Math.round(display?.fats ?? 0)}g
      </span>
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 ml-auto">
        {Math.round(display?.calories ?? 0)} kcal
      </span>
    </div>
  );
}
