import { ScriptsView } from "@/components/va/scripts-view";
import { requireCurrentProfile } from "@/lib/server/auth";
import { getScriptTemplates } from "@/lib/server/queries";

export default async function ScriptsPage() {
  const [profile, scripts] = await Promise.all([requireCurrentProfile(), getScriptTemplates()]);

  return <ScriptsView scripts={scripts} role={profile.role} />;
}
