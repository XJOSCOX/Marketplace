"use client";
import Link from "next/link";
import { useState } from "react";

import type { Marketplace } from "@/domain/models";
import { sellers } from "@/data/mock";
import { sellerAllowed } from "@/domain/commerce";
import { useCommerce } from "./commerce-provider";
import { Empty, Heading, Icon } from "./ui";

import { Listing } from "./listing-form";
import { WorkspaceContent } from "./workspace-content";

const sellerNav = [
  "Overview",
  "Products",
  "Orders",
  "Inventory",
  "Sales",
  "Payouts",
  "Settings",
];
const ownerNav = [
  "Overview",
  "Setup",
  "Branding",
  "Store settings",
  "Sellers",
  "Products",
  "Orders",
  "Customers",
  "Analytics",
  "Commission",
  "Domains",
];
const adminNav = [
  "Overview",
  "Marketplaces",
  "Users",
  "Sellers",
  "Transactions",
  "Disputes",
  "Moderation",
];
const slug = (s: string) => s.toLowerCase().replaceAll(" ", "-");
export function Workspace({
  m,
  area,
  parts,
}: {
  m: Marketplace;
  area: "seller" | "owner" | "admin";
  parts: string[];
}) {
  const { state } = useCommerce();
  const page = parts[0] || "overview";
  const base = area === "admin" ? "/admin" : `/m/${m.slug}/${area}`;
  const nav =
    area === "seller" ? sellerNav : area === "owner" ? ownerNav : adminNav;
  const availableSellers = sellers.filter((s) => sellerAllowed(m, s));
  const [sellerId, setSellerId] = useState(availableSellers[0]?.id || "");
  const tenantProducts = state.products.filter((p) => p.marketplaceId === m.id);
  const productList =
    area === "seller"
      ? tenantProducts.filter((p) => p.sellerId === sellerId)
      : tenantProducts;
  const validPage =
    nav.some((n) => slug(n) === page) ||
    (area === "seller" && page === "listing");
  return (
    <div
      className="workspace"
      style={{ "--accent": m.accent } as React.CSSProperties}
    >
      <aside className="sidebar">
        <Link className="brand" href={`/m/${m.slug}`}>
          <span className="brand-mark">
            a<span>✦</span>
          </span>
          {area === "admin" ? "Commerce" : m.name}
          <span className="brand-dot">.</span>
        </Link>
        <div className="workspace-label">
          {area === "admin"
            ? "PLATFORM ADMIN"
            : area === "owner"
              ? "MARKETPLACE WORKSPACE"
              : "SELLER STUDIO"}
        </div>
        <nav>
          {nav.map((name, i) => (
            <Link
              className={slug(name) === page ? "active" : ""}
              key={name}
              href={`${base}${i ? `/${slug(name)}` : ""}`}
            >
              <Icon
                name={
                  i === 0
                    ? "grid"
                    : name === "Products" || name === "Orders"
                      ? "box"
                      : name === "Sellers" ||
                          name === "Users" ||
                          name === "Customers"
                        ? "user"
                        : "globe"
                }
                size={18}
              />
              {name}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href={`/m/${m.slug}`}>← Back to storefront</Link>
          <Link href={`/m/${m.slug}/${area === "seller" ? "owner" : "seller"}`}>
            Switch to {area === "seller" ? "owner" : "seller"} workspace ↗
          </Link>
          {area !== "admin" && <Link href="/admin">Platform admin ↗</Link>}
          <p>
            AM{" "}
            <span>
              Alex Morgan<small>Demo role switcher</small>
            </span>
          </p>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-top">
          <span>
            {area === "admin"
              ? "GoXAvni Commerce / Platform"
              : `${m.name} / ${area === "seller" ? "Seller studio" : "Management"}`}
          </span>
          <span className="demo-pill">● Demo workspace</span>
        </header>
        <main className="workspace-content">
          {area === "seller" && (
            <label className="seller-switch">
              Demo seller
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
              >
                {availableSellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!validPage ? (
            <Empty
              title="Page not found"
              text="Choose a workspace page from the navigation."
              href={base}
              action="Go to overview"
            />
          ) : page === "listing" ? (
            <Listing
              key={`${parts[1] || "new"}-${sellerId}`}
              m={m}
              sellerId={sellerId}
              product={productList.find((p) => p.id === parts[1])}
              editing={!!parts[1]}
              base={base}
            />
          ) : (
            <>
              <Heading
                eyebrow={
                  area === "admin"
                    ? "THE BIG PICTURE"
                    : `${m.mode} · ${m.name.toUpperCase()}`
                }
                title={
                  page === "overview"
                    ? area === "seller"
                      ? "Let’s make good things happen."
                      : area === "owner"
                        ? "Your marketplace, at a glance."
                        : "Platform overview"
                    : nav.find((n) => slug(n) === page) || page
                }
                text={
                  page === "overview"
                    ? "A little perspective on how your business is doing."
                    : "Manage your demo workspace. Changes are stored in this browser."
                }
              >
                {page === "products" && area === "seller" && (
                  <Link className="button" href={`${base}/listing`}>
                    + Create listing
                  </Link>
                )}
              </Heading>
              <WorkspaceContent
                m={m}
                area={area}
                page={page}
                products={productList}
                sellerId={sellerId}
                base={base}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
