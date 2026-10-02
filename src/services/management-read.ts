import "server-only";
import { authContext } from "@/auth/server";
import { requireUuid } from "@/domain/api";
import { AppError } from "@/domain/errors";
import {
  marketplaceColumns,
  dashboardCounts,
  managedCategories,
  managedSellers,
  managedProducts,
  applicationState,
} from "@/data-access/management";
import { editableProduct, workspaceSeller } from "@/data-access/workspace";
export async function managementSnapshot(tenant: string, request: Request) {
  requireUuid(tenant);
  const auth = await authContext(request);
  await auth.requireMarketplaceRole(tenant, [
    "marketplace_owner",
    "marketplace_staff",
  ]);
  const { data, error } = await auth.db
    .from("marketplaces")
    .select(marketplaceColumns)
    .eq("id", tenant)
    .single();
  if (error) throw new AppError(404, "NOT_FOUND", "Marketplace not found.");
  const [counts, categories, sellers, products] = await Promise.all([
    dashboardCounts(auth.db, tenant),
    managedCategories(auth.db, tenant),
    managedSellers(auth.db, tenant),
    managedProducts(auth.db, tenant),
  ]);
  return { marketplace: data, counts, categories, sellers, products };
}
export async function ownApplication(tenant: string, request: Request) {
  requireUuid(tenant);
  const auth = await authContext(request);
  const user = await auth.requireUser();
  return applicationState(auth.db, tenant, user.id);
}
export async function listingSnapshot(tenant: string, request: Request) {
  requireUuid(tenant);
  const auth = await authContext(request);
  const user = await auth.requireUser();
  const productId = new URL(request.url).searchParams.get("productId");
  if (productId) {
    requireUuid(productId);
    const { data } = await auth.db
      .from("products")
      .select("seller_id")
      .eq("marketplace_id", tenant)
      .eq("id", productId)
      .single();
    if (!data) throw new AppError(404, "NOT_FOUND", "Product not found.");
    await auth.requireSellerAccess(tenant, data.seller_id);
    return {
      product: await editableProduct(
        auth.db,
        tenant,
        data.seller_id,
        productId,
      ),
      categories: await managedCategories(auth.db, tenant),
    };
  }
  const seller = await workspaceSeller(auth.db, tenant, user.id);
  if (!seller)
    throw new AppError(
      403,
      "SELLER_REQUIRED",
      "An approved seller account is required.",
    );
  await auth.requireSellerAccess(tenant, seller.id);
  return {
    sellerId: seller.id,
    products: await managedProducts(auth.db, tenant, seller.id),
    categories: await managedCategories(auth.db, tenant),
  };
}
