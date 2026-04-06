import { unstable_cache } from "next/cache";

export type NewsItem = {
  title: string;
  description: string;
  url: string;
  image?: string | null;
  publishedAt?: string | null;
  source?: string | null;
};

const FEEDS: Record<string, string[]> = {
  "Top Headlines": [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://news.google.com/rss/search?q=world&hl=en-US&gl=US&ceid=US:en",
  ],
  "Technology": [
    "https://techcrunch.com/feed/",
    "https://www.theverge.com/rss/index.xml",
  ],
  "Coding": [
    "https://dev.to/feed",
    "https://css-tricks.com/feed/",
  ],
  "Cloud Computing": [
    "https://aws.amazon.com/about-aws/whats-new/recent/feed/",
    "https://azure.microsoft.com/en-us/updates/feed/",
  ],
  "Finance": [
    "https://search.cnbc.com/rs/search/combinedcms/view.xml?profile=120000000&id=10000664",
    "https://finance.yahoo.com/news/rssindex",
    "https://www.theguardian.com/business/rss",
  ],
  "Philippines": [
    "https://newsinfo.inquirer.net/feed",
    "https://www.philstar.com/rss/headlines",
    "https://news.google.com/rss/search?q=philippines&hl=en-PH&gl=PH&ceid=PH:en",
  ],
  "Anime": [
    "https://myanimelist.net/rss/news.xml",
    "https://www.crunchyroll.com/newsfeed/rss",
    "https://www.animenewsnetwork.com/news/rss.xml",
  ],
  "Japan": [
    "https://japantoday.com/feed",
    "https://www3.nhk.or.jp/nhkworld/en/rss/topstories.xml",
  ],
  "Web Dev": [
    "https://www.smashingmagazine.com/feed/",
    "https://davidwalsh.name/feed",
  ],
  "Gaming": [
    "https://www.pcgamer.com/rss/",
    "https://www.ign.com/rss/articles/feed",
  ],
};

type RSSItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  description?: string;
  enclosure?: { url?: string; type?: string } | undefined;
  guid?: string | { _: string } | Record<string, unknown>;
} & Record<string, unknown>;

