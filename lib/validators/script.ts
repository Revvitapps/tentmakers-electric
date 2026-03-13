import { z } from "zod";

export const scriptTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  templateKey: z
    .string()
    .min(3, "Key is required.")
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores."),
  title: z.string().min(3, "Title is required."),
  body: z.string().min(10, "Script body is required."),
  isSystem: z.boolean().default(false),
});

export const deleteScriptSchema = z.object({
  id: z.string().uuid(),
});

export type ScriptTemplateSchema = z.infer<typeof scriptTemplateSchema>;
