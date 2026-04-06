export const LB_PER_KG = 2.20462262185;

export const DEFAULT_WEEKLY_SCHEDULE: Record<0 | 1 | 2 | 3 | 4 | 5 | 6, string> = {
  0: "REST", // Sunday
  1: "REST", // Monday
  2: "REST", // Tuesday
  3: "REST", // Wednesday
  4: "REST", // Thursday
  5: "REST", // Friday
  6: "REST", // Saturday
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const MAX_IMAGES = 8;
export const MAX_IMAGE_SIZE_MB = 2;
export const MAX_FOOD_IMAGES = 8;

export const DAYS_SUN_FIRST = [
  { key: "sunday", label: "SUN" },
  { key: "monday", label: "MON" },
  { key: "tuesday", label: "TUE" },
  { key: "wednesday", label: "WED" },
  { key: "thursday", label: "THU" },
  { key: "friday", label: "FRI" },
  { key: "saturday", label: "SAT" },
] as const;
