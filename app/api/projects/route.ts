import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api";

export async function GET() {
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const supabase = createAdminClient();

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, description, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (projectsError) return jsonError(projectsError.message, 500);
  if (!projects || projects.length === 0) return NextResponse.json({ projects: [] });

  const projectIds = projects.map((project) => project.id);
  const { data: runs, error: runsError } = await supabase
    .from("runs")
    .select("id, project_id, created_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  if (runsError) return jsonError(runsError.message, 500);

  const runIds = (runs ?? []).map((run) => run.id);
  const { data: metrics, error: metricsError } =
    runIds.length > 0
      ? await supabase.from("run_metrics").select("run_id, pass_rate").in("run_id", runIds)
      : { data: [], error: null };

  if (metricsError) return jsonError(metricsError.message, 500);

  const metricByRunId = new Map((metrics ?? []).map((metric) => [metric.run_id, metric]));
  const runsByProject = new Map<string, Array<{ id: string; created_at: string }>>();
  for (const run of runs ?? []) {
    const existing = runsByProject.get(run.project_id) ?? [];
    existing.push(run);
    runsByProject.set(run.project_id, existing);
  }

  const payload = projects.map((project) => {
    const projectRuns = runsByProject.get(project.id) ?? [];
    const latest = projectRuns[0];
    const previous = projectRuns[1];
    const latestMetric = latest ? metricByRunId.get(latest.id) : null;
    const previousMetric = previous ? metricByRunId.get(previous.id) : null;
    const latestPassRate = latestMetric?.pass_rate ?? null;
    let trendDirection: "up" | "down" | "flat" = "flat";
    if (latestPassRate !== null && previousMetric?.pass_rate !== undefined) {
      if (latestPassRate > previousMetric.pass_rate) trendDirection = "up";
      if (latestPassRate < previousMetric.pass_rate) trendDirection = "down";
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      latest_run_at: latest?.created_at ?? null,
      latest_pass_rate: latestPassRate,
      trend_direction: trendDirection
    };
  });

  return NextResponse.json({ projects: payload });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const body = (await request.json().catch(() => null)) as { name?: string; description?: string } | null;
  if (!body?.name?.trim()) {
    return jsonError("Project name is required.");
  }

  const supabase = createAdminClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      created_by: user.id
    })
    .select("id, name, description")
    .single();

  if (projectError || !project) return jsonError(projectError?.message ?? "Unable to create project.", 500);

  const { error: suiteError } = await supabase.from("suites").insert({
    project_id: project.id,
    name: "Core Regression Suite",
    description: "Default suite for your first prompts and regression checks.",
    tags: ["core", "regression"],
    config_json: {
      owner: "ui",
      version: 1
    }
  });

  if (suiteError) return jsonError(suiteError.message, 500);

  return NextResponse.json({ project }, { status: 201 });
}
