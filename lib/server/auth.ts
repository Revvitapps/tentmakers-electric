import { redirect } from "next/navigation";

import type { Profile } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getCurrentProfile(userId?: string): Promise<Profile | null> {
  const supabase = createServerSupabaseClient();
  const user = userId ? { id: userId } : await requireCurrentUser();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  return data;
}

export async function requireCurrentProfile() {
  const user = await requireCurrentUser();
  const profile = await getCurrentProfile(user.id);

  if (!profile) {
    return {
      id: user.id,
      full_name: user.email ?? "Unknown",
      role: "VA" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return profile;
}

export async function requireRole(role: Profile["role"]) {
  const profile = await requireCurrentProfile();
  if (profile.role !== role) {
    redirect(role === "Joe" ? "/admin" : "/owner");
  }
  return profile;
}
