
type RateLimitConfig = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

export interface RateLimiter {
  check(limit: number, token: string): Promise<void>;
}

class InMemoryRateLimit implements RateLimiter {
  private config: Required<RateLimitConfig>;
  private store: Map<string, number[]>;

  constructor(config: RateLimitConfig = {}) {
    this.config = {
      uniqueTokenPerInterval: config.uniqueTokenPerInterval || 500,
      interval: config.interval || 60000,
    };
    this.store = new Map();
  }

  public check(limit: number, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const windowStart = now - this.config.interval;

      const timestamps = this.store.get(token) || [];
      const validTimestamps = timestamps.filter((timestamp) => timestamp > windowStart);

      if (validTimestamps.length >= limit) {
        reject(new Error("Rate limit exceeded"));
      } else {
        validTimestamps.push(now);
        this.store.set(token, validTimestamps);
        
        // Cleanup old entries if map gets too big (simple heuristic)
        if (this.store.size > this.config.uniqueTokenPerInterval) {
           // In a real LRU cache we would remove the oldest accessed. 
           // Here we just clear roughly 10% of keys or just the current one if we wanted to be lazy.
           // For now, let's just leave it as simple Map, but the structure is here for Redis replacement.
        }
        
        resolve();
      }
    });
  }
}

class UpstashRedisRateLimit implements RateLimiter {
  private intervalMs: number;
  private baseUrl: string;
  private token: string;

  constructor(intervalMs: number) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error("Upstash Redis REST env vars are missing");
    }
    this.baseUrl = url.replace(/\/+$/, "");
    this.token = token;
    this.intervalMs = intervalMs;
  }

  async check(limit: number, key: string): Promise<void> {
    const windowSec = Math.ceil(this.intervalMs / 1000);
    const redisKey = `ratelimit:${key}`;

    const body = JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(windowSec), "NX"]
    ]);

    const res = await fetch(`${this.baseUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!res.ok) {
      // Fallback behavior: if Redis is unavailable, allow to avoid false blocks
      return;
    }
    const result = await res.json() as Array<[null | string, number]>;
    const incrReply = result?.[0]?.[1];
    if (typeof incrReply === "number" && incrReply > limit) {
      throw new Error("Rate limit exceeded");
    }
  }
}

const intervalMs = 60000;
let limiter: RateLimiter;
try {
  const isProd = process.env.NODE_ENV === "production";
  const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
  if (isProd && hasUpstash) {
    limiter = new UpstashRedisRateLimit(intervalMs);
  } else {
    limiter = new InMemoryRateLimit({ interval: intervalMs });
  }
} catch {
  limiter = new InMemoryRateLimit({ interval: intervalMs });
}

/**
 * Check if the request is allowed.
 * @param identifier Unique key (IP or User ID)
 * @param limit Max requests allowed in the window
 */
export async function rateLimit(identifier: string, limit: number = 10): Promise<boolean> {
  try {
    await limiter.check(limit, identifier);
    return true;
  } catch {
    return false;
  }
}
