import { z } from "zod";

export const addBookmarkSchema = z.object({
  url: z.string().url("Invalid URL"),
});

export const updateBookmarkSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const toggleInlineSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});

export type AddBookmarkInput = z.infer<typeof addBookmarkSchema>;
export type UpdateBookmarkInput = z.infer<typeof updateBookmarkSchema>;
