"use client";
import { useCommerce } from "./commerce-provider";
import { StoreShell } from "./store-shell";
import {
  Home,
  Browse,
  ProductDetails,
  CartPage,
  CustomerPage,
} from "./store-pages";
import { Workspace } from "./workspace";
import { Empty } from "./ui";
import { sellers } from "@/data/mock";
import { catalogFor } from "@/domain/commerce";
export function CommerceApp({
  tenant,
  segments,
  query,
  sort,
  admin = false,
}: {
  tenant: string;
  segments: string[];
  query?: string;
  sort?: string;
  admin?: boolean;
}) {
  const { state, ready } = useCommerce();
  const m = state.marketplaces.find((t) => t.slug === tenant);
  if (!m)
    return (
      <Empty
        title="Marketplace not found"
        text="Choose one of the demo marketplaces."
        href="/"
        action="Go home"
      />
    );
  if (!ready)
    return (
      <div className="loading" role="status">
        Loading your marketplace…
      </div>
    );
  if (admin) return <Workspace m={m} area="admin" parts={segments} />;
  const [page, id] = segments;
  if (page === "seller" || page === "owner")
    return (
      <Workspace
        key={`${m.id}-${page}-${m.mode}`}
        m={m}
        area={page}
        parts={segments.slice(1)}
      />
    );
  const products = catalogFor(m, state.products, sellers);
  const product = products.find((p) => p.id === id);
  const content = !page ? (
    <Home m={m} products={products} />
  ) : page === "products" ||
    page === "category" ||
    page === "store" ||
    page === "favorites" ? (
    <Browse
      key={`${page}-${id || ""}-${query || ""}`}
      m={m}
      products={products}
      query={query}
      initialSort={sort}
      category={page === "category" ? id : undefined}
      sellerId={page === "store" ? id : undefined}
      favorites={page === "favorites"}
    />
  ) : page === "product" && product ? (
    <ProductDetails key={product.id} m={m} product={product} />
  ) : page === "cart" || page === "checkout" ? (
    <CartPage m={m} checkout={page === "checkout"} />
  ) : ["profile", "orders", "messages"].includes(page) ? (
    <CustomerPage key={page} m={m} page={page} />
  ) : (
    <Empty
      title="We couldn’t find that page"
      text="There are still plenty of good things to discover."
      href={`/m/${m.slug}/products`}
    />
  );
  return <StoreShell marketplace={m}>{content}</StoreShell>;
}
