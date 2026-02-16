import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertRunOwner } from "@/lib/access";
import { jsonError } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const access = await assertRunOwner(runId, user.id);
  if (!access.ok) return jsonError("Run not found.", 404);

  const supabase = access.supabase;
  const { data: results, error: resultsError } = await supabase
    .from("results")
    .select("id, test_id, status, scores, latency_ms, failure_reasons")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (resultsError) return jsonError(resultsError.message, 500);

  const testIds = (results ?? []).map((result) => result.test_id);
  const { data: tests, error: testsError } =
    testIds.length > 0
      ? await supabase.from("tests").select("id, key, tags").in("id", testIds)
      : { data: [], error: null };
  if (testsError) return jsonError(testsError.message, 500);

  const testById = new Map((tests ?? []).map((test) => [test.id, test]));
  return NextResponse.json({
    results: (results ?? []).map((result) => {
      const test = testById.get(result.test_id);
      return {
        id: result.id,
        test_id: result.test_id,
        test_key: test?.key ?? "unknown",
        tags: test?.tags ?? [],
        status: result.status,
        score: typeof result.scores?.correctness === "number" ? result.scores.correctness : null,
        latency_ms: result.latency_ms,
        failure_reasons: result.failure_reasons
      };
    })
  });
}
