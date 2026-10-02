import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { safeNext } from "@/domain/api";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  if (token_hash && url.searchParams.get("type") === "email") {
    try {
      const db = await serverClient();
      const { error } = await db.auth.verifyOtp({ token_hash, type: "email" });
      if (!error)
        return NextResponse.redirect(
          new URL(safeNext(url.searchParams.get("next")), url.origin),
        );
    } catch {
      /* Safe public error path. */
    }
  }
  return NextResponse.redirect(
    new URL("/auth/sign-in?confirmation=failed", url.origin),
  );
}
