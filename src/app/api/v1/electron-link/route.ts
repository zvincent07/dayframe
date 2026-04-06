import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import crypto from "crypto";

interface LinkEntry {
  sessionToken: string | null;
  createdAt: number;
}

// Persist across Next.js hot reloads in development
const globalForLink = globalThis as unknown as {
  __electronLinkStore?: Map<string, LinkEntry>;
};
const linkStore =
  globalForLink.__electronLinkStore ??
  (globalForLink.__electronLinkStore = new Map<string, LinkEntry>());

function cleanup() {
  const now = Date.now();
  for (const [code, entry] of linkStore) {
    if (now - entry.createdAt > 5 * 60 * 1000) linkStore.delete(code);
  }
}

export async function POST(req: NextRequest) {
  cleanup();
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "create") {
    const code = crypto.randomBytes(32).toString("hex");
    linkStore.set(code, { sessionToken: null, createdAt: Date.now() });
    return NextResponse.json({ code });
  }

  if (action === "complete") {
    const code = body.code as string;
    if (!code || !linkStore.has(code)) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get("authjs.session-token")?.value ??
      cookieStore.get("__Secure-authjs.session-token")?.value ??
      null;

    if (!sessionToken) {
      return NextResponse.json({ error: "No session token found" }, { status: 400 });
    }

    const entry = linkStore.get(code)!;
    entry.sessionToken = sessionToken;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  cleanup();
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const entry = linkStore.get(code);
  if (!entry) return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });

  if (entry.sessionToken) {
    linkStore.delete(code);
    return NextResponse.json({ status: "ready", token: entry.sessionToken });
  }

  return NextResponse.json({ status: "pending" });
}
