import { CrisisHelpView } from "@/components/CrisisHelpView";
import {
  getCrisisById,
  getNGOProfileByCrisisId,
  getResourcesByCrisisId,
} from "@/data/mock-data";

export default async function CrisisHelpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <CrisisHelpView
      crisisId={id}
      initialCrisis={getCrisisById(id) ?? null}
      initialNGOProfile={getNGOProfileByCrisisId(id) ?? null}
      initialResourceNeeds={getResourcesByCrisisId(id)}
    />
  );
}
