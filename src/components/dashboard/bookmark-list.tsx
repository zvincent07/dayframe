"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Globe, Trash2, Play, ExternalLink } from "lucide-react";
import { useCallback, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { deleteBookmark } from "@/app/user/bookmarks/actions";
import { toast } from "sonner";
import { queueEmbeddedBrowserUrl } from "@/lib/browser-open";
import { isDesktop } from "@/lib/desktop";
import { cn } from "@/lib/utils";

type BookmarkItem = {
  _id: string;
  url: string;
  type: "video" | "article" | "other";
  title?: string;
  description?: string;
  image?: string;
  domain: string;
  provider?: string | null;
  videoId?: string | null;
  playInline?: boolean;
  createdAt?: string | Date;
};

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
    }
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (id) return id;
    }
  } catch {}
  const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return m && m[1] ? m[1] : null;
}

/** Stable hue from domain for gradient backgrounds (non-video cards). */
function domainHue(domain: string): number {
  let h = 0;
  for (let i = 0; i < domain.length; i++) {
    h = (h + domain.charCodeAt(i) * (i + 1)) % 360;
  }
  return h;
}

function faviconUrl(domain: string): string {
  const d = domain.replace(/^www\./, "");
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`;
}

export function BookmarkList({ initialItems }: { initialItems: BookmarkItem[] }) {
  const [items, setItems] = useOptimistic(initialItems, (state, update: { type: string; id?: string }) => {
    switch (update.type) {
      case "delete":
        return state.filter((i) => i._id !== update.id);
      default:
        return state;
    }
  });
  const [, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = items.slice(start, start + ITEMS_PER_PAGE);
  const displayStart = items.length ? start + 1 : 0;
  const displayEnd = Math.min(start + ITEMS_PER_PAGE, items.length);
  const router = useRouter();

  const onOpenBookmarkUrl = useCallback((url: string, title?: string) => {
    if (isDesktop() && isHttpOrHttpsUrl(url)) {
      queueEmbeddedBrowserUrl(url, title);
      router.push(`/user/browser?b=${Date.now()}`);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, [router]);

  const onDelete = (id: string) => {
    startTransition(async () => {
      setItems({ type: "delete", id });
      try {
        const res = await deleteBookmark(id);
        if (res?.success) {
          toast.success("Link deleted");
        } else {
          toast.error(typeof res?.error === "string" ? res.error : "Failed to delete link");
        }
      } catch {
        toast.error("Failed to delete link");
      }
    });
  };

  return (
    <>
      {items.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900/30">
          <p className="text-muted-foreground">No entries found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paginated.map((link) => (
              <BookmarkCard key={link._id} item={link} onDelete={onDelete} onOpenBookmarkUrl={onOpenBookmarkUrl} />
            ))}
          </div>
          <div className="mt-10 flex items-center justify-between w-full pt-6 pb-8 border-t border-zinc-200 dark:border-zinc-800/50">
            <span className="text-sm font-medium text-zinc-500">
              Showing {displayStart} to {displayEnd} of {items.length} bookmarks
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              {totalPages <= 5 ? (
                Array.from({ length: totalPages }, (_v, i) => i + 1).map((n) => (
                  <Button
                    key={n}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "min-w-[2rem]",
                      n === currentPage
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700"
                        : "text-zinc-500 border border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                    onClick={() => setCurrentPage(n)}
                  >
                    {n}
                  </Button>
                ))
              ) : (
                <span className="px-2 text-sm text-zinc-500">
                  Page {currentPage} of {totalPages}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function isHttpOrHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return /^https?:\/\//.test(url);
  }
}

function BookmarkCard({
  item,
  onDelete,
  onOpenBookmarkUrl,
}: {
  item: BookmarkItem;
  onDelete: (id: string) => void;
  onOpenBookmarkUrl: (url: string, title?: string) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("[data-bookmark-delete], [data-bookmark-external]")) return;
    if ("key" in e && e.key !== "Enter" && e.key !== " ") return;
    if ("key" in e) e.preventDefault();
    if (item.type === "video") {
      setIsModalOpen(true);
    } else {
      onOpenBookmarkUrl(item.url, item.title);
    }
  };

  if (item.type === "video") {
    const videoId = item.videoId || extractYouTubeId(item.url);
    return (
      <>
        <Card
          role="button"
          tabIndex={0}
          aria-label={`Open video from ${item.domain}`}
          className={cn(
            "group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm transition-all duration-300",
            "hover:border-border hover:shadow-md",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          onClick={handleCardClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleCardClick(e);
          }}
        >
          <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-muted">
            {videoId ? (
              <Image
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                alt=""
                fill
                unoptimized
                className="object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Play className="h-10 w-10 text-muted-foreground" aria-hidden />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/80 bg-background/80 backdrop-blur-sm transition-transform group-hover:scale-110">
                <Play className="ml-0.5 h-5 w-5 text-foreground" aria-hidden />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-1/2 items-end bg-gradient-to-t from-background/95 via-background/40 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground drop-shadow-sm">
                {(item.title && item.title.trim()) || item.domain || "Saved link"}
              </h3>
            </div>
          </div>
          <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate text-xs font-medium text-muted-foreground">{item.domain}</span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                data-bookmark-external
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Open link"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBookmarkUrl(item.url, item.title);
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                data-bookmark-delete
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete bookmark"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item._id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Card>
        <Modal
          isOpen={isModalOpen}
          onClose={setIsModalOpen}
          title={item.domain}
          size="responsive"
          className="sm:max-w-5xl"
        >
          <div className="relative z-0 aspect-video w-full bg-black">
            {videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                className="absolute inset-0 z-0 h-full w-full border-0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="YouTube video"
              />
            ) : null}
          </div>
        </Modal>
      </>
    );
  }

  const hue = domainHue(item.domain);
  const hue2 = (hue + 48) % 360;
  const displayTitle = (item.title && item.title.trim()) || item.domain || "Saved link";

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`Open ${item.domain}`}
      className={cn(
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm transition-all duration-300",
        "hover:border-emerald-500/30 hover:shadow-md dark:hover:border-emerald-500/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleCardClick(e);
      }}
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden">
        {item.image ? (
          <div className="relative h-full w-full">
            <Image
              src={item.image}
              alt=""
              fill
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{displayTitle}</h3>
            </div>
          </div>
        ) : (
          <div
            className="relative flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center"
            style={{
              background: `linear-gradient(145deg, hsl(${hue} 42% 18%) 0%, hsl(${hue2} 38% 12%) 45%, hsl(220 25% 8%) 100%)`,
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 30%, hsl(${hue} 50% 40% / 0.35) 0%, transparent 45%),
                  radial-gradient(circle at 80% 70%, hsl(${hue2} 45% 35% / 0.25) 0%, transparent 40%)`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,hsl(0_0%_0%/0.15)_100%)]" />
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-background/25 shadow-lg backdrop-blur-md ring-1 ring-white/10">
              <Image
                src={faviconUrl(item.domain)}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                unoptimized
              />
            </div>
            <div className="relative z-[1] max-w-full space-y-1 px-1">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow-sm">{displayTitle}</h3>
              {item.description ? (
                <p className="line-clamp-2 text-xs leading-relaxed text-white/75">{item.description}</p>
              ) : (
                <p className="line-clamp-1 text-xs text-white/60">{item.url.replace(/^https?:\/\//, "").split("/")[0]}</p>
              )}
            </div>
            <ExternalLink
              className="relative z-[1] h-4 w-4 text-white/50 opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 border-t border-border px-4 py-3">
        {item.image && item.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate text-xs font-medium text-muted-foreground">{item.domain}</span>
          </div>
          <button
            type="button"
            data-bookmark-delete
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete bookmark"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item._id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
