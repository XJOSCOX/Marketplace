import "server-only";
import { requireUuid, pagination } from "@/domain/api";
import { catalogProducts, findMarketplace } from "@/data-access/catalog";
export async function listCatalog(tenant: string, search: URLSearchParams) {
  requireUuid(tenant);
  const options = pagination(search);
  const marketplace = await findMarketplace(tenant);
  const { products, total } = await catalogProducts(marketplace.id, options);
  return {
    data: products,
    meta: {
      marketplaceId: marketplace.id,
      currency: marketplace.currency,
      page: options.page,
      pageSize: options.pageSize,
      total,
      hasNext: options.from + products.length < total,
      source: "database",
    },
  };
}
