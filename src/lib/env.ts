import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    MONGODB_URI: z.string().url(),
    AUTH_SECRET: z.string().min(32),
    CRON_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional().default("noreply@dayframe.com"),
    GMAIL_USER: z.string().email().optional(),
    GMAIL_APP_PASSWORD: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {
    // Add client-side variables here (e.g. NEXT_PUBLIC_...)
  },
  runtimeEnv: {
    MONGODB_URI: process.env.MONGODB_URI,
    AUTH_SECRET: process.env.AUTH_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

const isProd = process.env.NODE_ENV === "production";
if (isProd) {
  const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!hasUpstash) {}
}
