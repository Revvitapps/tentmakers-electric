import { z } from "zod";

export const loginSchema = z.object({
  role: z.enum(["admin", "owner"], {
    errorMap: () => ({ message: "Select a valid role." }),
  }),
  accessKey: z.string().min(4, "Enter your access key."),
});

export type LoginSchema = z.infer<typeof loginSchema>;
