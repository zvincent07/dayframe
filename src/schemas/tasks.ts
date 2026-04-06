import { z } from "zod";

export const taskCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  duration: z.string().optional().default(""),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  duration: z.string().optional(),
  isCompleted: z.boolean().optional(),
  completedDateKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
