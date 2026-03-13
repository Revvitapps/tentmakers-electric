"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { loginSchema } from "@/lib/validators/auth";
import { failure, success, type ActionResult } from "@/lib/server/action-types";

export async function loginAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = loginSchema.safeParse(input);

    if (!parsed.success) {
      return failure("Please fix the highlighted errors.", parsed.error.flatten().fieldErrors);
    }

    if (!hasSupabaseEnv()) {
      return failure("Supabase environment variables are missing in this deployment.");
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return failure(error.message);
    }

    revalidatePath("/admin");
    revalidatePath("/owner");
    revalidatePath("/dashboard");
    revalidatePath("/sf-dashboard");
    return success("Login successful.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Login failed due to a server error.");
  }
}

export async function signOutAction(): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
