import { AppError } from "./errors.ts";
import { requireUuid, amountString } from "./api.ts";
export function slugValue(value: unknown) {
  if (typeof value !== "string")
    throw new AppError(
      400,
      "INVALID_SLUG",
      "Use letters, numbers and single hyphens.",
    );
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80)
    throw new AppError(
      400,
      "INVALID_SLUG",
      "Use letters, numbers and single hyphens.",
    );
  return slug;
}
export function categoryInput(input: Record<string, unknown>) {
  if (
    Object.keys(input).some(
      (k) => !["id", "name", "slug", "icon", "status", "sortOrder"].includes(k),
    ) ||
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.length > 120 ||
    typeof input.icon !== "string" ||
    input.icon.length > 32 ||
    !["active", "draft", "archived"].includes(String(input.status)) ||
    !Number.isInteger(input.sortOrder) ||
    Number(input.sortOrder) < 0 ||
    Number(input.sortOrder) > 10000
  )
    throw new AppError(400, "INVALID_CATEGORY", "Check the category fields.");
  return {
    id: input.id ? requireUuid(String(input.id)) : undefined,
    name: input.name.trim(),
    slug: slugValue(input.slug),
    icon: input.icon,
    status: String(input.status),
    sort_order: Number(input.sortOrder),
  };
}
export function brandingInput(input: Record<string, unknown>) {
  const keys = [
    "name",
    "tagline",
    "description",
    "location",
    "accent",
    "heroHeading",
    "heroDescription",
  ];
  if (Object.keys(input).some((k) => !keys.includes(k)))
    throw new AppError(400, "INVALID_BRANDING", "Unexpected branding field.");
  const limits = {
    name: 120,
    tagline: 300,
    description: 5000,
    location: 200,
    heroHeading: 160,
    heroDescription: 500,
  };
  for (const [key, max] of Object.entries(limits))
    if (typeof input[key] !== "string" || (input[key] as string).length > max)
      throw new AppError(400, "INVALID_BRANDING", "Check text lengths.");
  if (
    !(input.name as string).trim() ||
    typeof input.accent !== "string" ||
    !/^#[0-9a-f]{6}$/i.test(input.accent)
  )
    throw new AppError(
      400,
      "INVALID_BRANDING",
      "A name and valid accent are required.",
    );
  return {
    name: (input.name as string).trim(),
    tagline: input.tagline as string,
    description: input.description as string,
    location: input.location as string,
    accent: input.accent,
    hero_heading: input.heroHeading as string,
    hero_description: input.heroDescription as string,
  };
}
export function dollarsToMinor(value: string) {
  if (!/^\d{1,14}(\.\d{1,2})?$/.test(value))
    throw new AppError(
      400,
      "INVALID_PRICE",
      "Enter a price with up to two decimal places.",
    );
  const [whole, fraction = ""] = value.split(".");
  return amountString(
    (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))).toString(),
  );
}
export function minorToDollars(value: string) {
  const n = BigInt(value);
  return `${n / 100n}.${(n % 100n).toString().padStart(2, "0")}`;
}
export function onboardingProgress(
  m: {
    description?: string;
    hero_heading?: string;
    mode: string;
    status?: string;
    branding_completed_at?: string | null;
    store_completed_at?: string | null;
    previewed_at?: string | null;
  },
  counts: { categories: number; products: number },
) {
  const steps = [
    { label: "Marketplace created", done: true, path: "" },
    {
      label: "Complete branding",
      done:
        !!m.branding_completed_at &&
        !!m.description?.trim() &&
        !!m.hero_heading?.trim(),
      path: "/branding",
    },
    { label: "Add category", done: counts.categories > 0, path: "/categories" },
    {
      label:
        m.mode === "MARKETPLACE"
          ? "Invite your first seller / add product"
          : "Add first product",
      done: counts.products > 0,
      path: m.mode === "MARKETPLACE" ? "/sellers" : "/listing",
    },
    {
      label: "Configure store",
      done: !!m.store_completed_at && !!m.description?.trim(),
      path: "/store-settings",
    },
    { label: "Preview storefront", done: !!m.previewed_at, path: "/preview" },
    {
      label: "Publish marketplace",
      done: m.status === "active",
      path: "/publish",
    },
  ];
  return {
    steps,
    percent: Math.round(
      (100 * steps.filter((s) => s.done).length) / steps.length,
    ),
  };
}
