import { CertificateView } from "@/components/CertificateView";
import { getCertificateById } from "@/data/mock-data";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <CertificateView
      certificateId={id}
      initialCertificate={getCertificateById(id) ?? null}
    />
  );
}
