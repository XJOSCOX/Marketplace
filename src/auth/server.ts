import "server-only";
import { serverClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { authorization } from "@/domain/authorization";
import { AppError } from "@/domain/errors";
export async function authContext(request?: Request) {
  // Absence of configuration is never a demo identity.
  if (!supabaseConfig())
    throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
  const db = await serverClient(request);
  const token = request?.headers.get("authorization")?.slice(7);
  const { data, error } = await db.auth.getUser(token);
  const user = error ? null : data.user;
  const auth = authorization({
    user: async () => (user ? { id: user.id, email: user.email } : null),
    isAdmin: async (id) => {
      const { data, error } = await db
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", id)
        .maybeSingle();
      if (error)
        throw new AppError(
          503,
          "AUTHORIZATION_UNAVAILABLE",
          "Permissions could not be verified.",
        );
      return !!data;
    },
    membership: async (tenant, id) => {
      const { data, error } = await db
        .from("marketplace_memberships")
        .select("roles,status")
        .eq("marketplace_id", tenant)
        .eq("user_id", id)
        .maybeSingle();
      if (error)
        throw new AppError(
          503,
          "AUTHORIZATION_UNAVAILABLE",
          "Permissions could not be verified.",
        );
      return data;
    },
    marketplace: async (tenant) => {
      const { data, error } = await db
        .from("marketplaces")
        .select("owner_user_id,status")
        .eq("id", tenant)
        .maybeSingle();
      if (error)
        throw new AppError(
          503,
          "AUTHORIZATION_UNAVAILABLE",
          "Permissions could not be verified.",
        );
      return data;
    },
    seller: async (tenant, id) => {
      const { data, error } = await db
        .from("sellers")
        .select("user_id,status")
        .eq("marketplace_id", tenant)
        .eq("id", id)
        .maybeSingle();
      if (error)
        throw new AppError(
          503,
          "AUTHORIZATION_UNAVAILABLE",
          "Permissions could not be verified.",
        );
      return data;
    },
  });
  return { db, ...auth };
}
