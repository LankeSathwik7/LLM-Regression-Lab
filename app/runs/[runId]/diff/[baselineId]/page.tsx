import { RunDiffView } from "@/components/runs/run-diff-view";

export default async function RunDiffPage({
  params
}: {
  params: Promise<{ runId: string; baselineId: string }>;
}) {
  const { runId, baselineId } = await params;
  return <RunDiffView runId={runId} baselineId={baselineId} />;
}
