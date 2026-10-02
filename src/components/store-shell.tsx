"use client";
import Link from "./demo-link";
import { usePathname } from "next/navigation";
import type { Marketplace } from "@/domain/models";
import { categories, sellers } from "@/data/mock";
import { cartLines, catalogFor } from "@/domain/commerce";
import { useCommerce } from "./commerce-provider";
import { Icon } from "./ui";
export function StoreShell({
  marketplace: m,
  children,
}: {
  marketplace: Marketplace;
  children: React.ReactNode;
}) {
  const { state } = useCommerce();
  const path = usePathname();
  const base = `${path.startsWith("/demo/") ? "/demo" : ""}/m/${m.slug}`;
  const count = cartLines(
    state.cart,
    catalogFor(m, state.products, sellers),
    m.id,
  ).reduce((s, i) => s + i.quantity, 0);
  return (
    <div style={{ "--accent": m.accent } as React.CSSProperties}>
      <div className="announcement">
        <span>
          A little discovery goes a long way. Find your next favorite.
        </span>
        <Link href={`${base}/owner`}>
          Build your own marketplace <span>↗</span>
        </Link>
      </div>
      <header className="store-header">
        <div className="header-main">
          <Link href={base} className="brand">
            <span className="brand-mark">
              a<span>✦</span>
            </span>
            {m.name}
            <span className="brand-dot">.</span>
          </Link>
          <form action={`${base}/products`} className="search">
            <Icon name="search" />
            <input
              name="q"
              aria-label="Search products"
              placeholder="Search for something good"
            />
            <kbd>↵</kbd>
          </form>
          <div className="header-actions">
            <Link href={`${base}/seller`} className="sell-link">
              Start selling ↗
            </Link>
            <Link href={`${base}/favorites`} aria-label="Favorites">
              <Icon name="heart" />
            </Link>
            <Link href={`${base}/profile`} aria-label="Your account">
              <Icon name="user" />
            </Link>
            <Link
              href={`${base}/cart`}
              aria-label={`Cart, ${count} items`}
              className="cart-link"
            >
              <Icon name="bag" />
              <span>{count}</span>
            </Link>
          </div>
        </div>
        <nav className="category-nav" aria-label="Shop categories">
          <Link
            className={path === `${base}/products` ? "active" : ""}
            href={`${base}/products`}
          >
            <Icon name="grid" size={16} />
            All discoveries
          </Link>
          {categories
            .filter((c) => c.marketplaceId === m.id)
            .map((c) => (
              <Link key={c.id} href={`${base}/category/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          <Link href={`${base}/products?sort=new`}>
            New arrivals <span className="tiny-dot" />
          </Link>
        </nav>
      </header>
      <main className="store-main">{children}</main>
      <footer>
        <div>
          <Link href={base} className="brand">
            {m.name}
            <span className="brand-dot">.</span>
          </Link>
          <p>
            A world of good things.
            <br />
            From people who care.
          </p>
        </div>
        <div>
          <strong>Discover</strong>
          <Link href={`${base}/products`}>Shop all</Link>
          <Link href={`${base}/favorites`}>Your favorites</Link>
          <Link href={`${base}/orders`}>Your orders</Link>
        </div>
        <div>
          <strong>Your workspace</strong>
          <Link href={`${base}/seller`}>Seller studio</Link>
          <Link href={`${base}/owner`}>Marketplace management</Link>
          <Link href="/admin">Platform administration</Link>
        </div>
        <div>
          <strong>Explore demo tenants</strong>
          {state.marketplaces.map((t) => (
            <Link href={`/m/${t.slug}`} key={t.id}>
              {t.name} <small>{t.mode}</small>
            </Link>
          ))}
        </div>
        <div className="footer-bottom">
          © 2026 {m.name}. Made for a world of possibilities.
          <span>Interactive demo · USD · English</span>
        </div>
      </footer>
    </div>
  );
}
