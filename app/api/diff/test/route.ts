import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertRunOwner } from "@/lib/access";
import { jsonError } from "@/lib/api";

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  const baselineId = request.nextUrl.searchParams.get("baselineId");
  const testId = request.nextUrl.searchParams.get("testId");

  if (!runId || !baselineId || !testId) {
    return jsonError("runId, baselineId, and testId are required.");
  }

  const { error, user } = await requireUser();
  if (error || !user) return error;

  const [runAccess, baselineAccess] = await Promise.all([assertRunOwner(runId, user.id), assertRunOwner(baselineId, user.id)]);
  if (!runAccess.ok || !baselineAccess.ok) return jsonError("Run not found.", 404);

  const supabase = runAccess.supabase;
  const [candidateResult, baselineResult] = await Promise.all([
    supabase
      .from("results")
      .select("status, scores, failure_reasons, raw_output")
      .eq("run_id", runId)
      .eq("test_id", testId)
      .maybeSingle(),
    supabase
      .from("results")
      .select("status, scores, failure_reasons, raw_output")
      .eq("run_id", baselineId)
      .eq("test_id", testId)
      .maybeSingle()
  ]);

  return NextResponse.json({
    baseline: baselineResult.data,
    candidate: candidateResult.data
  });
}
