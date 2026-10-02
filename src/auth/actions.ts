"use server";
import { headers } from "next/headers";
import { verifyMutationOrigin } from "@/api/mutations";
import { AppError } from "@/domain/errors";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { safeNext } from "@/domain/api";
async function verifyActionOrigin() {
  const incoming = await headers();
  // Server Actions always use cookies; an Authorization header cannot bypass CSRF.
  verifyMutationOrigin(
    new Request("http://localhost", {
      headers: { origin: incoming.get("origin") || "" },
    }),
  );
}
export interface AuthResult {
  message: string;
}
export async function authenticate(
  _previous: AuthResult,
  form: FormData,
): Promise<AuthResult> {
  if (!supabaseConfig())
    return {
      message:
        "Authentication is unavailable until Supabase is configured. Demo data does not grant access.",
    };
  try {
    await verifyActionOrigin();
  } catch {
    return { message: "This request origin is not permitted." };
  }
  if (!["signup", "signin"].includes(String(form.get("mode"))))
    return { message: "Invalid authentication action." };
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const signup = form.get("mode") === "signup";
  const next = safeNext(String(form.get("next") || ""));
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8 ||
    password.length > 128
  )
    return {
      message:
        "Enter a valid email and a password between 8 and 128 characters.",
    };
  try {
    const db = await serverClient();
    if (signup) {
      const origin = process.env.APP_ORIGIN;
      if (!origin)
        return {
          message:
            "Account confirmation is not configured. Contact the administrator.",
        };
      const { error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: String(form.get("name") || "")
              .trim()
              .slice(0, 120),
          },
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      return {
        message: error
          ? "Unable to create an account. Please try again later."
          : "If this address is eligible, check your email to confirm your account, then sign in.",
      };
    }
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error)
      return {
        message:
          "Sign in failed. Check your credentials and email confirmation.",
      };
  } catch {
    return {
      message: "Authentication is temporarily unavailable. Please try again.",
    };
  }
  redirect(next);
}
export async function signOut() {
  await verifyActionOrigin();
  if (supabaseConfig()) {
    const db = await serverClient();
    const { error } = await db.auth.signOut();
    if (error)
      throw new AppError(
        503,
        "SIGNOUT_FAILED",
        "Sign out failed. Please try again.",
      );
  }
  redirect("/auth/sign-in");
}
