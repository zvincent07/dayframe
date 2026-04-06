import { z } from "zod";

export const systemConfigSchema = z.object({
  appName: z.string().min(1, "App Name is required").max(50, "App Name is too long"),
  appDescription: z.string().max(500, "Description is too long").optional(),
  supportEmail: z.string().email("Invalid email address"),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(200, "Message is too long").optional(),
  allowPublicRegistration: z.boolean().optional(),
  emailVerificationRequired: z.boolean().optional(),
  systemTimezone: z.string().min(1, "Timezone is required"),
  dateFormat: z.string().min(1, "Date format is required"),
  logoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type SystemConfigInput = z.infer<typeof systemConfigSchema>;
