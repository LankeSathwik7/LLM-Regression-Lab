import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertSuiteOwner } from "@/lib/access";
import { jsonError } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ suiteId: string }> }) {
  const { suiteId } = await params;
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const access = await assertSuiteOwner(suiteId, user.id);
  if (!access.ok) return jsonError("Suite not found.", 404);

  const supabase = access.supabase;
  const { data: tests, error: testsError } = await supabase
    .from("tests")
    .select("id, key, description, tags")
    .eq("suite_id", suiteId)
    .order("created_at", { ascending: true });

  if (testsError) return jsonError(testsError.message, 500);

  const testIds = (tests ?? []).map((test) => test.id);
  const { data: results, error: resultsError } =
    testIds.length > 0
      ? await supabase
          .from("results")
          .select("test_id, status, created_at")
          .in("test_id", testIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
  if (resultsError) return jsonError(resultsError.message, 500);

  const latestStatusByTest = new Map<string, "pass" | "fail" | "error">();
  for (const result of results ?? []) {
    if (!latestStatusByTest.has(result.test_id)) {
      latestStatusByTest.set(result.test_id, result.status);
    }
  }

  const payload = (tests ?? []).map((test) => ({
    ...test,
    last_status: latestStatusByTest.get(test.id) ?? null
  }));

  return NextResponse.json({ tests: payload });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ suiteId: string }> }) {
  const { suiteId } = await params;
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const access = await assertSuiteOwner(suiteId, user.id);
  if (!access.ok) return jsonError("Suite not found.", 404);

  const body = (await request.json().catch(() => null)) as
    | {
        key?: string;
        description?: string | null;
        input?: Record<string, unknown>;
        expectations?: Record<string, unknown>;
        tags?: string[];
      }
    | null;

  if (!body?.key?.trim()) return jsonError("Test key is required.");
  if (!body.input || typeof body.input !== "object") return jsonError("Test input JSON is required.");
  if (!body.expectations || typeof body.expectations !== "object") return jsonError("Expectations JSON is required.");

  const { data: test, error: insertError } = await access.supabase
    .from("tests")
    .insert({
      suite_id: suiteId,
      key: body.key.trim(),
      description: body.description?.trim() || null,
      input: body.input,
      expectations: body.expectations,
      tags: body.tags ?? []
    })
    .select("id, key")
    .single();

  if (insertError || !test) return jsonError(insertError?.message ?? "Unable to create test.", 500);
  return NextResponse.json({ test }, { status: 201 });
}
