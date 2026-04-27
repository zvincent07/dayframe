function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function getOrCreateSessionKey(): Promise<CryptoKey> {
  const existing = sessionStorage.getItem("df_local_cache_key_v1");
  if (existing) {
    const raw = base64ToBytes(existing);
    return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  }
  const raw = crypto.getRandomValues(new Uint8Array(32));
  sessionStorage.setItem("df_local_cache_key_v1", bytesToBase64(raw));
  return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptJsonForLocalCache(value: unknown): Promise<string> {
  const key = await getOrCreateSessionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  return `dfenc:v1:${bytesToBase64(iv)}:${bytesToBase64(ciphertext)}`;
}

export async function decryptJsonFromLocalCache<T>(payload: string): Promise<T | null> {
  if (!payload.startsWith("dfenc:v1:")) return null;
  const parts = payload.split(":");
  if (parts.length < 5) return null;
  const ivB64 = parts[2] ?? "";
  const dataB64 = parts.slice(3).join(":");
  try {
    const key = await getOrCreateSessionKey();
    const iv = base64ToBytes(ivB64);
    const data = base64ToBytes(dataB64);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    const text = new TextDecoder().decode(new Uint8Array(plaintext));
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

