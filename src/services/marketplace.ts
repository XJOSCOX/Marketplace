import "server-only";
import { authContext } from "@/auth/server";
import { requireUuid } from "@/domain/api";
import { AppError } from "@/domain/errors";
export async function updateMarketplace(
  tenant: string,
  input: Record<string, unknown>,
  request: Request,
) {
  requireUuid(tenant);
  const auth = await authContext(request);
  await auth.requireMarketplaceRole(tenant, ["marketplace_owner"]);
  if (
    Object.keys(input).some(
      (k) =>
        ![
          "name",
          "tagline",
          "mode",
          "accent",
          "commissionBasisPoints",
        ].includes(k),
    ) ||
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.length > 120 ||
    typeof input.tagline !== "string" ||
    input.tagline.length > 300 ||
    !["STORE", "MARKETPLACE", "HYBRID"].includes(String(input.mode)) ||
    !/^#[0-9a-f]{6}$/i.test(String(input.accent)) ||
    !Number.isInteger(input.commissionBasisPoints) ||
    Number(input.commissionBasisPoints) < 0 ||
    Number(input.commissionBasisPoints) > 10000
  )
    throw new AppError(
      400,
      "INVALID_SETTINGS",
      "Check the marketplace settings.",
    );
  const { data, error } = await auth.db
    .from("marketplaces")
    .update({
      name: input.name.trim(),
      tagline: input.tagline,
      mode: input.mode,
      accent: input.accent,
      commission_basis_points: input.commissionBasisPoints,
    })
    .eq("id", tenant)
    .select("id")
    .maybeSingle();
  if (error || !data)
    throw new AppError(
      409,
      "SETTINGS_REJECTED",
      "Marketplace settings could not be saved.",
    );
  return data;
}
