import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertSuiteOwner } from "@/lib/access";
import { jsonError } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ suiteId: string }> }) {
  const { suiteId } = await params;
  const { error, user } = await requireUser();
  if (error || !user) return error;

  const access = await assertSuiteOwner(suiteId, user.id);
  if (!access.ok || !access.suite) return jsonError("Suite not found.", 404);

  const { data: suite, error: suiteError } = await access.supabase
    .from("suites")
    .select("id, project_id, name, description, tags, config_json")
    .eq("id", suiteId)
    .single();

  if (suiteError || !suite) return jsonError("Suite not found.", 404);
  return NextResponse.json({ suite });
}
