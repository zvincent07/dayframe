import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

function validLatLon(lat: unknown, lon: unknown) {
  const la = typeof lat === "number" ? lat : Number(lat);
  const lo = typeof lon === "number" ? lon : Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { lat: la, lon: lo };
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const ok = await rateLimit(`weather:${ip}`, 30);
  if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const coords = validLatLon(body?.lat, body?.lon);
  if (!coords) return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });

  const q = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current: "temperature_2m,weather_code",
  });
  const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${q.toString()}`);
  if (!resp.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  const data = await resp.json();
  return NextResponse.json(data);
}
