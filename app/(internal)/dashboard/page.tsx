import { redirect } from "next/navigation";
import { requireCurrentProfile } from "@/lib/server/auth";

export default async function DashboardPage() {
  const profile = await requireCurrentProfile();
  redirect(profile.role === "Joe" ? "/owner" : "/admin");
}
