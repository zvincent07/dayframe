import { z } from "zod";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

export const verify2FASchema = z.object({
  token: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must be numeric"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type Verify2FAInput = z.infer<typeof verify2FASchema>;
