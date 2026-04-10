import { z } from "zod";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  duration: z.string().optional().default(""),
  done: z.boolean().optional().default(false),
});

const foodLogSchema = z.object({
  morning: z.string().optional().default(""),
  lunch: z.string().optional().default(""),
  noon: z.string().optional().default(""),
  dinner: z.string().optional().default(""),
});

const spendingSchema = z.object({
  price: z.coerce.number(),
  item: z.string().min(1),
  description: z.string().optional().default(""),
});

const workoutSchema = z.object({
  exercise: z.string().min(1),
  sets: z.number().optional(),
  reps: z.string().optional(),
  rpe: z.number().optional(),
  weight: z.number().optional(),
  notes: z.string().optional(),
  history: z
    .array(
      z.object({
        set: z.number().int().min(1),
        targetWeight: z.number().optional(),
        actualWeight: z.number().optional(),
        targetReps: z.number().optional(),
        actualReps: z.number().optional(),
        completed: z.boolean().optional(),
      })
    )
    .optional(),
});

export const journalUpdateSchema = z.object({
  notes: z.string().optional().default(""),
  images: z.array(z.string()).optional().default([]),
  mainTask: z.string().optional().default(""),
  tasks: z.array(taskSchema).optional(),
  food: foodLogSchema.optional().default({ morning: "", lunch: "", noon: "", dinner: "" }),
  foodImages: z.array(z.string()).optional(),
  spending: z.array(spendingSchema).optional().default([]),
  currency: z.string().optional(),
  workouts: z.array(workoutSchema).optional(),
});

export const dateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export type JournalUpdateInput = z.infer<typeof journalUpdateSchema>;
