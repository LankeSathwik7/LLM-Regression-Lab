import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertSuiteOwner } from "@/lib/access";
import { jsonError, toFiniteNumber } from "@/lib/api";
import { triggerSuiteRun } from "@/lib/evals/runner";

export async function GET(_: Request, { params }: { params: Promise<{ suiteId: string }> }) {
  const { suiteId } = await params;
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const access = await assertSuiteOwner(suiteId, user.id);
  if (!access.ok) return jsonError("Suite not found.", 404);

  const { data: runs, error: runsError } = await access.supabase
    .from("runs")
    .select("id, status, created_at")
    .eq("suite_id", suiteId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (runsError) return jsonError(runsError.message, 500);

  const runIds = (runs ?? []).map((run) => run.id);
  const [{ data: configs, error: configsError }, { data: metrics, error: metricsError }] = await Promise.all([
    runIds.length > 0
      ? access.supabase.from("run_configs").select("run_id, model_name").in("run_id", runIds)
      : Promise.resolve({ data: [], error: null }),
    runIds.length > 0
      ? access.supabase.from("run_metrics").select("run_id, pass_rate").in("run_id", runIds)
      : Promise.resolve({ data: [], error: null })
  ]);
  if (configsError) return jsonError(configsError.message, 500);
  if (metricsError) return jsonError(metricsError.message, 500);

  const configByRun = new Map((configs ?? []).map((config) => [config.run_id, config]));
  const metricByRun = new Map((metrics ?? []).map((metric) => [metric.run_id, metric]));

  return NextResponse.json({
    runs: (runs ?? []).map((run) => ({
      id: run.id,
      status: run.status,
      model_name: configByRun.get(run.id)?.model_name ?? "n/a",
      created_at: run.created_at,
      pass_rate: metricByRun.get(run.id)?.pass_rate ?? null
    }))
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ suiteId: string }> }) {
  const { suiteId } = await params;
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const access = await assertSuiteOwner(suiteId, user.id);
  if (!access.ok) return jsonError("Suite not found.", 404);

  const body = (await request.json().catch(() => null)) as
    | {
        model_name?: string;
        temperature?: number;
        baseline_run_id?: string | null;
        git_branch?: string | null;
        git_commit?: string | null;
      }
    | null;

  const modelName = body?.model_name?.trim() || "gpt-4.1-mini";
  const temperature = toFiniteNumber(body?.temperature, 0.2);

  try {
    const run = await triggerSuiteRun({
      suiteId,
      userId: user.id,
      modelName,
      temperature,
      baselineRunId: body?.baseline_run_id ?? null,
      gitBranch: body?.git_branch ?? null,
      gitCommit: body?.git_commit ?? null
    });
    return NextResponse.json({ run }, { status: 201 });
  } catch (runnerError) {
    return jsonError(runnerError instanceof Error ? runnerError.message : "Unable to run suite.", 500);
  }
}