function extractImage(item: RSSItem): string | null {
  const getAttrUrl = (obj: unknown): string | undefined => {
    if (!obj || typeof obj !== "object") return undefined;
    const o = obj as Record<string, unknown>;
    const direct = o.url;
    if (typeof direct === "string") return direct;
    const dollar = (o.$ as Record<string, unknown> | undefined);
    if (dollar && typeof dollar.url === "string") return dollar.url as string;
    const attr = (o.attr as Record<string, unknown> | undefined);
    if (attr && typeof attr.url === "string") return attr.url as string;
    return undefined;
  };
  const enc = item.enclosure;
  if (enc?.url && (enc.type?.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(enc.url))) {
    return enc.url;
  }
  const mediaRaw = item["media:content"];
  let mediaUrl: string | undefined;
  if (Array.isArray(mediaRaw)) {
    const first = mediaRaw[0] as Record<string, unknown>;
    const u = getAttrUrl(first);
    mediaUrl = u;
  } else {
    const media = mediaRaw as Record<string, unknown> | undefined;
    mediaUrl = media ? getAttrUrl(media) : undefined;
  }
  if (mediaUrl && /\.(png|jpe?g|webp|gif)$/i.test(mediaUrl)) {
    return mediaUrl;
  }
  const thumbRaw = item["media:thumbnail"];
  let thumbUrl: string | undefined;
  if (Array.isArray(thumbRaw)) {
    const firstT = thumbRaw[0] as Record<string, unknown>;
    const tu = getAttrUrl(firstT);
    thumbUrl = tu;
  } else {
    const thumb = thumbRaw as Record<string, unknown> | undefined;
    thumbUrl = thumb ? getAttrUrl(thumb) : undefined;
  }
  if (thumbUrl && /\.(png|jpe?g|webp|gif)$/i.test(thumbUrl)) {
    return thumbUrl;
  }
  const encoded = (item["content:encoded"] as string | undefined) || item.content || "";
  const html = typeof encoded === "string" ? encoded : "";
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  const srcsetMatch = html.match(/<img[^>]+srcset=["']([^"']+)["']/i);
  if (srcsetMatch && srcsetMatch[1]) {
    const first = srcsetMatch[1].split(",")[0].trim().split(" ")[0].trim();
    if (first) return first;
  }
  const dataSrcMatch = html.match(/<img[^>]+data-src=["']([^"']+)["']/i);
  if (dataSrcMatch && dataSrcMatch[1]) {
    return dataSrcMatch[1];
  }
  const descHtml = typeof item.description === "string" ? item.description : "";
  const descMatch = descHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (descMatch && descMatch[1]) {
    return descMatch[1];
  }
  const descSrcsetMatch = descHtml.match(/<img[^>]+srcset=["']([^"']+)["']/i);
  if (descSrcsetMatch && descSrcsetMatch[1]) {
    const first = descSrcsetMatch[1].split(",")[0].trim().split(" ")[0].trim();
    if (first) return first;
  }
  const descDataSrcMatch = descHtml.match(/<img[^>]+data-src=["']([^"']+)["']/i);
  if (descDataSrcMatch && descDataSrcMatch[1]) {
    return descDataSrcMatch[1];
  }
  return null;
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { 
      headers: { 
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }, 
      cache: "no-store", 
      signal: controller.signal 
    }).catch(() => null);
    clearTimeout(t);
    if (!(res && res.ok)) return null;
    const html = await res.text();
    const tryResolve = (img?: string | null) => {
      if (!img) return null;
      try {
        const abs = new URL(img, url).toString();
        return abs;
      } catch {
        return img || null;
      }
    };
    // Meta tags variants
    const og1 = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (og1 && og1[1]) return tryResolve(og1[1]);
    const og2 = html.match(/<meta[^>]+property=["']og:image:url["'][^>]*content=["']([^"']+)["']/i);
    if (og2 && og2[1]) return tryResolve(og2[1]);
    const og3 = html.match(/<meta[^>]+property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i);
    if (og3 && og3[1]) return tryResolve(og3[1]);
    const tw1 = html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (tw1 && tw1[1]) return tryResolve(tw1[1]);
    const tw2 = html.match(/<meta[^>]+name=["']twitter:image:src["'][^>]*content=["']([^"']+)["']/i);
    if (tw2 && tw2[1]) return tryResolve(tw2[1]);
    // JSON-LD
    const ldMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (ldMatch && ldMatch[1]) {
      try {
        const data = JSON.parse(ldMatch[1].trim());
        const candidates: unknown[] = Array.isArray(data) ? data : [data];
        for (const c of candidates) {
          if (c && typeof c === "object") {
            const m = c as Record<string, unknown>;
            const imgField = (m.image as string) || (m.thumbnailUrl as string) || (m.primaryImageOfPage as string);
            const imgObj = m.image && typeof m.image === "object" ? (m.image as Record<string, unknown>).url as string : undefined;
            const resolved = tryResolve(imgField || imgObj || null);
            if (resolved) return resolved;
          }
        }
      } catch {}
    }
  } catch {}
  return null;
}

function svgPlaceholder(text: string): string {
  const safe = (text || "News")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 28);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1f2937"/></linearGradient></defs>` +
    `<rect width="800" height="450" fill="url(#g)"/>` +
    `<text x="50%" y="50%" fill="#e5e7eb" font-family="system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',sans-serif" font-size="36" text-anchor="middle" dominant-baseline="middle">${safe}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,` + encodeURIComponent(svg);
}

// normalize() removed (unused)

export async function getNewsData(topic: string): Promise<NewsItem[]> {
  const key = topic && FEEDS[topic] ? topic : "Top Headlines";
  const feedUrls = FEEDS[key];
  const { default: Parser } = await import("rss-parser");
  const parser = new Parser({
    customFields: {
      item: ["media:content", "media:thumbnail", "content:encoded", "description"],
    },
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    },
  });
  const fetchFeed = async (): Promise<NewsItem[]> => {
    const promises = feedUrls.map((url) => parser.parseURL(url));
    const results = await Promise.allSettled(promises);
    const seen = new Set<string>();
    let base: NewsItem[] = [];
    for (const res of results) {
      if (res.status !== "fulfilled") continue;
      const feed = res.value;
      const items = (feed.items || []) as unknown as RSSItem[];
      for (const it of items) {
        let linkUrl = it.link || "";
        if (!linkUrl && typeof it.guid === "string") linkUrl = it.guid;
        if (!linkUrl && it.guid && typeof (it.guid as Record<string, unknown>)._ === "string") {
          linkUrl = (it.guid as Record<string, unknown>)._ as string;
        }
        const descHtml = typeof it.description === "string" ? it.description : "";
        const googleParam = linkUrl.match(/[?&]url=([^&]+)/);
        const anchorMatch = descHtml.match(/href=["']([^"']+)["']/i);
        const resolvedLink =
          (googleParam && decodeURIComponent(googleParam[1])) ||
          (anchorMatch && anchorMatch[1]) ||
          linkUrl;
        const url = resolvedLink || "";
        if (!url || seen.has(url)) continue;
        seen.add(url);
        const image1 = extractImage(it);
        let image2: string | null = null;
        if (!image1) {
          const contentStr = (it["content:encoded"] as string | undefined) || it.content || descHtml || "";
          const match = typeof contentStr === "string" ? contentStr.match(/<img[^>]+src=["']([^"']+)["']/i) : null;
          image2 = match && match[1] ? match[1] : null;
        }
        let finalImage = image1 || image2;
        if (finalImage && finalImage.startsWith("//")) {
          finalImage = "https:" + finalImage;
        }

        const title = it.title || "Untitled";
        const description = (it.contentSnippet || it.content || descHtml || "").toString().trim();
        const publishedAt = it.isoDate || it.pubDate || new Date().toISOString();
        const source = feed.title || key;
        base.push({
          title,
          description,
          url,
          image: finalImage,
          publishedAt,
          source,
        });
      }
    }
    base.sort((a, b) => {
      const ta = new Date(a.publishedAt || "").getTime();
      const tb = new Date(b.publishedAt || "").getTime();
      return tb - ta;
    });
    base = base.slice(0, 12);
    const filled = await Promise.all(
      base.map(async (it) => {
        if (!it.image && it.url) {
          const og = await unstable_cache(() => fetchOgImage(it.url), ["og-image", it.url], { revalidate: 300 })();
          if (og) return { ...it, image: og };
          try {
            const host = new URL(it.url).host;
            const ph = svgPlaceholder(host);
            return { ...it, image: ph };
          } catch {
            return { ...it, image: svgPlaceholder(it.source || "News") };
          }
        }
        return it;
      })
    );
    return filled;
  };
  const cached = unstable_cache(fetchFeed, ["rss-topic", key], { revalidate: 300 });
  return cached();
}
