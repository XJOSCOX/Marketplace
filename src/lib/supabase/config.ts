export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return null;
  if (!url || !key)
    throw new Error(
      "Both Supabase public environment variables must be configured.",
    );
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" &&
    !(
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname)
    )
  )
    throw new Error("Supabase requires HTTPS except for local development.");
  if (key.startsWith("sb_secret_"))
    throw new Error("Use only a Supabase publishable key.");
  // Legacy anon JWTs are public, but a legacy service-role JWT must never be used here.
  if (key.startsWith("eyJ")) {
    try {
      if (
        JSON.parse(
          atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
        ).role !== "anon"
      )
        throw new Error("Invalid public key role");
    } catch {
      throw new Error("Use a publishable key or legacy anon key.");
    }
  }
  return { url, key };
}
export function demoEnabled() {
  return (
    !supabaseConfig() &&
    (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO === "true")
  );
}
