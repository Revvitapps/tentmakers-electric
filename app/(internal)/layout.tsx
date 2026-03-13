import type { ReactNode } from "react";
import Link from "next/link";

import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { InternalNav } from "@/components/va/internal-nav";
import { SfRefreshButton } from "@/components/va/sf-refresh-button";
import { requireCurrentProfile } from "@/lib/server/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function InternalLayout({ children }: { children: ReactNode }) {
  const profile = await requireCurrentProfile();
  const supabase = createServerSupabaseClient();

  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .not("next_touch_at", "is", null)
    .lte("next_touch_at", new Date().toISOString())
    .neq("stage", "Closed");

  return (
    <div className="min-h-screen px-4 pb-10 pt-6 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="rounded-2xl border border-zinc-200 bg-white/95 px-5 py-4 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href={profile.role === "Joe" ? "/owner" : "/admin"} className="text-xl font-semibold tracking-tight text-zinc-900">
                Tentmakers Electric - {profile.role === "Joe" ? "Owner Dashboard" : "Angel's Workspace"}
              </Link>
              <p className="text-sm text-zinc-600">No floating leads. SOP-first execution.</p>
            </div>

            <div className="flex items-center gap-2">
              <SfRefreshButton />
              <span className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700">{profile.full_name.toUpperCase()}</span>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm" className="rounded-xl">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </header>

        <InternalNav role={profile.role} followUpsDue={count ?? 0} />

        <main>{children}</main>
      </div>
    </div>
  );
}
