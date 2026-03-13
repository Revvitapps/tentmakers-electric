import { notFound } from "next/navigation";

import { LeadDetailView } from "@/components/va/lead-detail-view";
import { getLeadById } from "@/lib/server/queries";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const data = await getLeadById(params.id);

  if (!data.lead) {
    notFound();
  }

  return <LeadDetailView lead={data.lead} activities={data.activities} scripts={data.scripts} followUps={data.followUps} />;
}
