import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const requestHeaders = await headers();
  const internalKey = requestHeaders.get("x-internal-api-key");
  const internalUserId = requestHeaders.get("x-user-id");
  if (env.INTERNAL_API_KEY && internalKey === env.INTERNAL_API_KEY && internalUserId) {
    return {
      error: null,
      supabase: null,
      user: {
        id: internalUserId
      }
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      supabase: null,
      user: null
    };
  }

  return {
    error: null,
    supabase,
    user
  };
}
