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
  fields(input, [
    "slug",
    "name",
    "mode",
    "currency",
    "tagline",
    "description",
    "accent",
    "location",
  ]);
  if (typeof input.slug !== "string") invalid();
  const slug = input.slug.trim().toLowerCase();
  if (
    slug.length > 80 ||
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
    !["STORE", "MARKETPLACE", "HYBRID"].includes(String(input.mode)) ||
    typeof input.currency !== "string" ||
    input.currency !== "USD"
  )
    invalid();
  for (const [key, max] of [
    ["tagline", 300],
    ["description", 5000],
    ["location", 200],
  ] as const) {
    if (
      input[key] !== undefined &&
      (typeof input[key] !== "string" || input[key].length > max)
    )
      invalid();
  }
  if (
    input.accent !== undefined &&
    (typeof input.accent !== "string" || !/^#[0-9a-f]{6}$/i.test(input.accent))
  )
    invalid();
  return {
    branding: {
      tagline: input.tagline || "",
      description: input.description || "",
      location: input.location || "",
      accent: input.accent || "#27624c",
    },
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
