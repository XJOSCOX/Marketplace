import "server-only";
import {
  findMarketplace,
  publicCategories,
  publicSeller,
  catalogProducts,
} from "@/data-access/catalog";
import { requireUuid, pagination } from "@/domain/api";
import { AppError } from "@/domain/errors";
export async function storefrontDetail(tenant: string) {
  requireUuid(tenant);
  const marketplace = await findMarketplace(tenant);
  return { marketplace, categories: await publicCategories(tenant) };
}
export async function productDetail(tenant: string, product: string) {
  requireUuid(tenant);
  requireUuid(product);
  await findMarketplace(tenant);
  const { products } = await catalogProducts(
    tenant,
    pagination(new URLSearchParams()),
    product,
  );
  if (!products[0])
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  return products[0];
}
export async function sellerStorefront(
  tenant: string,
  sellerId: string,
  search: URLSearchParams,
) {
  requireUuid(tenant);
  requireUuid(sellerId);
  await findMarketplace(tenant);
  const seller = await publicSeller(tenant, sellerId);
  if (!seller)
    throw new AppError(404, "SELLER_NOT_FOUND", "Storefront not found.");
  const options = pagination(search);
  const { products, total } = await catalogProducts(
    tenant,
    options,
    undefined,
    sellerId,
  );
  return {
    seller,
    products,
    meta: {
      page: options.page,
      pageSize: options.pageSize,
      total,
      hasNext: options.from + products.length < total,
    },
  };
}
