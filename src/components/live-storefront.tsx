import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  catalogProducts,
  publicCategories,
  publicSeller,
} from "@/data-access/catalog";
import { pagination, formatAmount, requireUuid } from "@/domain/api";
import type { PublicMarketplace, CatalogProduct } from "@/domain/catalog";
import { LiveShell } from "./live-shell";
import { Heading, Empty, Icon } from "./ui";
import { AddToCart } from "./live-cart-button";
export async function LiveStorefront({
  m,
  segments,
  search,
}: {
  m: PublicMarketplace;
  segments: string[];
  search: { q?: string; page?: string; pageSize?: string };
}) {
  const [page, id] = segments;
  const base = `/m/${m.slug}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search))
    if (value) params.set(key, value);
  if (page === "category") params.set("category", id);
  if (page === "product") requireUuid(id);
  const options = pagination(params);
  const [{ products, total }, categories] = await Promise.all([
    catalogProducts(
      m.id,
      options,
      page === "product" ? id : undefined,
      page === "store" ? requireUuid(id) : undefined,
    ),
    publicCategories(m.id),
  ]);
  let sellerName = "";
  if (page === "category" && !categories.some((c) => c.slug === id)) notFound();
  if (page === "store") {
    requireUuid(id);
    const data = await publicSeller(m.id, id);
    if (!data) notFound();
    sellerName = data.name;
  }
  function card(p: CatalogProduct) {
    return (
      <article className="product-card" key={p.id}>
        <Link
          href={`${base}/product/${p.id}`}
          className="product-photo"
          style={{ display: "block", background: "#e9ece4" }}
        >
          {p.imageUrl.startsWith("https://images.unsplash.com/") && (
            <Image
              src={p.imageUrl}
              alt={p.name}
              fill
              sizes="(max-width:600px) 50vw,25vw"
            />
          )}
        </Link>
        <Link className="product-title" href={`${base}/product/${p.id}`}>
          {p.name}
        </Link>
        <p className="product-price">
          {formatAmount(p.priceAmount, p.currency)}
        </p>
        <Link className="text-link" href={`${base}/store/${p.sellerId}`}>
          Meet the seller ↗
        </Link>
      </article>
    );
  }
  const p = products[0];
  if (page === "product" && !p) notFound();
  return (
    <LiveShell m={m}>
      {!page && (
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">THE EVERYDAY, REIMAGINED</p>
            <h1>{m.tagline}</h1>
            <p>Thoughtfully chosen products from independent perspectives.</p>
            <Link className="button" href={`${base}/products`}>
              Find your next favorite <Icon name="arrow" />
            </Link>
          </div>
          <div className="hero-image">
            <Image
              src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=90"
              alt="Considered living, thoughtfully curated"
              fill
              sizes="50vw"
              priority
            />
          </div>
        </section>
      )}
      <section className="section">
        {page === "product" ? (
          <>
            <div className="detail-grid">
              <div className="detail-photo">
                {p.imageUrl.startsWith("https://images.unsplash.com/") && (
                  <Image src={p.imageUrl} alt={p.name} fill sizes="50vw" />
                )}
              </div>
              <div className="detail-copy">
                <Heading title={p.name} text={p.description} />
                <h2>{formatAmount(p.priceAmount, p.currency)}</h2>
                <AddToCart tenant={m.id} product={p} />
                <Link className="text-link" href={`${base}/cart`}>
                  View your bag →
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <Heading
              eyebrow="THE GOOD STUFF"
              title={
                sellerName ||
                (page === "category"
                  ? categories.find((c) => c.slug === id)?.name || "Discover"
                  : "Your next favorite is here")
              }
              text={`${total} products in this collection`}
            />
            <nav className="account-tabs">
              {categories.map((c) => (
                <Link href={`${base}/category/${c.slug}`} key={c.id}>
                  {c.name}
                </Link>
              ))}
            </nav>
            {products.length ? (
              <div className="product-grid">{products.map(card)}</div>
            ) : (
              <Empty
                title="More good things are on their way"
                text="Try another category or search."
              />
            )}
            <nav className="form-actions" style={{ marginTop: 30 }}>
              {options.page > 1 && (
                <Link
                  className="button"
                  href={`?${new URLSearchParams({ ...Object.fromEntries(params), page: String(options.page - 1) })}`}
                >
                  Previous
                </Link>
              )}
              {options.from + products.length < total && (
                <Link
                  className="button"
                  href={`?${new URLSearchParams({ ...Object.fromEntries(params), page: String(options.page + 1) })}`}
                >
                  Next page →
                </Link>
              )}
            </nav>
          </>
        )}
      </section>
    </LiveShell>
  );
}
