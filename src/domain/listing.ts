import { requireUuid, amountString } from "./api.ts";
import { AppError } from "./errors.ts";
export function validateListing(input: Record<string, unknown>) {
  const allowed = [
    "sellerId",
    "productId",
    "categoryId",
    "name",
    "description",
    "priceAmount",
    "stock",
    "status",
    "sku",
  ];
  if (Object.keys(input).some((k) => !allowed.includes(k)))
    throw new AppError(400, "INVALID_LISTING", "Unknown listing field.");
  const sellerId = requireUuid(String(input.sellerId || ""));
  const categoryId = requireUuid(String(input.categoryId || ""));
  const productId = input.productId
    ? requireUuid(String(input.productId))
    : null;
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.length > 120 ||
    typeof input.description !== "string" ||
    input.description.length > 10000 ||
    !Number.isInteger(input.stock) ||
    Number(input.stock) < 0 ||
    Number(input.stock) > 1000000 ||
    (input.sku !== undefined &&
      (typeof input.sku !== "string" ||
        !/^[A-Za-z0-9._-]{1,80}$/.test(input.sku))) ||
    !["active", "draft", "archived"].includes(String(input.status))
  )
    throw new AppError(
      400,
      "INVALID_LISTING",
      "Check the listing name, description, stock, and visibility.",
    );
  return {
    sku: typeof input.sku === "string" ? input.sku : null,
    sellerId,
    categoryId,
    productId,
    name: input.name.trim(),
    description: input.description,
    priceAmount: amountString(input.priceAmount),
    stock: Number(input.stock),
    status: String(input.status),
  };
}
