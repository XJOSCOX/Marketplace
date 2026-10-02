import { ManagementContent, ProductManagement } from "./management-content";
import { managedCategories } from "@/data-access/management";
import Link from "next/link";
import { signOut } from "@/auth/actions";
import {
  workspaceRecords,
  workspaceSeller,
  marketplaceCommission,
  editableProduct,
} from "@/data-access/workspace";
import type { authContext } from "@/auth/server";
import type { PublicMarketplace } from "@/domain/catalog";
import { Heading, Empty } from "./ui";
import { DataTable } from "./data-table";
import { LiveListingForm, type EditableListing } from "./live-listing-form";

import { notFound } from "next/navigation";
import { LiveMarketplaceForm } from "./live-marketplace-form";
import { AppError } from "@/domain/errors";
export async function LiveWorkspace({
  auth,
  m,
  area,
  segments,
  sellerChoice,
}: {
  auth: Awaited<ReturnType<typeof authContext>>;
  m?: PublicMarketplace;
  area: "seller" | "owner" | "admin";
  segments: string[];
  sellerChoice?: string;
}) {
  const page = segments[0] || "overview";
  const base = area === "admin" ? "/admin" : `/m/${m!.slug}/${area}`;
  const nav =
    area === "admin"
      ? [
          "overview",
          "marketplaces",
          "users",
          "sellers",
          "transactions",
          "disputes",
          "moderation",
        ]
      : area === "seller"
        ? [
            "overview",
            "products",
            "orders",
            "inventory",
            "sales",
            "payouts",
            "settings",
          ]
        : [
            "overview",
            "setup",
            "branding",
            "store-settings",
            "sellers",
            "products",
            "categories",
            "publish",
            "orders",
            "customers",
            "analytics",
            "commission",
            "domains",
          ];
  const user = await auth.requireUser();
  let sellerId: string | undefined;
  if (area === "seller") {
    // No browser seller switcher in the real workspace: resolve the user's active seller.
    const data = await workspaceSeller(auth.db, m!.id, user.id);
    if (!data)
      return (
        <Empty
          title="Seller onboarding required"
          text="Apply to join this marketplace or check your application status."
          href={`/m/${m!.slug}/apply`}
          action="View application"
        />
      );
    await auth.requireSellerAccess(m!.id, data.id);
    sellerId = data.id;
  }
  const recordPage =
    page === "overview"
      ? area === "admin"
        ? "marketplaces"
        : "products"
      : page === "transactions"
        ? "orders"
        : page === "orders" && area === "seller"
          ? "seller-orders"
          : page;
  const supported = [
    "products",
    "inventory",
    "sellers",
    "orders",
    "seller-orders",
    "customers",
    "marketplaces",
    "users",
  ];
  const managed =
    area === "owner" &&
    [
      "overview",
      "setup",
      "branding",
      "store-settings",
      "categories",
      "sellers",
      "products",
      "listing",
      "publish",
    ].includes(page);
  const records =
    !managed && supported.includes(recordPage)
      ? await workspaceRecords(
          auth.db,
          recordPage as Parameters<typeof workspaceRecords>[1],
          m?.id,
          sellerId,
        )
      : null;
  let editor: React.ReactNode = managed ? (
    <ManagementContent
      auth={auth}
      m={m!}
      page={page}
      productId={segments[1]}
      sellerChoice={sellerChoice}
    />
  ) : area === "seller" && page === "products" ? (
    <ProductManagement auth={auth} m={m!} base={base} seller={sellerId} />
  ) : null;
  if (area === "owner" && ["commission"].includes(page)) {
    let allowed = false;
    try {
      await auth.requireMarketplaceRole(m!.id, ["marketplace_owner"]);
      allowed = true;
    } catch (error) {
      if (!(error instanceof AppError && error.status === 403)) throw error;
    }
    if (allowed) {
      const commission = await marketplaceCommission(auth.db, m!.id);
      editor = <LiveMarketplaceForm m={m!} commission={commission} />;
    } else
      editor = (
        <p className="info-banner">
          Only the marketplace owner can change these settings.
        </p>
      );
  }
  if (page === "listing" && sellerId) {
    const categories = await managedCategories(auth.db, m!.id);
    let product: EditableListing | undefined;
    if (segments[1]) {
      const data = await editableProduct(auth.db, m!.id, sellerId, segments[1]);
      if (!data) notFound();
      product = data;
    }
    editor = (
      <LiveListingForm
        key={product?.id || "new"}
        tenant={m!.id}
        seller={sellerId}
        base={base}
        categories={categories}
        product={product}
      />
    );
  }
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link
          className="brand"
          href={
            m
              ? `/m/${m.slug}${m.status === "draft" ? "/owner/preview" : ""}`
              : "/"
          }
        >
          {m?.name || "Commerce"}.
        </Link>
        <p className="workspace-label">{area.toUpperCase()} WORKSPACE</p>
        <nav>
          {nav.map((n) => (
            <Link
              className={page === n ? "active" : ""}
              key={n}
              href={`${base}${n === "overview" ? "" : "/" + n}`}
            >
              {n.replaceAll("-", " ")}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <form action={signOut}>
            <button className="text-button">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-top">
          <span>{m?.name || "Platform administration"}</span>
          <span className="status">LIVE SUPABASE DATA</span>
        </header>
        <main className="workspace-content">
          <Heading
            eyebrow="YOUR BUSINESS"
            title={
              page === "overview"
                ? area === "owner"
                  ? "Welcome to your next chapter."
                  : "Your seller studio."
                : page.replaceAll("-", " ")
            }
            text={m?.name || "Your business, at a glance."}
          />
          {editor ||
            (records ? (
              <>
                <DataTable
                  columns={
                    area === "seller" && recordPage === "products"
                      ? [...records.columns, "Action"]
                      : records.columns
                  }
                  rows={
                    area === "seller" && recordPage === "products"
                      ? records.rows.map((row) => [
                          ...row,
                          <Link key={row[0]} href={base + "/listing/" + row[0]}>
                            Edit listing
                          </Link>,
                        ])
                      : records.rows
                  }
                />
                <p className="muted" style={{ marginTop: 15 }}>
                  Showing up to 100 authorized records. Amount columns are
                  integer minor units.
                </p>
              </>
            ) : (
              <div className="panel">
                <h2>
                  {page === "inventory"
                    ? "Inventory management"
                    : page === "listing"
                      ? "Listing editor"
                      : "Configuration and operations"}
                </h2>
                <p className="muted" style={{ marginTop: 15 }}>
                  The authenticated database foundation is connected. The
                  remaining management editors and reporting workflows will be
                  connected in Phase 3. No demo values are displayed or saved
                  here.
                </p>
              </div>
            ))}
        </main>
      </div>
    </div>
  );
}
