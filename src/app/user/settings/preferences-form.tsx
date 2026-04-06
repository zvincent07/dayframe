"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { saveUnits, saveCurrency, saveFirstDayOfWeek } from "./actions";

export function PreferencesForm({
  initialUnits = "metric",
  initialCurrency = "USD",
  initialFirstDay = "sunday",
}: {
  initialUnits?: "metric" | "imperial";
  initialCurrency?: string;
  initialFirstDay?: "sunday" | "monday";
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const [tempUnit, setTempUnit] = useState("celsius");
  const [startPage, setStartPage] = useState("today");
  const [firstDay, setFirstDay] = useState<"sunday" | "monday">(initialFirstDay);
  const [units, setUnits] = useState<"metric"|"imperial">(initialUnits);
  const normalizedInitialCurrency = (initialCurrency || "USD").trim().toUpperCase();
  const [currency, setCurrency] = useState<string>(normalizedInitialCurrency);

  useEffect(() => {
    setMounted(true);
    setTempUnit(localStorage.getItem("df_temperature_unit") || "celsius");
    
    // Cookie might exist for start page
    const cookies = document.cookie.split(";").reduce((acc, cookie) => {
      const [key, val] = cookie.split("=").map(c => c.trim());
      acc[key] = val;
      return acc;
    }, {} as Record<string, string>);
    
    setStartPage(cookies["df_default_start_page"] || "today");
    setFirstDay(initialFirstDay);
    try {
      localStorage.setItem("df_first_day_of_week", initialFirstDay);
    } catch {
      /* ignore */
    }
  }, [initialFirstDay]);

  useEffect(() => {
    setCurrency((initialCurrency || "USD").trim().toUpperCase());
  }, [initialCurrency]);

  const handleTempUnitChange = (val: string) => {
    setTempUnit(val);
    localStorage.setItem("df_temperature_unit", val);
    toast.success("Temperature unit updated");
    // Trigger storage event so other components (like weather widget) can react
    window.dispatchEvent(new Event('storage'));
  };

  const handleFirstDayChange = async (val: "sunday" | "monday") => {
    setFirstDay(val);
    try {
      localStorage.setItem("df_first_day_of_week", val);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("df-first-day-updated"));
    const res = await saveFirstDayOfWeek(val);
    if (res?.success) {
      toast.success("First day of week updated");
      router.refresh();
    } else toast.error(res?.error || "Failed to save first day of week");
  };

  const handleStartPageChange = (val: string) => {
    setStartPage(val);
    // set cookie for auth.config.ts to read
    document.cookie = `df_default_start_page=${val}; path=/; max-age=31536000`;
    toast.success("Default start page updated");
  };

  const handleUnitsChange = async (val: "metric"|"imperial") => {
    setUnits(val);
    const res = await saveUnits(val);
    if (res?.success) {
      toast.success("Measurement units updated");
      router.refresh();
    } else toast.error(res?.error || "Failed to update units");
  };

  const handleCurrencyChange = async (val: string) => {
    setCurrency(val);
    try {
      localStorage.setItem("df_preferred_currency", val.trim().toUpperCase());
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("df-preferred-currency-updated"));
    const res = await saveCurrency(val);
    if (res?.success) {
      toast.success("Preferred currency updated");
      router.refresh();
    } else toast.error(res?.error || "Failed to update currency");
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    // clear start page cookie
    document.cookie = "df_default_start_page=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    toast.success("Cache cleared. Reloading...");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  if (!mounted) return null; // prevent hydration mismatch

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border overflow-visible">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Display & Interface</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-visible">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="text-sm font-medium text-foreground">Theme</span>
                <span className="text-xs text-muted-foreground">Select your preferred interface color.</span>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="h-11 w-full min-w-0 border-border bg-background sm:h-10 sm:w-[160px] focus:ring-emerald-500/50">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark Mode</SelectItem>
                  <SelectItem value="light">Light Mode</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="text-sm font-medium text-foreground">Temperature Unit</span>
                <span className="text-xs text-muted-foreground">Used for the top navigation weather widget.</span>
              </div>
              <Select value={tempUnit} onValueChange={handleTempUnitChange}>
                <SelectTrigger className="h-11 w-full min-w-0 border-border bg-background sm:h-10 sm:w-[160px] focus:ring-emerald-500/50">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="celsius">Celsius (°C)</SelectItem>
                  <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="text-sm font-medium text-foreground">Measurement Units</span>
                <span className="text-xs text-muted-foreground">Affects reports and summaries.</span>
              </div>
              <Select value={units} onValueChange={(v) => handleUnitsChange(v as "metric"|"imperial")}>
                <SelectTrigger className="h-11 w-full min-w-0 border-border bg-background sm:h-10 sm:w-[160px] focus:ring-emerald-500/50">
                  <SelectValue placeholder="Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric (kg, km)</SelectItem>
                  <SelectItem value="imperial">Imperial (lb, mi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border overflow-visible">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Formatting & Behavior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-visible">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="text-sm font-medium text-foreground">First Day of Week</span>
                <span className="text-xs text-muted-foreground">Controls calendars and weekly views.</span>
              </div>
              <Select value={firstDay} onValueChange={(v) => handleFirstDayChange(v as "sunday"|"monday")}>
                <SelectTrigger className="h-11 w-full min-w-0 border-border bg-background sm:h-10 sm:w-[160px] focus:ring-emerald-500/50">
                  <SelectValue placeholder="First Day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="monday">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="text-sm font-medium text-foreground">Default Start Page</span>
                <span className="text-xs text-muted-foreground">Where the app opens when you first log in.</span>
              </div>
              <Select value={startPage} onValueChange={handleStartPageChange}>
                <SelectTrigger className="h-11 w-full min-w-0 border-border bg-background sm:h-10 sm:w-[160px] focus:ring-emerald-500/50">
                  <SelectValue placeholder="Start Page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="text-sm font-medium text-foreground">Preferred Currency</span>
                <span className="text-xs text-muted-foreground">Used in spending summaries.</span>
              </div>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="h-11 w-full min-w-0 border-border bg-background sm:h-10 sm:w-[160px] focus:ring-emerald-500/50">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                  <SelectItem value="PHP">PHP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1 space-y-1">
              <span className="block text-sm font-medium text-red-600 dark:text-red-400">Clear Local Cache</span>
              <span className="block text-pretty text-xs leading-relaxed text-red-600/85 dark:text-red-400/80">
                Wipes unsaved preferences and forces a fresh reload.
              </span>
            </div>
            <Button
              variant="destructive"
              onClick={handleClearCache}
              className="h-11 w-full shrink-0 border border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400 sm:h-10 sm:w-auto sm:min-w-[140px]"
            >
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
