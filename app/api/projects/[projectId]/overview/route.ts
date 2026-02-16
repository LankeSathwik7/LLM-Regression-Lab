import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const supabase = createAdminClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, description, created_by")
    .eq("id", projectId)
    .single();
  if (projectError || !project) return jsonError("Project not found.", 404);
  if (project.created_by !== user.id) return jsonError("Forbidden", 403);

  const [{ data: suites, error: suitesError }, { data: runs, error: runsError }] = await Promise.all([
    supabase.from("suites").select("id, name, description, tags").eq("project_id", projectId).order("created_at", { ascending: true }),
    supabase
      .from("runs")
      .select("id, suite_id, status, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  if (suitesError) return jsonError(suitesError.message, 500);
  if (runsError) return jsonError(runsError.message, 500);

  const runIds = (runs ?? []).map((run) => run.id);
  const [{ data: runConfigs, error: configError }, { data: metrics, error: metricsError }] = await Promise.all([
    runIds.length > 0
      ? supabase.from("run_configs").select("run_id, model_name").in("run_id", runIds)
      : Promise.resolve({ data: [], error: null }),
    runIds.length > 0
      ? supabase.from("run_metrics").select("run_id, pass_rate, avg_latency_ms, total_cost").in("run_id", runIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (configError) return jsonError(configError.message, 500);
  if (metricsError) return jsonError(metricsError.message, 500);

  const suiteById = new Map((suites ?? []).map((suite) => [suite.id, suite]));
  const configByRun = new Map((runConfigs ?? []).map((config) => [config.run_id, config]));
  const metricByRun = new Map((metrics ?? []).map((metric) => [metric.run_id, metric]));

  const recentRuns = (runs ?? []).slice(0, 5).map((run) => ({
    id: run.id,
    suite_id: run.suite_id,
    suite_name: suiteById.get(run.suite_id)?.name ?? "Unknown suite",
    model_name: configByRun.get(run.id)?.model_name ?? "n/a",
    pass_rate: metricByRun.get(run.id)?.pass_rate ?? 0,
    avg_latency_ms: metricByRun.get(run.id)?.avg_latency_ms ?? 0,
    total_cost: metricByRun.get(run.id)?.total_cost ?? 0,
    created_at: run.created_at,
    status: run.status
  }));

  const lastRunBySuite = new Map<string, { id: string; status: "queued" | "running" | "completed" | "failed" }>();
  for (const run of runs ?? []) {
    if (!lastRunBySuite.has(run.suite_id)) {
      lastRunBySuite.set(run.suite_id, { id: run.id, status: run.status });
    }
  }

  const suitesPayload = (suites ?? []).map((suite) => ({
    id: suite.id,
    name: suite.name,
    description: suite.description,
    tags: suite.tags,
    last_run_status: lastRunBySuite.get(suite.id)?.status ?? null,
    last_run_id: lastRunBySuite.get(suite.id)?.id ?? null
  }));

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description
    },
    recent_runs: recentRuns,
    suites: suitesPayload
  });
}
