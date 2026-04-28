import { CrisisDetailView } from "@/components/CrisisDetailView";
import { getCrisisById } from "@/data/mock-data";

export default async function CrisisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const crisis = getCrisisById(id) ?? null;

  return <CrisisDetailView crisisId={id} initialCrisis={crisis} />;
}
