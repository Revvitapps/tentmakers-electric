"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators/auth";
import { failure, success, type ActionResult } from "@/lib/server/action-types";

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Please fix the highlighted errors.", parsed.error.flatten().fieldErrors);
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return failure(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/sf-dashboard");
  return success("Login successful.");
}

export async function signOutAction(): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
