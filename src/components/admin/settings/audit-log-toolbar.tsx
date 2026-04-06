"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-range-picker";
import { Download, X } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { exportAuditLogs } from "@/app/admin/settings/actions";
import { startOfDay, endOfDay } from "date-fns";

export function AuditLogToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State for filters
  const [actor, setActor] = useState(searchParams.get("actor") || "");
  const [action, setAction] = useState(searchParams.get("action") || "");
  const [date, setDate] = useState<Date | undefined>(() => {
    const start = searchParams.get("startDate");
    if (start) {
      return new Date(start);
    }
    return undefined;
  });

  // Create a query string generator
  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "") {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, value);
        }
      });
      
      // Reset page to 1 when filters change
      newSearchParams.set("page", "1");
      
      return newSearchParams.toString();
    },
    [searchParams]
  );

  // Debounce actor search
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentActor = searchParams.get("actor") || "";
      if (actor !== currentActor) {
        router.push(`${pathname}?${createQueryString({ actor })}`);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [actor, createQueryString, pathname, router, searchParams]);

  // Handle action change
  const handleActionChange = (value: string) => {
    setAction(value);
    router.push(`${pathname}?${createQueryString({ action: value === "ALL" ? null : value })}`);
  };

  // Handle date change
  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      const params: Record<string, string | null> = {
        startDate: startOfDay(newDate).toISOString(),
        endDate: endOfDay(newDate).toISOString()
      };
      router.push(`${pathname}?${createQueryString(params)}`);
    } else {
      // Clear dates
      router.push(`${pathname}?${createQueryString({ startDate: null, endDate: null })}`);
    }
  };

  const handleReset = () => {
    setActor("");
    setAction("");
    setDate(undefined);
    router.push(pathname);
  };

  const handleExport = async () => {
    const toastId = toast.loading("Exporting audit logs...");
    const filter = {
      actor: searchParams.get("actor") || undefined,
      action: searchParams.get("action") || undefined,
      startDate: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
      endDate: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
    };

    const result = await exportAuditLogs(filter);
    
    if (result.success && result.csv) {
      // Trigger download
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Audit logs exported successfully", { id: toastId });
    } else {
      toast.error("Failed to export audit logs", { id: toastId });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm mb-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-center flex-1">
          <Input
            placeholder="Search actor..."
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="w-full md:w-[250px]"
          />
          <Select value={action || "ALL"} onValueChange={handleActionChange}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <DatePicker date={date} setDate={handleDateChange} />
          {(actor || action || date) && (
            <Button 
              variant="ghost" 
              onClick={handleReset}
              className="h-8 px-2 lg:px-3 text-zinc-500 hover:text-foreground"
            >
              Clear filters
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
