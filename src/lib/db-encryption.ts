import crypto from "crypto";
import { env } from "@/lib/env";

interface Keyring {
  activeKid: string;
  keys: Record<string, Buffer>;
}

let cachedKeyring: Keyring | null = null;

function parseKeyring(): Keyring {
  if (cachedKeyring) return cachedKeyring;

  const activeKid = env.DB_ENCRYPTION_ACTIVE_KID;
  let keyMap: Record<string, string> = {};
  try {
    keyMap = JSON.parse(env.DB_ENCRYPTION_KEYRING_JSON) as Record<string, string>;
  } catch {
    throw new Error("Invalid DB_ENCRYPTION_KEYRING_JSON (must be JSON map of kid->base64)");
  }
  const keys: Record<string, Buffer> = {};
  for (const [kid, b64] of Object.entries(keyMap)) {
    const buf = Buffer.from(b64, "base64");
    if (buf.length !== 32) {
      throw new Error(`DB encryption key ${kid} must decode to 32 bytes`);
    }
    keys[kid] = buf;
  }
  if (!keys[activeKid]) {
    throw new Error(`Active DB encryption kid ${activeKid} not found in keyring`);
  }
  cachedKeyring = { activeKid, keys };
  return cachedKeyring;
}

function b64u(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromB64u(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/**
 * Envelope encryption:
 * - generate random DEK (32 bytes)
 * - encrypt plaintext with DEK (AES-256-GCM)
 * - encrypt DEK with master key (AES-256-GCM)
 *
 * Storage format:
 * dfdb:v1:<kid>:<ivData>:<ctData>:<tagData>:<ivKey>:<ctKey>:<tagKey>
 */
const PREFIX = "dfdb:v1:";

export function isEncryptedDbValue(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptJsonForDb(value: unknown): string {
  const { activeKid, keys } = parseKeyring();
  const master = keys[activeKid];

  const dek = crypto.randomBytes(32);

  const ivData = crypto.randomBytes(12);
  const cipherData = crypto.createCipheriv("aes-256-gcm", dek, ivData);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ctData = Buffer.concat([cipherData.update(plaintext), cipherData.final()]);
  const tagData = cipherData.getAuthTag();

  const ivKey = crypto.randomBytes(12);
  const cipherKey = crypto.createCipheriv("aes-256-gcm", master, ivKey);
  const ctKey = Buffer.concat([cipherKey.update(dek), cipherKey.final()]);
  const tagKey = cipherKey.getAuthTag();

  return `${PREFIX}${activeKid}:${b64u(ivData)}:${b64u(ctData)}:${b64u(tagData)}:${b64u(ivKey)}:${b64u(ctKey)}:${b64u(tagKey)}`;
}

export function decryptJsonFromDb<T>(payload: unknown): T | null {
  if (!isEncryptedDbValue(payload)) return null;
  const raw = payload.slice(PREFIX.length);
  const parts = raw.split(":");
  if (parts.length !== 7) return null;
  const [kid, ivDataB64, ctDataB64, tagDataB64, ivKeyB64, ctKeyB64, tagKeyB64] = parts;

  const { keys } = parseKeyring();
  const master = keys[kid];
  if (!master) return null;

  try {
    const ivKey = fromB64u(ivKeyB64);
    const ctKey = fromB64u(ctKeyB64);
    const tagKey = fromB64u(tagKeyB64);
    const decipherKey = crypto.createDecipheriv("aes-256-gcm", master, ivKey);
    decipherKey.setAuthTag(tagKey);
    const dek = Buffer.concat([decipherKey.update(ctKey), decipherKey.final()]);

    const ivData = fromB64u(ivDataB64);
    const ctData = fromB64u(ctDataB64);
    const tagData = fromB64u(tagDataB64);
    const decipherData = crypto.createDecipheriv("aes-256-gcm", dek, ivData);
    decipherData.setAuthTag(tagData);
    const plaintext = Buffer.concat([decipherData.update(ctData), decipherData.final()]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    return null;
  }
}

