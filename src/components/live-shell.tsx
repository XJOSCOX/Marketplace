import Link from "next/link";
import type { PublicMarketplace } from "@/domain/catalog";
import { Icon } from "./ui";
export function LiveShell({
  m,
  children,
}: {
  m: PublicMarketplace;
  children: React.ReactNode;
}) {
  const base = `/m/${m.slug}`;
  return (
    <div style={{ "--accent": m.accent } as React.CSSProperties}>
      <div className="announcement">
        <span>{m.tagline}</span>
        <Link href={`${base}/owner`}>Your marketplace workspace ↗</Link>
      </div>
      <header className="store-header">
        <div className="header-main">
          <Link className="brand" href={base}>
            {m.name}
            <span className="brand-dot">.</span>
          </Link>
          <form className="search" action={`${base}/products`}>
            <Icon name="search" />
            <input
              name="q"
              aria-label="Search products"
              placeholder="Search for something good"
            />
          </form>
          <div className="header-actions">
            <Link href={`${base}/cart`} aria-label="Shopping bag">
              <Icon name="bag" />
            </Link>
            <Link href={`${base}/profile`}>Account</Link>
          </div>
        </div>
        <nav className="category-nav">
          {["products", "seller", "owner", "orders", "messages"].map((p) => (
            <Link href={`${base}/${p}`} key={p}>
              {p === "products"
                ? "Discover"
                : p.charAt(0).toUpperCase() + p.slice(1)}
            </Link>
          ))}
        </nav>
      </header>
      <main className="store-main">{children}</main>
      <footer>
        <div className="brand">{m.name}.</div>
        <div>
          <Link href="/auth/sign-in">Sign in</Link>
          <Link href="/auth/sign-up">Create account</Link>
        </div>
        <div>
          <Link href="/admin">Platform workspace</Link>
        </div>
        <div>
          <span className="status">Connected to Supabase</span>
        </div>
      </footer>
    </div>
  );
}
