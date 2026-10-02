import "server-only";
import { authContext } from "@/auth/server";
import { requireUuid } from "@/domain/api";
import { categoryInput, brandingInput } from "@/domain/management";
import { AppError } from "@/domain/errors";
export async function saveCategory(
  tenant: string,
  input: Record<string, unknown>,
  request: Request,
) {
  requireUuid(tenant);
  const body = categoryInput(input);
  const auth = await authContext(request);
  await auth.requireMarketplaceRole(tenant, [
    "marketplace_owner",
    "marketplace_staff",
  ]);
  const values = {
    name: body.name,
    slug: body.slug,
    icon: body.icon,
    status: body.status,
    sort_order: body.sort_order,
  };
  const query = body.id
    ? auth.db
        .from("categories")
        .update(values)
        .eq("marketplace_id", tenant)
        .eq("id", body.id)
    : auth.db.from("categories").insert({ marketplace_id: tenant, ...values });
  const { data, error } = await query.select("id").single();
  if (error)
    throw new AppError(
      409,
      "CATEGORY_REJECTED",
      "Could not save. The slug may already be in use.",
    );
  return data;
}
export async function saveBranding(
  tenant: string,
  input: Record<string, unknown>,
  request: Request,
) {
  requireUuid(tenant);
  const body = brandingInput(input);
  const auth = await authContext(request);
  await auth.requireMarketplaceRole(tenant, ["marketplace_owner"]);
  const { error } = await auth.db
    .from("marketplaces")
    .update(body)
    .eq("id", tenant)
    .select("id")
    .single();
  if (error)
    throw new AppError(
      409,
      "BRANDING_REJECTED",
      "Branding could not be saved.",
    );
  return { saved: true };
}
export async function setupAction(
  tenant: string,
  input: Record<string, unknown>,
  request: Request,
) {
  requireUuid(tenant);
  if (
    Object.keys(input).length !== 1 ||
    !["branding", "store", "preview", "publish", "unpublish"].includes(
      String(input.action),
    )
  )
    throw new AppError(400, "INVALID_ACTION", "Choose a valid setup action.");
  const auth = await authContext(request);
  await auth.requireMarketplaceRole(tenant, ["marketplace_owner"]);
  const action = String(input.action);
  const { error } = ["publish", "unpublish"].includes(action)
    ? await auth.db.rpc("publish_marketplace", {
        tenant,
        publish: action === "publish",
      })
    : await auth.db.rpc("complete_setup", { tenant, step: action });
  if (error)
    throw new AppError(
      409,
      "SETUP_INCOMPLETE",
      "Complete branding, store information, preview, an active category, and an active owner product before publishing. Marketplaces can invite sellers after publishing.",
    );
  return { saved: true };
}
