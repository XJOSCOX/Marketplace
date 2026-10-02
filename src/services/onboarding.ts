import "server-only";
import { authContext } from "@/auth/server";
import { requireUuid } from "@/domain/api";
import { AppError } from "@/domain/errors";
import {
  marketplaceInput,
  sellerApplicationInput,
  sellerReviewInput,
} from "@/domain/onboarding";
export async function createMarketplace(
  input: Record<string, unknown>,
  request: Request,
) {
  const args = marketplaceInput(input);
  const auth = await authContext(request);
  await auth.requireUser();
  const { data, error } = await auth.db.rpc("create_marketplace", args);
  if (error)
    throw new AppError(
      409,
      "MARKETPLACE_REJECTED",
      "Marketplace creation failed. Check the slug and fields.",
    );
  return { id: data };
}
export async function applySeller(
  tenant: string,
  input: Record<string, unknown>,
  request: Request,
) {
  requireUuid(tenant);
  const args = sellerApplicationInput(input);
  const auth = await authContext(request);
  await auth.requireUser();
  const { data, error } = await auth.db.rpc("apply_seller", {
    tenant,
    ...args,
  });
  if (error)
    throw new AppError(
      409,
      "APPLICATION_REJECTED",
      "The seller application could not be submitted.",
    );
  return { id: data };
}
export async function reviewSeller(
  tenant: string,
  input: Record<string, unknown>,
  request: Request,
) {
  requireUuid(tenant);
  const args = sellerReviewInput(input);
  const auth = await authContext(request);
  await auth.requireMarketplaceRole(tenant, [
    "marketplace_owner",
    "marketplace_staff",
  ]);
  const { data, error } = await auth.db.rpc("review_seller", {
    tenant,
    ...args,
  });
  if (error)
    throw new AppError(
      409,
      "REVIEW_REJECTED",
      "The seller decision could not be saved.",
    );
  return { id: data };
}
