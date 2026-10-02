"use client";
import Link from "next/link";
import { useActionState } from "react";
import { authenticate } from "@/auth/actions";
export function AuthForm({
  signup,
  next,
  configured,
}: {
  signup: boolean;
  next: string;
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(authenticate, {
    message: "",
  });
  return (
    <form
      action={action}
      className="form-card"
      style={{ margin: "50px auto", width: "min(92%,480px)" }}
    >
      <Link className="brand" href="/">
        GoXAvni Commerce.
      </Link>
      <h1 style={{ fontSize: 30 }}>
        {signup ? "One account. More possibilities." : "Welcome back."}
      </h1>
      <p className="muted">
        Buy, sell, and manage your marketplaces with one account.
      </p>
      {!configured && (
        <p className="info-banner">
          Supabase is not configured. Public demo browsing is available;
          protected workspaces require a real account.
        </p>
      )}
      <input type="hidden" name="mode" value={signup ? "signup" : "signin"} />
      <input type="hidden" name="next" value={next} />
      {signup && (
        <label>
          Your name
          <input name="name" autoComplete="name" required maxLength={120} />
        </label>
      )}
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          required
          minLength={8}
          maxLength={128}
        />
      </label>
      <button className="button" disabled={pending || !configured}>
        {pending ? "Please wait…" : signup ? "Create account" : "Sign in"}
      </button>
      {state.message && (
        <p role="status" className="info-banner">
          {state.message}
        </p>
      )}
      <Link
        className="text-link"
        href={`/auth/${signup ? "sign-in" : "sign-up"}?next=${encodeURIComponent(next)}`}
      >
        {signup
          ? "Already have an account? Sign in"
          : "New here? Create an account"}
      </Link>
    </form>
  );
}
