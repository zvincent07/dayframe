"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const TOPICS = [
  { key: "Top Headlines", label: "Top Headlines" },
  { key: "Technology", label: "Technology" },
  { key: "Web Dev", label: "Web Dev" },
  { key: "Coding", label: "Coding" },
  { key: "Cloud Computing", label: "Cloud Computing" },
  { key: "Finance", label: "Finance" },
  { key: "Japan", label: "Japan" },
  { key: "Philippines", label: "Philippines" },
  { key: "Gaming", label: "Gaming" },
  { key: "Anime", label: "Anime" },
];

export function NewsFilters({
  topic,
}: {
  topic: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeKey = useMemo(() => {
    const labels = TOPICS.map(t => t.key);
    if (!topic) return "Top Headlines";
    return labels.includes(topic) ? topic : "Top Headlines";
  }, [topic]);

  const onChipClick = (chip: (typeof TOPICS)[number]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("topic", chip.key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="mb-6 w-full min-w-0 rounded-lg border border-border bg-muted/40 p-1.5">
      <div
        className="-mx-0.5 flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-0.5 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
        role="tablist"
        aria-label="News topics"
      >
        {TOPICS.map((t) => {
          const isActive = activeKey === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChipClick(t)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors sm:py-1.5",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
