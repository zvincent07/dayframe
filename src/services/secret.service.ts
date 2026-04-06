import { SecretRepository } from "@/repositories/secret.repository"
import { encrypt, decrypt } from "@/lib/crypto"

export class SecretService {
  static async save(userId: string, provider: string, keyPlain: string) {
    const keyEnc = encrypt(keyPlain)
    await SecretRepository.upsert(userId, provider, keyEnc)
    return { success: true }
  }

  static async getMasked(userId: string, provider: string) {
    const rec = await SecretRepository.find(userId, provider)
    if (!rec) return { exists: false, masked: null as string | null }
    const k = decrypt(rec.keyEnc)
    const masked = k.length <= 6 ? "*".repeat(k.length) : "*".repeat(12) + k.slice(-4)
    return { exists: true, masked }
  }

  static async getDecrypted(userId: string, provider: string) {
    const rec = await SecretRepository.find(userId, provider)
    if (!rec) return null
    return decrypt(rec.keyEnc)
  }

  static async remove(userId: string, provider: string) {
    await SecretRepository.remove(userId, provider)
    return { success: true }
  }
}
