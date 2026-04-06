"use client";

import { Tabs } from "@/components/ui/tabs";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsTabs({ 
  children, 
  defaultValue,
  className
}: { 
  children: React.ReactNode;
  defaultValue: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    // Reset page when switching tabs to start fresh
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Tabs value={defaultValue} onValueChange={onTabChange} className={cn("w-full space-y-4", className)} id="settings-tabs">
      {children}
    </Tabs>
  );
}
