import { redirect } from "next/navigation";
import { requireRole } from "@/lib/server/auth";

export default async function OwnerPage() {
  await requireRole("Joe");
  redirect("/sf-dashboard");
}
