import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertRunOwner } from "@/lib/access";
import { jsonError } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const access = await assertRunOwner(runId, user.id);
  if (!access.ok || !access.run) return jsonError("Run not found.", 404);

  const supabase = access.supabase;
  const run = access.run;

  const [{ data: suite }, { data: metric }, { data: baselineMetric }] = await Promise.all([
    supabase.from("suites").select("name").eq("id", run.suite_id).single(),
    supabase
      .from("run_metrics")
      .select("pass_rate, avg_correctness, avg_latency_ms, p90_latency_ms, total_cost")
      .eq("run_id", run.id)
      .maybeSingle(),
    run.baseline_run_id
      ? supabase.from("run_metrics").select("pass_rate").eq("run_id", run.baseline_run_id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const passRateDelta =
    run.baseline_run_id && metric?.pass_rate !== null && baselineMetric?.pass_rate !== null
      ? (metric?.pass_rate ?? 0) - (baselineMetric?.pass_rate ?? 0)
      : null;

  return NextResponse.json({
    run: {
      ...run,
      suite_name: suite?.name ?? "Unknown suite"
    },
    metrics: metric
      ? {
          pass_rate: metric.pass_rate,
          avg_correctness: metric.avg_correctness,
          avg_latency_ms: metric.avg_latency_ms,
          p90_latency_ms: metric.p90_latency_ms,
          total_cost: metric.total_cost,
          pass_rate_delta: passRateDelta
        }
      : null
  });
}
