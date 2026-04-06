"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { formatCurrency } from "@/lib/journal-utils";

const STORAGE_KEY = "overview-total-spent-period";

export type TotalSpentPeriod = "week" | "month" | "year";

const VALID_PERIODS: TotalSpentPeriod[] = ["week", "month", "year"];

function getStoredPeriod(): TotalSpentPeriod {
  if (typeof window === "undefined") return "month";
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && VALID_PERIODS.includes(stored as TotalSpentPeriod))
      return stored as TotalSpentPeriod;
  } catch {
    // ignore
  }
  return "month";
}

interface TotalSpentCardProps {
  week: number;
  month: number;
  year: number;
  currency: string;
}

export function TotalSpentCard({ week, month, year, currency }: TotalSpentCardProps) {
  const [period, setPeriod] = useState<TotalSpentPeriod>(() => getStoredPeriod());

  const handlePeriodChange = (v: TotalSpentPeriod) => {
    setPeriod(v);
    try {
      sessionStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore
    }
  };

  const value = period === "week" ? week : period === "month" ? month : year;
  const isZero = value === 0;

  return (
    <div className="flex min-h-[64px] flex-col justify-between rounded-lg border border-border/50 bg-card/50 px-3 py-2 shadow-sm transition-colors hover:bg-card/80 sm:min-h-0 sm:px-4 sm:py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Total spent
        </span>
        <Select
          value={period}
          onValueChange={(v) => handlePeriodChange(v as TotalSpentPeriod)}
        >
          <SelectTrigger size="sm" className="h-7 w-[100px] text-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-1 sm:mt-1.5">
        <span
          className={`tabular-nums tracking-tight font-bold text-3xl ${isZero ? "text-muted-foreground/70" : "text-foreground"}`}
        >
          {formatCurrency(value, currency)}
        </span>
        <Wallet
          className="h-4 w-4 shrink-0 opacity-80 sm:h-5 sm:w-5 text-violet-600 dark:text-violet-400"
          aria-hidden
        />
      </div>
    </div>
  );
}
