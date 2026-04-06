import mongoose from "mongoose"
import connectDB, { toObjectId } from "@/lib/mongodb"
import { UserSecret, IUserSecret } from "@/models/UserSecret"

export class SecretRepository {
  static async upsert(userId: string, provider: string, keyEnc: string) {
    await connectDB()
    const uid = toObjectId(userId)
    return UserSecret.findOneAndUpdate(
      { userId: uid, provider },
      { $set: { keyEnc } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).lean<IUserSecret | null>()
  }

  static async find(userId: string, provider: string) {
    await connectDB()
    const uid = toObjectId(userId)
    return UserSecret.findOne({ userId: uid, provider }).lean<IUserSecret | null>()
  }

  static async remove(userId: string, provider: string) {
    await connectDB()
    const uid = toObjectId(userId)
    await UserSecret.deleteOne({ userId: uid, provider })
    return { success: true }
  }
}

