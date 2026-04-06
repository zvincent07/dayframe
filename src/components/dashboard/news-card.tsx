"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isDesktop } from "@/lib/desktop";
import { queueEmbeddedBrowserUrl } from "@/lib/browser-open";

interface NewsItem {
  title: string;
  description: string;
  url: string;
  image?: string;
  source: string;
  publishedAt?: string;
}

export function NewsCard({ article }: { article: NewsItem }) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);

  const hostName = useMemo(() => {
    try {
      return new URL(article.url).host.replace(/^www\./, "");
    } catch {
      return article.source || "News";
    }
  }, [article.url, article.source]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDesktop()) {
      e.preventDefault();
      queueEmbeddedBrowserUrl(article.url, article.title);
      router.push(`/user/browser?b=${Date.now()}`);
    }
  };

  return (
    <a
      href={article.url}
      target={isDesktop() ? undefined : "_blank"}
      rel="noopener noreferrer"
      onClick={handleClick}
      className="group flex flex-col overflow-hidden bg-[#1b1b1d] border border-zinc-800/60 rounded-xl hover:border-zinc-700 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md"
    >
      <div className="relative w-full aspect-video overflow-hidden bg-zinc-900 shrink-0">
        {article.image && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image}
            alt={article.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0f172a] to-[#1f2937] flex items-center justify-center p-4 group-hover:scale-105 transition-transform duration-500 ease-out">
            <span className="text-[#e5e7eb] font-sans text-xl sm:text-2xl font-medium text-center break-words opacity-90 drop-shadow-sm">
              {hostName}
            </span>
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
          <span>{article.source || "Source"}</span>
          <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleString() : ""}</span>
        </div>
        <h3 className="text-base font-semibold text-zinc-100 line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">
          {article.title}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
          {article.description}
        </p>
      </div>
    </a>
  );
}
