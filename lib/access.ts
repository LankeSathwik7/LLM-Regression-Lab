import { createAdminClient } from "@/lib/supabase/admin";

export async function assertProjectOwner(projectId: string, userId: string) {
  const supabase = createAdminClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, created_by")
    .eq("id", projectId)
    .single();
  if (error || !project || project.created_by !== userId) {
    return { ok: false as const, supabase, project: null };
  }
  return { ok: true as const, supabase, project };
}

export async function assertSuiteOwner(suiteId: string, userId: string) {
  const supabase = createAdminClient();
  const { data: suite, error } = await supabase
    .from("suites")
    .select("id, project_id, name")
    .eq("id", suiteId)
    .single();
  if (error || !suite) return { ok: false as const, supabase, suite: null };

  const { data: project } = await supabase.from("projects").select("id, created_by").eq("id", suite.project_id).single();
  if (!project || project.created_by !== userId) return { ok: false as const, supabase, suite: null };

  return { ok: true as const, supabase, suite };
}

export async function assertRunOwner(runId: string, userId: string) {
  const supabase = createAdminClient();
  const { data: run, error } = await supabase
    .from("runs")
    .select("id, project_id, suite_id, baseline_run_id, status, created_at, completed_at")
    .eq("id", runId)
    .single();
  if (error || !run) return { ok: false as const, supabase, run: null };

  const { data: project } = await supabase.from("projects").select("id, created_by").eq("id", run.project_id).single();
  if (!project || project.created_by !== userId) return { ok: false as const, supabase, run: null };

  return { ok: true as const, supabase, run };
}

export async function assertTestOwner(testId: string, userId: string) {
  const supabase = createAdminClient();
  const { data: test, error } = await supabase
    .from("tests")
    .select("id, suite_id, key, description, tags, input, expectations")
    .eq("id", testId)
    .single();
  if (error || !test) return { ok: false as const, supabase, test: null };

  const { data: suite } = await supabase.from("suites").select("id, project_id").eq("id", test.suite_id).single();
  if (!suite) return { ok: false as const, supabase, test: null };
  const { data: project } = await supabase.from("projects").select("id, created_by").eq("id", suite.project_id).single();
  if (!project || project.created_by !== userId) return { ok: false as const, supabase, test: null };

  return { ok: true as const, supabase, test, suite };
}
