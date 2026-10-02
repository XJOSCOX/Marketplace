import Link from "next/link";
import { notFound } from "next/navigation";
import type { authContext } from "@/auth/server";
import type { PublicMarketplace } from "@/domain/catalog";
import {
  managedCategories,
  managedSellers,
  dashboardCounts,
  managedProducts,
} from "@/data-access/management";
import { workspaceSeller, editableProduct } from "@/data-access/workspace";
import { formatAmount, requireUuid } from "@/domain/api";
import { OwnerOverview, PublishPanel } from "./owner-overview";
import { CategoryManager } from "./category-manager";
import { BrandingEditor } from "./branding-editor";
import { SellerApplications } from "./seller-applications";
import { LiveListingForm } from "./live-listing-form";
import { AppError } from "@/domain/errors";
export async function ManagementContent({
  auth,
  m,
  page,
  productId,
  sellerChoice,
}: {
  auth: Awaited<ReturnType<typeof authContext>>;
  m: PublicMarketplace;
  page: string;
  productId?: string;
  sellerChoice?: string;
}) {
  const user = await auth.requireUser();
  const base = `/m/${m.slug}/owner`;
  if (page === "overview")
    return (
      <OwnerOverview m={m} counts={await dashboardCounts(auth.db, m.id)} />
    );
  if (page === "categories")
    return (
      <CategoryManager
        key={m.id}
        tenant={m.id}
        categories={await managedCategories(auth.db, m.id)}
      />
    );
  if (page === "sellers")
    return (
      <>
        {m.mode === "STORE" ? (
          <div className="panel">
            <h2>Your brand. Your store.</h2>
            <p>
              STORE mode sells only owner inventory. Third-party applications
              are closed.
            </p>
          </div>
        ) : (
          <SellerApplications
            tenant={m.id}
            userId={user.id}
            ownerId={m.owner_user_id}
            sellers={await managedSellers(auth.db, m.id)}
          />
        )}
      </>
    );
  if (["branding", "store-settings", "setup", "publish"].includes(page)) {
    try {
      await auth.requireMarketplaceRole(m.id, ["marketplace_owner"]);
    } catch (error) {
      if (error instanceof AppError && error.status === 403)
        return (
          <p className="info-banner">
            Only the marketplace owner can change branding, store information or
            publication.
          </p>
        );
      throw error;
    }
    return page === "publish" ? (
      <PublishPanel m={m} />
    ) : (
      <BrandingEditor key={m.id} m={m} store={page === "store-settings"} />
    );
  }
  if (page === "products")
    return <ProductManagement auth={auth} m={m} base={base} />;
  if (page === "listing") {
    let sellerId = sellerChoice;
    if (productId) {
      requireUuid(productId);
      const { data, error } = await auth.db
        .from("products")
        .select("seller_id")
        .eq("marketplace_id", m.id)
        .eq("id", productId)
        .single();
      if (error || !data) notFound();
      sellerId = data.seller_id;
    } else if (!sellerId)
      sellerId = (await workspaceSeller(auth.db, m.id, user.id))?.id;
    if (!sellerId) {
      const sellers = (await managedSellers(auth.db, m.id)).filter(
        (s) => s.status === "active",
      );
      return (
        <div className="panel">
          <h2>Choose a selling business</h2>
          <p>
            {m.mode === "MARKETPLACE"
              ? "Marketplace owners manage inventory for approved third-party sellers. You are not automatically a seller."
              : "Choose the seller responsible for this product."}
          </p>
          <div className="quick-actions">
            {sellers.map((s) => (
              <Link key={s.id} href={`${base}/listing?seller=${s.id}`}>
                {s.name} →
              </Link>
            ))}
          </div>
          {!sellers.length && (
            <Link href={base + "/sellers"} className="text-link">
              Invite and approve a seller first →
            </Link>
          )}
        </div>
      );
    }
    requireUuid(sellerId);
    await auth.requireSellerAccess(m.id, sellerId);
    const product = productId
      ? await editableProduct(auth.db, m.id, sellerId, productId)
      : undefined;
    if (productId && !product) notFound();
    return (
      <LiveListingForm
        key={productId || sellerId}
        tenant={m.id}
        seller={sellerId}
        base={base}
        categories={await managedCategories(auth.db, m.id)}
        product={product || undefined}
      />
    );
  }
  return null;
}
export async function ProductManagement({
  auth,
  m,
  base,
  seller,
}: {
  auth: Awaited<ReturnType<typeof authContext>>;
  m: PublicMarketplace;
  base: string;
  seller?: string;
}) {
  const products = await managedProducts(auth.db, m.id, seller);
  return (
    <>
      <div className="section-heading">
        <p className="muted">
          Keep your collection considered. Draft, publish or archive each
          listing.
        </p>
        <Link className="button" href={base + "/listing"}>
          Add product +
        </Link>
      </div>
      <div className="management-list">
        {products.map((p) => (
          <article className="management-row" key={p.id}>
            <div>
              <strong>{p.name}</strong>
              <small>
                {p.status} · {formatAmount(p.price_amount, p.currency)}
              </small>
            </div>
            <Link className="button secondary" href={base + "/listing/" + p.id}>
              Edit
            </Link>
          </article>
        ))}
        {!products.length && (
          <div className="panel">
            <h2>Your first good find starts here.</h2>
            <p>Add a category, then create your first product.</p>
          </div>
        )}
      </div>
      <p className="muted">Showing up to 100 recent listings.</p>
    </>
  );
}
