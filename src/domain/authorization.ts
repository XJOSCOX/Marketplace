import { AppError } from "./errors.ts";
export interface Identity {
  id: string;
  email?: string;
}
export interface AuthorizationStore {
  user(): Promise<Identity | null>;
  isAdmin(userId: string): Promise<boolean>;
  membership(
    tenant: string,
    userId: string,
  ): Promise<{ roles: string[]; status: string } | null>;
  marketplace(
    tenant: string,
  ): Promise<{ owner_user_id: string; status: string } | null>;
  seller(
    tenant: string,
    sellerId: string,
  ): Promise<{ user_id: string; status: string } | null>;
}
export function authorization(store: AuthorizationStore) {
  async function requireUser() {
    const user = await store.user();
    if (!user)
      throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
    return user;
  }
  async function requirePlatformAdmin() {
    const user = await requireUser();
    if (!(await store.isAdmin(user.id)))
      throw new AppError(
        403,
        "FORBIDDEN",
        "Platform administrator access is required.",
      );
    return user;
  }
  async function requireMarketplaceMembership(tenant: string) {
    const user = await requireUser();
    if (await store.isAdmin(user.id))
      return { user, roles: ["platform_admin"] };
    const [membership, marketplace] = await Promise.all([
      store.membership(tenant, user.id),
      store.marketplace(tenant),
    ]);
    if (
      !membership ||
      membership.status !== "active" ||
      !marketplace ||
      !["draft", "active"].includes(marketplace.status)
    )
      throw new AppError(
        403,
        "FORBIDDEN",
        "Active marketplace membership is required.",
      );
    const roles = membership.roles.filter(
      (role) =>
        role !== "marketplace_owner" || marketplace.owner_user_id === user.id,
    );
    return { user, roles };
  }
  async function requireMarketplaceRole(tenant: string, allowed: string[]) {
    const result = await requireMarketplaceMembership(tenant);
    if (
      !result.roles.includes("platform_admin") &&
      !result.roles.some((role) => allowed.includes(role))
    )
      throw new AppError(
        403,
        "FORBIDDEN",
        "Your membership does not grant this permission.",
      );
    return result;
  }
  async function requireSellerAccess(tenant: string, sellerId: string) {
    const result = await requireMarketplaceRole(tenant, [
      "seller",
      "marketplace_owner",
      "marketplace_staff",
    ]);
    const seller = await store.seller(tenant, sellerId);
    if (!seller)
      throw new AppError(404, "SELLER_NOT_FOUND", "Seller not found.");
    const manager = result.roles.some((r) =>
      ["platform_admin", "marketplace_owner", "marketplace_staff"].includes(r),
    );
    if (
      !manager &&
      (seller.user_id !== result.user.id || seller.status !== "active")
    )
      throw new AppError(403, "FORBIDDEN", "Seller access is required.");
    return result;
  }
  return {
    requireUser,
    requirePlatformAdmin,
    requireMarketplaceMembership,
    requireMarketplaceRole,
    requireSellerAccess,
  };
}
