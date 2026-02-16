import { SuiteDetail } from "@/components/suites/suite-detail";

export default async function SuitePage({
  params
}: {
  params: Promise<{ projectId: string; suiteId: string }>;
}) {
  const { projectId, suiteId } = await params;
  return <SuiteDetail projectId={projectId} suiteId={suiteId} />;
}
