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

  const accessKey = process.env.DASHBOARD_ACCESS_KEY;
  const role = parsed.data.role;
  const providedKey = parsed.data.accessKey.trim();

  if (!accessKey) {
    return failure("Missing DASHBOARD_ACCESS_KEY environment variable.");
  }

  if (providedKey !== accessKey) {
    return failure("Invalid access key.");
  }

  const email = role === "admin" ? process.env.DASHBOARD_ADMIN_EMAIL : process.env.DASHBOARD_OWNER_EMAIL;
  const password = role === "admin" ? process.env.DASHBOARD_ADMIN_PASSWORD : process.env.DASHBOARD_OWNER_PASSWORD;

  if (!email || !password) {
    return failure(
      role === "admin"
        ? "Missing DASHBOARD_ADMIN_EMAIL or DASHBOARD_ADMIN_PASSWORD."
        : "Missing DASHBOARD_OWNER_EMAIL or DASHBOARD_OWNER_PASSWORD."
    );
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

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
