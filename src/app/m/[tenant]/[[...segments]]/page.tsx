import { notFound } from "next/navigation";
import { marketplaces, categories, products, sellers } from "@/data/mock";
import { CommerceApp } from "@/components/commerce-app";
import { demoEnabled, supabaseConfig } from "@/lib/supabase/config";
import { findMarketplace } from "@/data-access/catalog";
import { protectPage } from "@/auth/protect-page";
import { LiveStorefront } from "@/components/live-storefront";
import { LiveWorkspace } from "@/components/live-workspace";
import { LiveAccount } from "@/components/live-account";
import { Empty } from "@/components/ui";
import { AppError } from "@/domain/errors";
import Link from "next/link";
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
  searchParams: Promise<{
    q?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const { tenant, segments = [] } = await params;
  const search = await searchParams;
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
  const privatePage = [
    "seller",
    "owner",
    "orders",
    "messages",
    "profile",
    "cart",
    "checkout",
    "favorites",
  ].includes(page);
  const path = `/m/${tenant}/${segments.join("/")}`;
  // Real workspaces fail closed even when the public demo is enabled.
  if (!supabaseConfig() && ["seller", "owner"].includes(page))
    await protectPage(path);
  if (supabaseConfig()) {
    let live;
    let auth;
    try {
      live = await findMarketplace(tenant, "slug");
      if (privatePage) auth = await protectPage(path, live.id, page);
    } catch (error) {
      if (error instanceof AppError) {
        if (error.status === 404) notFound();
        return (
          <Empty
            title={
              error.status === 403 ? "Access denied" : "Marketplace unavailable"
            }
            text={error.message}
            href="/"
            action="Go home"
          />
        );
      }
      throw error;
    }
    if (auth) {
      if (page === "seller" || page === "owner")
        return (
          <LiveWorkspace
            auth={auth}
            m={live}
            area={page}
            segments={segments.slice(1)}
          />
        );
      return <LiveAccount m={live} page={page} auth={auth} />;
    }
    return <LiveStorefront m={live} segments={segments} search={search} />;
  }
  if (!demoEnabled())
    return (
      <Empty
        title="Setup required"
        text="Configure Supabase to open this marketplace."
      />
    );
  const m = marketplaces.find((m) => m.slug === tenant);
  if (!m) notFound();
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
    <>
      <div className="info-banner" role="status">
        Development demo · Data is stored only in this browser.{" "}
        <Link href="/demo/m/goxavni/seller">Explore demo workspaces</Link> ·{" "}
        <Link href="/auth/sign-in">Sign in</Link>
      </div>
      <CommerceApp
        tenant={tenant}
        segments={segments}
        query={search.q}
        sort={search.sort}
      />
    </>
  );
}
