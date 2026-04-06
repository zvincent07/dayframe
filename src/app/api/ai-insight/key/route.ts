import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { SecretService } from "@/services/secret.service"
import { rateLimit } from "@/lib/rate-limit"
import { cookies } from "next/headers"
import crypto from "crypto"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const url = new URL(req.url)
  const provider = (url.searchParams.get("provider") || "groq").toLowerCase()
  const meta = await SecretService.getMasked(session.user.id, provider)
  const store = await cookies()
  let csrf = store.get("df_csrf")?.value
  if (!csrf) {
    csrf = crypto.randomBytes(32).toString("base64url")
  }
  const res = NextResponse.json(meta)
  if (csrf && !store.get("df_csrf")?.value) {
    res.cookies.set("df_csrf", csrf, {
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
  }
  return res
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin") || ""
  const referer = req.headers.get("referer") || ""
  const allowed = (process.env.NEXT_PUBLIC_APP_URL || "").toLowerCase()
  if (allowed && origin && !origin.toLowerCase().startsWith(allowed) && referer && !referer.toLowerCase().startsWith(allowed)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const store = await cookies()
  const csrfHeader = req.headers.get("x-csrf-token") || ""
  const csrfCookie = store.get("df_csrf")?.value || ""
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
  }
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  const rlOk = await rateLimit(`ai-key:${ip}`, 5)
  if (!rlOk) return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  {
    const rlUserOk = await rateLimit(`ai-key:user:${session.user.id}`, 10)
    if (!rlUserOk) return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }
  const body = await req.json().catch(() => ({}))
  const apiKey = String(body?.apiKey || "")
  const provider = String(body?.provider || "groq").toLowerCase()
  if (!apiKey) return NextResponse.json({ error: "Missing key" }, { status: 400 })
  await SecretService.save(session.user.id, provider, apiKey)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const origin = req.headers.get("origin") || ""
  const referer = req.headers.get("referer") || ""
  const allowed = (process.env.NEXT_PUBLIC_APP_URL || "").toLowerCase()
  if (allowed && origin && !origin.toLowerCase().startsWith(allowed) && referer && !referer.toLowerCase().startsWith(allowed)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const store = await cookies()
  const csrfHeader = req.headers.get("x-csrf-token") || ""
  const csrfCookie = store.get("df_csrf")?.value || ""
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
  }
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  const rlOk = await rateLimit(`ai-key-del:${ip}`, 5)
  if (!rlOk) return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  {
    const rlUserOk = await rateLimit(`ai-key-del:user:${session.user.id}`, 10)
    if (!rlUserOk) return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }
  const url = new URL(req.url)
  const provider = (url.searchParams.get("provider") || "groq").toLowerCase()
  await SecretService.remove(session.user.id, provider)
  return NextResponse.json({ success: true })
}
