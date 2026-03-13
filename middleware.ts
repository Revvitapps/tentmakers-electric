import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/dashboard/:path*", "/sf-dashboard/:path*", "/leads/:path*", "/scripts/:path*", "/kpis/:path*", "/login"],
};
