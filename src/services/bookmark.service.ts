import { BookmarkRepository } from "@/repositories/bookmark.repository";
import type { IBookmark, BookmarkType } from "@/models/Bookmark";
import type { OGSOptions, OGSResult } from "open-graph-scraper";
import dns from "node:dns/promises";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function classifyUrl(url: string): { type: BookmarkType; provider?: string | null; videoId?: string | null } {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      const vid = u.searchParams.get("v") || (u.hostname.includes("youtu.be") ? u.pathname.replace("/", "") : null);
      const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
      const videoId = vid || (m && m[1] ? m[1] : null);
      return { type: "video", provider: "youtube", videoId };
    }
    if (host.includes("vimeo.com")) {
      return { type: "video", provider: "vimeo", videoId: null };
    }
    return { type: "article", provider: null, videoId: null };
  } catch {
    return { type: "other", provider: null, videoId: null };
  }
}

async function fetchOpenGraph(url: string): Promise<{ title?: string; description?: string; image?: string }> {
  try {
    const { default: ogs } = await import("open-graph-scraper");
    const { error, result }: OGSResult = await ogs({ url, maxRedirects: 3 } as OGSOptions);
    if (error) return {};
    const r = result as Record<string, unknown>;
    const title = typeof r.ogTitle === "string" ? r.ogTitle : typeof r.title === "string" ? r.title : undefined;
    const description = typeof r.ogDescription === "string" ? r.ogDescription : typeof r.description === "string" ? r.description : undefined;
    let image: string | undefined;
    const ogImage = r.ogImage;
    if (Array.isArray(ogImage)) {
      const first = ogImage[0] as Record<string, unknown>;
      const urlVal = first?.url;
      if (typeof urlVal === "string") image = urlVal;
    } else if (ogImage && typeof ogImage === "object") {
      const urlVal = (ogImage as Record<string, unknown>).url;
      if (typeof urlVal === "string") image = urlVal;
    } else if (typeof r.image === "string") {
      image = r.image;
    }
    return { title, description, image };
  } catch {
    return {};
  }
}

export class BookmarkService {
  private static isPrivateAddress(ip: string): boolean {
    if (net.isIP(ip) === 0) return false;
    if (ip === "127.0.0.1" || ip === "::1") return true;
    if (ip.startsWith("10.")) return true;
    if (ip.startsWith("192.168.")) return true;
    const a = ip.split(".");
    if (a.length === 4) {
      const b0 = Number(a[0]);
      const b1 = Number(a[1]);
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
      if (b0 === 169 && b1 === 254) return true;
      if (b0 === 127) return true;
    }
    if (ip.toLowerCase().startsWith("fe80:")) return true;
    if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd")) return true;
    return false;
  }

  private static async isSafeHttpUrl(raw: string): Promise<boolean> {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      return false;
    }
    if (!(u.protocol === "http:" || u.protocol === "https:")) return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
    if (net.isIP(host)) {
      return !this.isPrivateAddress(host);
    }
    try {
      const lookup = await Promise.race([
        dns.lookup(host),
        delay(500).then(() => null),
      ]);
      if (!lookup) return true;
      const ip = typeof lookup === "object" && "address" in lookup ? (lookup as { address: string }).address : "";
      if (!ip) return true;
      return !this.isPrivateAddress(ip);
    } catch {
      return true;
    }
  }

  private static async headChecksOk(raw: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(raw, { method: "HEAD", redirect: "manual", signal: controller.signal }).catch(() => null);
      clearTimeout(t);
      if (!(res && (res.status >= 200 && res.status < 400))) return false;
      const ct = res.headers.get("content-type") || "";
      if (ct && !ct.includes("text/html")) return false;
      return true;
    } catch {
      return false;
    }
  }

  static async add(userId: string, url: string): Promise<IBookmark> {
    const safe = await this.isSafeHttpUrl(url);
    if (!safe) {
      throw new Error("Unsafe URL");
    }
    const domain = extractDomain(url);
    const cls = classifyUrl(url);
    const created = await BookmarkRepository.create(userId, {
      url,
      type: cls.type,
      domain,
      provider: cls.provider || null,
      videoId: cls.videoId || null,
      playInline: cls.type === "video" ? true : false,
    });
    return created;
  }

  static async refreshMeta(userId: string, id: string, url: string, type: BookmarkType): Promise<void> {
    if (type !== "article") return;
    const safe = await this.isSafeHttpUrl(url);
    if (!safe) return;
    const ok = await this.headChecksOk(url);
    if (!ok) return;
    const meta = await fetchOpenGraph(url);
    if (meta.title || meta.description || meta.image) {
      await BookmarkRepository.update(userId, id, {
        title: meta.title,
        description: meta.description,
        image: meta.image,
      });
    }
  }

  static async list(userId: string): Promise<IBookmark[]> {
    return BookmarkRepository.list(userId);
  }

  static async update(userId: string, id: string, data: { title?: string; description?: string }): Promise<IBookmark | null> {
    return BookmarkRepository.update(userId, id, data);
  }

  static async remove(userId: string, id: string): Promise<void> {
    return BookmarkRepository.delete(userId, id);
  }

  static async setInline(userId: string, id: string, enabled: boolean): Promise<IBookmark | null> {
    return BookmarkRepository.setPlayInline(userId, id, enabled);
  }
}
