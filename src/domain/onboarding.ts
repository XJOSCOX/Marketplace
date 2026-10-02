import { AppError } from "./errors.ts";
import { requireUuid } from "./api.ts";
function fields(input: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(input).some((k) => !allowed.includes(k))) invalid();
}
function invalid(): never {
  throw new AppError(400, "INVALID_INPUT", "Check the supplied fields.");
}
function title(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 120)
    invalid();
  return value.trim();
}
export function marketplaceInput(input: Record<string, unknown>) {
  fields(input, ["slug", "name", "mode", "currency"]);
  if (typeof input.slug !== "string") invalid();
  const slug = input.slug.trim().toLowerCase();
  if (
    slug.length > 80 ||
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
    !["STORE", "MARKETPLACE", "HYBRID"].includes(String(input.mode)) ||
    typeof input.currency !== "string" ||
    !/^[A-Z]{3}$/.test(input.currency)
  )
    invalid();
  return {
    requested_slug: slug,
    title: title(input.name),
    marketplace_mode: input.mode as string,
    currency_code: input.currency,
  };
}
export function sellerApplicationInput(input: Record<string, unknown>) {
  fields(input, ["name", "description"]);
  if (typeof input.description !== "string" || input.description.length > 10000)
    invalid();
  return { title: title(input.name), description: input.description };
}
export function sellerReviewInput(input: Record<string, unknown>) {
  fields(input, ["sellerId", "decision"]);
  if (
    typeof input.sellerId !== "string" ||
    !["active", "suspended", "rejected"].includes(String(input.decision))
  )
    invalid();
  return {
    seller: requireUuid(input.sellerId),
    decision: input.decision as string,
  };
}
