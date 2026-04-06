"use server";

import { auth } from "@/auth";
import { SecretService } from "@/services/secret.service";
import { revalidatePath } from "next/cache";

export async function getProviderKey(provider: "groq" | "gemini" = "groq") {
  const session = await auth();
  if (!session?.user?.id) return { exists: false, masked: null };
  const meta = await SecretService.getMasked(session.user.id, provider);
  return { exists: Boolean(meta?.exists), masked: meta?.masked ?? null };
}

export async function saveProviderKey(provider: "groq" | "gemini", apiKey: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!apiKey || !apiKey.trim()) return { success: false, error: "Missing key" };
  await SecretService.save(session.user.id, provider, apiKey.trim());
  revalidatePath("/user/dashboard");
  return { success: true };
}

export async function removeProviderKey(provider: "groq" | "gemini") {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  await SecretService.remove(session.user.id, provider);
  revalidatePath("/user/dashboard");
  return { success: true };
}
