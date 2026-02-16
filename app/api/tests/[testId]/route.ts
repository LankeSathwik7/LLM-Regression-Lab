import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertTestOwner } from "@/lib/access";
import { jsonError } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const access = await assertTestOwner(testId, user.id);
  if (!access.ok || !access.test) return jsonError("Test not found.", 404);

  const { data: runs, error: runsError } = await access.supabase
    .from("runs")
    .select("id, created_at")
    .eq("suite_id", access.suite.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (runsError) return jsonError(runsError.message, 500);

  return NextResponse.json({
    test: access.test,
    runs: (runs ?? []).map((run) => ({
      id: run.id,
      label: `${run.id.slice(0, 8)} • ${new Date(run.created_at).toLocaleString("en-US")}`
    }))
  });
}
