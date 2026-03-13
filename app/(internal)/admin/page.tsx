import { redirect } from "next/navigation";
import { requireRole } from "@/lib/server/auth";

export default async function AdminPage() {
  await requireRole("VA");
  redirect("/dashboard");
}
