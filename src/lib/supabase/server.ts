import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";
import { AppError } from "@/domain/errors";
export async function serverClient(request?: Request) {
  const config = supabaseConfig();
  if (!config)
    throw new AppError(
      503,
      "BACKEND_NOT_CONFIGURED",
      "The database has not been configured.",
    );
  const authorization = request?.headers.get("authorization");
  if (authorization) {
    if (!/^Bearer [^\s]+$/.test(authorization))
      throw new AppError(
        401,
        "INVALID_TOKEN",
        "A valid bearer token is required.",
      );
    return createClient(config.url, config.key, {
      global: { headers: { Authorization: authorization } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Proxy persists refresh cookies when rendering a Server Component. */
        }
      },
    },
  });
}
export function publicClient() {
  const config = supabaseConfig();
  if (!config)
    throw new AppError(
      503,
      "BACKEND_NOT_CONFIGURED",
      "The database has not been configured.",
    );
  return createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
