import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { safeNext } from "@/domain/api";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const db = await serverClient();
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (!error)
        return NextResponse.redirect(
          new URL(safeNext(url.searchParams.get("next")), url.origin),
        );
    } catch {
      /* Do not expose provider errors. */
    }
  }
  return NextResponse.redirect(
    new URL("/auth/sign-in?confirmation=failed", url.origin),
  );
}
