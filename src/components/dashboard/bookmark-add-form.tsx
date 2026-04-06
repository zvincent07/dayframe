"use client";

import { Link as LinkIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { addBookmark } from "@/app/user/bookmarks/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function BookmarkAddForm() {
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Please paste a valid URL");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("url", trimmed);
      const res = await addBookmark(fd);
      if (res?.success) {
        toast.success("Link saved");
        setUrl("");
        router.refresh();
      } else {
        const msg = typeof res?.error === "string" ? res.error : "Failed to save link";
        toast.error(msg);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="relative max-w-2xl mb-10 group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <LinkIcon className="h-4 w-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
      </div>
      <input
        type="text"
        name="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-3.5 pl-11 pr-32 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-sm"
        placeholder="Paste a URL to save..."
        aria-label="Bookmark URL"
      />
      <div className="absolute inset-y-1.5 right-1.5 flex items-center">
        <button
          type="submit"
          disabled={isPending}
          className="h-full px-4 bg-zinc-800 text-zinc-100 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/30 text-xs font-semibold rounded-xl transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving..." : "Save Link"}
        </button>
      </div>
    </form>
  );
}
