"use client";
import { useState } from "react";
import type { Marketplace, Product } from "@/domain/models";
import { categories, sellers } from "@/data/mock";
import { sellerAllowed } from "@/domain/commerce";
import { useCommerce } from "./commerce-provider";
import { ProductCard } from "./product-card";
import { Empty, Heading, Icon } from "./ui";

export function Browse({
  m,
  products,
  category,
  query = "",
  initialSort = "",
  sellerId,
  favorites = false,
}: {
  m: Marketplace;
  products: Product[];
  category?: string;
  query?: string;
  initialSort?: string;
  sellerId?: string;
  favorites?: boolean;
}) {
  const { state } = useCommerce();
  const [sort, setSort] = useState(initialSort);
  const [price, setPrice] = useState("all");
  const [search, setSearch] = useState(query);
  const [categoryFilter, setCategory] = useState(category || "all");
  const seller = sellers.find(
    (s) => s.id === sellerId && s.marketplaceId === m.id && sellerAllowed(m, s),
  );
  const visible = products
    .filter(
      (p) =>
        (!favorites || state.favorites.includes(p.id)) &&
        (!sellerId || p.sellerId === sellerId) &&
        (categoryFilter === "all" ||
          p.categoryId === `${m.id}-${categoryFilter}`) &&
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (price === "all" || p.price <= Number(price)),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : sort === "rating"
            ? b.rating - a.rating
            : sort === "new"
              ? b.id.localeCompare(a.id)
              : 0,
    );
  if (sellerId && !seller)
    return (
      <Empty
        title="Storefront unavailable"
        text="This seller is not available in this marketplace."
        href={`/m/${m.slug}/products`}
      />
    );
  return (
    <div className="page section">
      <Heading
        eyebrow={seller ? "INDEPENDENT BRAND" : "CURATED FOR THE EVERYDAY"}
        title={
          seller?.name ||
          (favorites
            ? "Your favorites"
            : categories.find(
                (c) => c.marketplaceId === m.id && c.slug === category,
              )?.name || "Discover something good")
        }
        text={
          seller?.description ||
          "Thoughtful products. Independent perspectives. Endless possibilities."
        }
      />
      {seller && (
        <p className="seller-location">
          ⌖ {seller.location} · Verified demo seller
        </p>
      )}
      <div className="filters">
        <label className="filter-search">
          <Icon name="search" />
          <input
            aria-label="Filter products"
            placeholder="Search this collection"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Category"
          value={categoryFilter}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories
            .filter((c) => c.marketplaceId === m.id)
            .map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Maximum price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        >
          <option value="all">Any price</option>
          <option value="50">Under $50</option>
          <option value="100">Under $100</option>
        </select>
        <select
          aria-label="Sort products"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="">Recommended</option>
          <option value="new">Newest</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>
      <p className="results-count">{visible.length} discoveries</p>
      {visible.length ? (
        <div className="product-grid">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} base={`/m/${m.slug}`} />
          ))}
        </div>
      ) : (
        <Empty
          title="No discoveries here yet"
          text="Try another search or save something you love."
          href={`/m/${m.slug}/products`}
        />
      )}
    </div>
  );
}
