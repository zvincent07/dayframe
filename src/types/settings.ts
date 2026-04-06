export const SETTINGS_KEYS = {
  APP_NAME: "app_name",
  APP_DESCRIPTION: "app_description",
  SUPPORT_EMAIL: "support_email",
  MAINTENANCE_MODE: "maintenance_mode",
  MAINTENANCE_MESSAGE: "maintenance_message",
  ALLOW_PUBLIC_REGISTRATION: "allow_public_registration",
  EMAIL_VERIFICATION_REQUIRED: "email_verification_required",
  SYSTEM_TIMEZONE: "system_timezone",
  DATE_FORMAT: "date_format",
  LOGO_URL: "logo_url",
} as const;

export interface SystemConfig {
  appName: string;
  appDescription: string;
  supportEmail: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowPublicRegistration: boolean;
  emailVerificationRequired: boolean;
  systemTimezone: string;
  dateFormat: string;
  logoUrl?: string;
}

export const DEFAULT_CONFIG: SystemConfig = {
  appName: "Dayframe Journal",
  appDescription: "Capture your day, track your habits, and grow with mentorship. Your personal space for reflection and progress.",
  supportEmail: "support@dayframe.com",
  maintenanceMode: false,
  maintenanceMessage: "We are currently undergoing maintenance. Please check back later.",
  allowPublicRegistration: true,
  emailVerificationRequired: true,
  systemTimezone: "UTC",
  dateFormat: "MM/DD/YYYY",
  logoUrl: undefined,
};
