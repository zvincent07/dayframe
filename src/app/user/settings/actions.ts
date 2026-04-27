"use server";

import { auth } from "@/auth";
import { SecretService } from "@/services/secret.service";
import { revalidatePath } from "next/cache";
import { UserRepository } from "@/repositories/user.repository";
import { AuditService } from "@/services/audit.service";
import { after } from "next/server";

export async function getGroqKeyMeta() {
  const session = await auth();
  if (!session?.user?.id) return { exists: false, masked: null as string | null };
  return SecretService.getMasked(session.user.id, "groq");
}

export async function saveGroqKey(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;
  const key = String(formData.get("apiKey") || "");
  if (!key) return;
  await SecretService.save(session.user.id, "groq", key);
  revalidatePath("/user/settings");
}

export async function deleteGroqKey() {
  const session = await auth();
  if (!session?.user?.id) return;
  await SecretService.remove(session.user.id, "groq");
  revalidatePath("/user/settings");
}

export async function saveUnits(units: "metric" | "imperial") {
  const session = await auth();
  const userId = session?.user?.id;
  if (typeof userId !== "string" || !userId.trim()) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    const updated = await UserRepository.update(userId, { preferredUnits: units });
    if (!updated) {
      return { success: false, error: "Could not save preference (user not found)" };
    }
    after(async () => { await AuditService.log("PREFERENCES_UPDATED", userId, "User", { field: "units", value: units }); });
    revalidatePath("/user/settings");
    revalidatePath("/user/dashboard");
    revalidatePath("/user/today");
    revalidatePath("/user/journal");
    revalidatePath("/user/workout");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update units" };
  }
}

export async function saveFirstDayOfWeek(day: "sunday" | "monday") {
  const session = await auth();
  const userId = session?.user?.id;
  if (typeof userId !== "string" || !userId.trim()) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    const updated = await UserRepository.update(userId, { firstDayOfWeek: day });
    if (!updated) {
      return { success: false, error: "Could not save preference (user not found)" };
    }
    after(async () => { await AuditService.log("PREFERENCES_UPDATED", userId, "User", { field: "firstDayOfWeek", value: day }); });
    revalidatePath("/user/settings");
    revalidatePath("/user/today");
    revalidatePath("/user/journal");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update first day of week" };
  }
}

export async function saveCurrency(code: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (typeof userId !== "string" || !userId.trim()) {
    return { success: false, error: "Unauthorized" };
  }
  const value = (code || "").trim().toUpperCase();
  if (!value) return { success: false, error: "Missing currency" };
  try {
    const updated = await UserRepository.update(userId, { preferredCurrency: value });
    if (!updated) {
      return { success: false, error: "Could not save preference (user not found)" };
    }
    after(async () => { await AuditService.log("PREFERENCES_UPDATED", userId, "User", { field: "currency", value }); });
    revalidatePath("/user/settings");
    revalidatePath("/user/dashboard");
    revalidatePath("/user/today");
    revalidatePath("/user/journal");
    revalidatePath("/user/workout");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update currency" };
  }
}

export async function saveEncryptLocalCache(enabled: boolean) {
  const session = await auth();
  const userId = session?.user?.id;
  if (typeof userId !== "string" || !userId.trim()) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    const updated = await UserRepository.update(userId, { encryptLocalCache: !!enabled });
    if (!updated) {
      return { success: false, error: "Could not save preference (user not found)" };
    }
    after(async () => {
      await AuditService.log("PREFERENCES_UPDATED", userId, "User", {
        field: "encryptLocalCache",
        value: !!enabled,
      });
    });
    revalidatePath("/user/settings");
    revalidatePath("/user/workout");
    revalidatePath("/user/today");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update encryption preference" };
  }
}
