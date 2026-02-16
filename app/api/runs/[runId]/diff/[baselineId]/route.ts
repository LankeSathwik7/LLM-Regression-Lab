import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertRunOwner } from "@/lib/access";
import { jsonError } from "@/lib/api";

type ResultRow = {
  id: string;
  test_id: string;
  status: "pass" | "fail" | "error";
  scores: { correctness?: number } | null;
  failure_reasons: string[] | null;
  raw_output: { output_text?: string; judge_explanation?: string } | null;
};

export async function GET(
  _: Request,
  { params }: { params: Promise<{ runId: string; baselineId: string }> }
) {
  const { runId, baselineId } = await params;
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const [candidateAccess, baselineAccess] = await Promise.all([assertRunOwner(runId, user.id), assertRunOwner(baselineId, user.id)]);
  if (!candidateAccess.ok || !baselineAccess.ok) return jsonError("Run not found.", 404);

  const supabase = candidateAccess.supabase;
  const [{ data: candidateMetric }, { data: baselineMetric }, { data: candidateResults }, { data: baselineResults }] =
    await Promise.all([
      supabase
        .from("run_metrics")
        .select("pass_rate, avg_latency_ms, total_cost")
        .eq("run_id", runId)
        .maybeSingle(),
      supabase
        .from("run_metrics")
        .select("pass_rate, avg_latency_ms, total_cost")
        .eq("run_id", baselineId)
        .maybeSingle(),
      supabase
        .from("results")
        .select("id, test_id, status, scores, failure_reasons, raw_output")
        .eq("run_id", runId),
      supabase
        .from("results")
        .select("id, test_id, status, scores, failure_reasons, raw_output")
        .eq("run_id", baselineId)
    ]);

  const candidateByTest = new Map((candidateResults as ResultRow[] | null)?.map((row) => [row.test_id, row]) ?? []);
  const baselineByTest = new Map((baselineResults as ResultRow[] | null)?.map((row) => [row.test_id, row]) ?? []);
  const allTestIds = [...new Set([...candidateByTest.keys(), ...baselineByTest.keys()])];
  const { data: tests } =
    allTestIds.length > 0
      ? await supabase.from("tests").select("id, key").in("id", allTestIds)
      : { data: [] as Array<{ id: string; key: string }> };
  const keyByTest = new Map((tests ?? []).map((test) => [test.id, test.key]));

  const regressions: Array<Record<string, unknown>> = [];
  const improvements: Array<Record<string, unknown>> = [];

  for (const testId of allTestIds) {
    const candidate = candidateByTest.get(testId);
    const baseline = baselineByTest.get(testId);
    if (!candidate || !baseline) continue;

    const row = {
      test_id: testId,
      test_key: keyByTest.get(testId) ?? "unknown",
      baseline_status: baseline.status,
      candidate_status: candidate.status,
      baseline_score: baseline.scores?.correctness ?? null,
      candidate_score: candidate.scores?.correctness ?? null,
      summary: (candidate.failure_reasons ?? baseline.failure_reasons ?? ["No summary"])[0],
      baseline_output: baseline.raw_output?.output_text ?? "",
      candidate_output: candidate.raw_output?.output_text ?? "",
      baseline_explanation: baseline.raw_output?.judge_explanation ?? "",
      candidate_explanation: candidate.raw_output?.judge_explanation ?? ""
    };

    if (baseline.status === "pass" && candidate.status !== "pass") {
      regressions.push(row);
    }
    if (baseline.status !== "pass" && candidate.status === "pass") {
      improvements.push(row);
    }
  }

  const summary = {
    baseline_pass_rate: baselineMetric?.pass_rate ?? 0,
    candidate_pass_rate: candidateMetric?.pass_rate ?? 0,
    pass_rate_delta: (candidateMetric?.pass_rate ?? 0) - (baselineMetric?.pass_rate ?? 0),
    baseline_latency: baselineMetric?.avg_latency_ms ?? 0,
    candidate_latency: candidateMetric?.avg_latency_ms ?? 0,
    latency_delta: (candidateMetric?.avg_latency_ms ?? 0) - (baselineMetric?.avg_latency_ms ?? 0),
    baseline_cost: baselineMetric?.total_cost ?? 0,
    candidate_cost: candidateMetric?.total_cost ?? 0,
    cost_delta:
      (baselineMetric?.total_cost ?? 0) === 0
        ? 0
        : ((candidateMetric?.total_cost ?? 0) - (baselineMetric?.total_cost ?? 0)) / (baselineMetric?.total_cost ?? 1)
  };

  return NextResponse.json({
    run_id: runId,
    baseline_id: baselineId,
    summary,
    regressions,
    improvements
  });
}
