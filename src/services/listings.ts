import "server-only";
import { authContext } from "@/auth/server";
import { requireUuid } from "@/domain/api";
import { validateListing } from "@/domain/listing";
import { AppError } from "@/domain/errors";
export async function saveListing(
  tenant: string,
  input: Record<string, unknown>,
  request?: Request,
) {
  requireUuid(tenant);
  const body = validateListing(input);
  const auth = await authContext(request);
  await auth.requireSellerAccess(tenant, body.sellerId);
  const { data, error } = await auth.db.rpc("save_listing", {
    tenant,
    seller: body.sellerId,
    product: body.productId,
    category: body.categoryId,
    title: body.name,
    description: body.description,
    amount: body.priceAmount,
    inventory: body.stock,
    visibility: body.status,
  });
  if (error)
    throw new AppError(
      409,
      "LISTING_REJECTED",
      "The listing could not be saved. Check the category and seller access.",
    );
  return { id: data };
}
