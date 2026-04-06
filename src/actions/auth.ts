"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { AuthService } from "@/services/auth.service";
import { signUpSchema } from "@/schemas/auth.schema";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

function getCauseMessage(error: AuthError): string | null {
  const cause = error.cause as { err?: Error } | Error | undefined;
  if (cause instanceof Error) return cause.message;
  if (typeof cause === "object" && cause !== null && "err" in cause) return (cause as { err: Error }).err.message;
  if (error.message) return error.message;
  return null;
}

export async function signUp(formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  // Rate limit: 5 signups per hour per IP (strict)
  if (!await rateLimit(`signup:${ip}`, 5)) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  const data = Object.fromEntries(formData.entries());
  
  const parsed = signUpSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  return await AuthService.signUp(parsed.data);
}

export async function login(prevState: string | undefined, formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  // Rate limit: 10 login attempts per minute per IP
  if (!await rateLimit(`login:${ip}`, 10)) {
    return "Too many login attempts. Please try again later.";
  }

  try {
    const data = Object.fromEntries(formData);
    await signIn("credentials", { ...data, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      const causeMsg = getCauseMessage(error);
      if (causeMsg === "2FA_REQUIRED") return "2FA_REQUIRED";
      if (causeMsg === "2FA_INVALID") return "Invalid 2FA code.";
      if (causeMsg === "Email verification required") return "Please verify your email before logging in.";

      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        case "CallbackRouteError":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    if (error instanceof Error) {
      if (error.message === "2FA_REQUIRED") return "2FA_REQUIRED";
      if (error.message === "2FA_INVALID") return "Invalid 2FA code.";
      if (error.message === "Email verification required") return "Please verify your email before logging in.";
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

export async function forgotPassword(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const ip = (await headers()).get("x-forwarded-for") || "unknown";

  // Rate limit: 5 attempts per hour per IP
  if (!await rateLimit(`forgot-password:${ip}`, 5)) {
    return { error: "Too many requests. Please try again later." };
  }

  try {
    const result = await AuthService.requestPasswordReset(email);
    if (result.error) {
      return { error: result.error };
    }
    return { success: result.message };
  } catch (error) {
    logger.error("forgotPassword action error", error as unknown);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function resetPassword(prevState: unknown, formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  
  if (!token) {
    return { error: "Missing reset token" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  try {
    const result = await AuthService.resetPassword(token, password);
    if (result.error) {
      return { error: result.error };
    }
    return { success: result.message };
  } catch (error) {
    logger.error("resetPassword action error", error as unknown);
    return { error: "Something went wrong. Please try again." };
  }
}
