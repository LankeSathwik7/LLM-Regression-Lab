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
  if (projectIds.length === 0) return NextResponse.json({ tests: [] });

  const { data: suites, error: suitesError } = await supabase
    .from("suites")
    .select("id, name, project_id")
    .in("project_id", projectIds);
  if (suitesError) return jsonError(suitesError.message, 500);
  const suiteIds = (suites ?? []).map((suite) => suite.id);
  if (suiteIds.length === 0) return NextResponse.json({ tests: [] });

  const { data: tests, error: testsError } = await supabase
    .from("tests")
    .select("id, suite_id, key, description, tags")
    .in("suite_id", suiteIds)
    .order("created_at", { ascending: false })
    .limit(200);
  if (testsError) return jsonError(testsError.message, 500);

  const suiteById = new Map((suites ?? []).map((suite) => [suite.id, suite.name]));
  return NextResponse.json({
    tests: (tests ?? []).map((test) => ({
      id: test.id,
      key: test.key,
      description: test.description,
      tags: test.tags,
      suite_id: test.suite_id,
      suite_name: suiteById.get(test.suite_id) ?? "Unknown suite"
    }))
  });
}
