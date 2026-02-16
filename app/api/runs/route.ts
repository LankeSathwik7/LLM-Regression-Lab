import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api";

export async function GET() {
  const { error, user } = await requireUser();
  if (error || !user) return error;
  const supabase = createAdminClient();

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id")
    .eq("created_by", user.id);
  if (projectsError) return jsonError(projectsError.message, 500);
  const projectIds = (projects ?? []).map((project) => project.id);
  if (projectIds.length === 0) return NextResponse.json({ runs: [] });

  const { data: runs, error: runsError } = await supabase
    .from("runs")
    .select("id, project_id, suite_id, status, created_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false })
    .limit(100);
  if (runsError) return jsonError(runsError.message, 500);

  const runIds = (runs ?? []).map((run) => run.id);
  const suiteIds = [...new Set((runs ?? []).map((run) => run.suite_id))];
  const [{ data: suites }, { data: metrics }] = await Promise.all([
    suiteIds.length > 0 ? supabase.from("suites").select("id, name").in("id", suiteIds) : { data: [] },
    runIds.length > 0 ? supabase.from("run_metrics").select("run_id, pass_rate").in("run_id", runIds) : { data: [] }
  ]);
  const suiteById = new Map((suites ?? []).map((suite) => [suite.id, suite.name]));
  const metricByRun = new Map((metrics ?? []).map((metric) => [metric.run_id, metric]));

  return NextResponse.json({
    runs: (runs ?? []).map((run) => ({
      id: run.id,
      project_id: run.project_id,
      suite_id: run.suite_id,
      suite_name: suiteById.get(run.suite_id) ?? "Unknown",
      status: run.status,
      created_at: run.created_at,
      pass_rate: metricByRun.get(run.id)?.pass_rate ?? null
    }))
  });
}
