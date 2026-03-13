import { z } from "zod";

export const csvLeadRowSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional().nullable(),
  address: z.string().min(1),
  source: z.string().optional().nullable(),
  jobType: z.string().min(1),
  createdAt: z.string().optional().nullable(),
});

export const csvImportSchema = z.array(csvLeadRowSchema).max(2000);

export type CsvLeadRow = z.infer<typeof csvLeadRowSchema>;
