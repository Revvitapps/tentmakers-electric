"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentProfile } from "@/lib/server/auth";
import { failure, success, type ActionResult } from "@/lib/server/action-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deleteScriptSchema, scriptTemplateSchema } from "@/lib/validators/script";

function revalidateScriptViews() {
  revalidatePath("/scripts");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
}

export async function upsertScriptTemplateAction(input: unknown): Promise<ActionResult> {
  const parsed = scriptTemplateSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid script template.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();

  if (profile.role !== "Joe") {
    return failure("Only Joe can manage script templates.");
  }

  const supabase = createServerSupabaseClient() as any;

  if (parsed.data.id) {
    const { error } = await supabase
      .from("script_templates")
      .update({
        template_key: parsed.data.templateKey,
        title: parsed.data.title,
        body: parsed.data.body,
        is_system: parsed.data.isSystem,
      })
      .eq("id", parsed.data.id);

    if (error) {
      return failure(error.message);
    }

    revalidateScriptViews();
    return success("Script template updated.");
  }

  const { error } = await supabase.from("script_templates").insert({
    template_key: parsed.data.templateKey,
    title: parsed.data.title,
    body: parsed.data.body,
    is_system: parsed.data.isSystem,
    created_by: profile.id,
  });

  if (error) {
    return failure(error.message);
  }

  revalidateScriptViews();
  return success("Script template created.");
}

export async function deleteScriptTemplateAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteScriptSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid script id.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireCurrentProfile();

  if (profile.role !== "Joe") {
    return failure("Only Joe can delete script templates.");
  }

  const supabase = createServerSupabaseClient() as any;
  const { data: script, error: loadError } = await supabase
    .from("script_templates")
    .select("id, is_system")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (loadError || !script) {
    return failure(loadError?.message ?? "Script not found.");
  }

  if (script.is_system) {
    return failure("System scripts cannot be deleted.");
  }

  const { error } = await supabase.from("script_templates").delete().eq("id", parsed.data.id);

  if (error) {
    return failure(error.message);
  }

  revalidateScriptViews();
  return success("Script template deleted.");
}
