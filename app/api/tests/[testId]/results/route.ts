import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertTestOwner, assertRunOwner } from "@/lib/access";
import { jsonError } from "@/lib/api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) return jsonError("runId query parameter is required.");

  const { error, user } = await requireUser();
  if (error || !user) return error;

  const [testAccess, runAccess] = await Promise.all([assertTestOwner(testId, user.id), assertRunOwner(runId, user.id)]);
  if (!testAccess.ok || !runAccess.ok) return jsonError("Result not found.", 404);
  if (runAccess.run?.suite_id !== testAccess.test?.suite_id) return jsonError("Run/test mismatch.", 400);

  const { data: result, error: resultError } = await testAccess.supabase
    .from("results")
    .select("status, scores, failure_reasons, raw_output")
    .eq("test_id", testId)
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (resultError) return jsonError(resultError.message, 500);

  return NextResponse.json({
    result: result
      ? {
          status: result.status,
          scores: result.scores,
          failure_reasons: result.failure_reasons,
          raw_output: result.raw_output,
          judge_explanation: result.raw_output?.judge_explanation ?? null,
          checks: Array.isArray(result.raw_output?.checks) ? result.raw_output?.checks : []
        }
      : null
  });
}
