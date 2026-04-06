import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import { env } from "@/lib/env"

function key() {
  return createHash("sha256").update(env.AUTH_SECRET).digest()
}

export function encrypt(text: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":")
  const iv = Buffer.from(ivB64, "base64")
  const tag = Buffer.from(tagB64, "base64")
  const data = Buffer.from(dataB64, "base64")
  const decipher = createDecipheriv("aes-256-gcm", key(), iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(data), decipher.final()])
  return dec.toString("utf8")
}

