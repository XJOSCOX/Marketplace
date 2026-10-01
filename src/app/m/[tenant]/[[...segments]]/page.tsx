import { notFound } from "next/navigation";
import { marketplaces, categories, products, sellers } from "@/data/mock";
import { CommerceApp } from "@/components/commerce-app";
const simple = [
  "products",
  "cart",
  "checkout",
  "favorites",
  "orders",
  "messages",
  "profile",
];
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; segments?: string[] }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { tenant, segments = [] } = await params;
  const search = await searchParams;
  const m = marketplaces.find((m) => m.slug === tenant);
  if (!m) notFound();
  const [page, id] = segments;
  if (
    page &&
    !simple.includes(page) &&
    !["product", "category", "store", "seller", "owner"].includes(page)
  )
    notFound();
  if (simple.includes(page) && segments.length !== 1) notFound();
  if (page === "seller") {
    const views = [
      "overview",
      "products",
      "orders",
      "inventory",
      "sales",
      "payouts",
      "settings",
      "listing",
    ];
    if (
      (id && !views.includes(id)) ||
      segments.length > (id === "listing" ? 3 : 2)
    )
      notFound();
  }
  if (page === "owner") {
    const views = [
      "overview",
      "setup",
      "branding",
      "store-settings",
      "sellers",
      "products",
      "orders",
      "customers",
      "analytics",
      "commission",
      "domains",
    ];
    if ((id && !views.includes(id)) || segments.length > 2) notFound();
  }
  if (["product", "category", "store"].includes(page) && segments.length !== 2)
    notFound();
  if (
    page === "category" &&
    !categories.some((c) => c.marketplaceId === m.id && c.slug === id)
  )
    notFound();
  if (
    page === "store" &&
    !sellers.some((s) => s.marketplaceId === m.id && s.id === id)
  )
    notFound();
  // New browser-local product IDs are resolved client-side; known cross-tenant IDs are rejected here.
  if (
    page === "product" &&
    products.some((p) => p.id === id && p.marketplaceId !== m.id)
  )
    notFound();
  return (
    <CommerceApp
      tenant={tenant}
      segments={segments}
      query={search.q}
      sort={search.sort}
    />
  );
}
