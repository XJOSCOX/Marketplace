import Image from "next/image";
import Link from "next/link";
import type { PublicMarketplace } from "@/domain/catalog";
import { Icon } from "./ui";
export function LiveShell({
  m,
  children,
  preview = false,
}: {
  m: PublicMarketplace;
  children: React.ReactNode;
  preview?: boolean;
}) {
  const base = preview ? `/m/${m.slug}/owner/preview` : `/m/${m.slug}`;
  return (
    <div style={{ "--accent": m.accent } as React.CSSProperties}>
      <div className="announcement">
        <span>{m.tagline}</span>
        <Link href={`/m/${m.slug}/owner`}>Your marketplace workspace ↗</Link>
      </div>
      <header className="store-header">
        <div className="header-main">
          <Link className="brand" href={base}>
            {m.logo_path && (
              <Image
                className="marketplace-logo"
                unoptimized
                src={`/api/v1/marketplaces/${m.id}/assets?v=${encodeURIComponent(m.logo_path)}`}
                width={38}
                height={38}
                alt=""
              />
            )}
            {m.name}
            <span className="brand-dot">.</span>
          </Link>
          <form className="search" action={preview ? base : `${base}/products`}>
            <Icon name="search" />
            <input
              name="q"
              aria-label="Search products"
              placeholder="Search for something good"
            />
          </form>
          {!preview && (
            <div className="header-actions">
              <Link href={`${base}/cart`} aria-label="Shopping bag">
                <Icon name="bag" />
              </Link>
              <Link href={`${base}/profile`}>Account</Link>
            </div>
          )}
        </div>
        {!preview && (
          <nav className="category-nav">
            {["products", "seller", "owner", "orders", "messages"].map((p) => (
              <Link href={`${base}/${p}`} key={p}>
                {p === "products"
                  ? "Discover"
                  : p.charAt(0).toUpperCase() + p.slice(1)}
              </Link>
            ))}
            {m.mode !== "STORE" && (
              <Link href={`${base}/apply`}>Sell on this marketplace ↗</Link>
            )}
          </nav>
        )}
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
          <span className="status">LIVE SUPABASE DATA</span>
        </div>
      </footer>
    </div>
  );
}
