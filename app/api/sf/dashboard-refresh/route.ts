import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { getSfDashboardData } from "@/lib/server/sf-dashboard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  return handleRefresh(request);
}

export async function GET(request: Request) {
  return handleRefresh(request);
}

async function handleRefresh(request: Request) {
  try {
    const cronAuthorized = isCronAuthorized(request);

    if (!cronAuthorized) {
      const supabase = createServerSupabaseClient() as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!profile || (profile.role !== "Joe" && profile.role !== "VA")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    revalidateTag("sf-dashboard");
    const data = await getSfDashboardData();

    return NextResponse.json(
      {
        ok: true,
        refreshedAt: new Date().toISOString(),
        generatedAt: data.generatedAt,
        range: data.range,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to refresh Service Fusion dashboard data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
