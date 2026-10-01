"use client";
import Link from "next/link";
import type { Marketplace, Product } from "@/domain/models";
import { memberships, orders, sellers, users } from "@/data/mock";
import { money, sellerAllowed } from "@/domain/commerce";
import { useCommerce } from "./commerce-provider";
import { Icon } from "./ui";
import { DataTable } from "./data-table";
import { Settings } from "./workspace-settings";
export function WorkspaceContent({
  m,
  area,
  page,
  products,
  sellerId,
  base,
}: {
  m: Marketplace;
  area: string;
  page: string;
  products: Product[];
  sellerId: string;
  base: string;
}) {
  const { state, update, notify } = useCommerce();
  const scopedOrders = orders
    .filter((o) => area === "admin" || o.marketplaceId === m.id)
    .map((o) => ({
      ...o,
      items: o.items.filter(
        (i) => area !== "seller" || i.sellerId === sellerId,
      ),
    }))
    .filter((o) => o.items.length);
  const revenue = scopedOrders.reduce(
    (sum, o) => sum + o.items.reduce((a, i) => a + i.price * i.quantity, 0),
    0,
  );
  const scopedSellers = sellers.filter(
    (s) =>
      area === "admin" || (s.marketplaceId === m.id && sellerAllowed(m, s)),
  );
  if (["overview", "sales", "analytics"].includes(page))
    return (
      <>
        <div className="stats">
          {[
            [
              area === "admin" ? "Gross transaction value" : "Gross sales",
              money(revenue),
              "From sample orders",
            ],
            ["Orders", scopedOrders.length, "Across the demo period"],
            [
              area === "admin" ? "Marketplaces" : "Products",
              area === "admin" ? state.marketplaces.length : products.length,
              area === "admin"
                ? "All tenant modes supported"
                : "In this workspace",
            ],
            [
              "Average order value",
              money(scopedOrders.length ? revenue / scopedOrders.length : 0),
              "Based on sample orders",
            ],
          ].map(([label, value, note]) => (
            <div className="stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{note}</small>
            </div>
          ))}
        </div>
        <div className="dashboard-grid">
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Sales activity</h2>
                <p className="muted">September 2026 · sample order totals</p>
              </div>
              <span className="status">USD</span>
            </div>
            <div
              className="bar-chart"
              role="img"
              aria-label={`Sales by sample order; total ${money(revenue)}`}
            >
              {scopedOrders.map((o) => {
                const value = o.items.reduce(
                  (a, i) => a + i.price * i.quantity,
                  0,
                );
                return (
                  <div className="bar-column" key={o.id}>
                    <small>{money(value)}</small>
                    <div
                      className="bar"
                      style={{
                        height: `${Math.max(8, (value / Math.max(...scopedOrders.map((o) => o.total))) * 130)}px`,
                      }}
                    />
                    <small>{o.date.slice(5)}</small>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="panel next-steps">
            <p className="eyebrow">ROOM TO GROW</p>
            <h2>
              Your next chapter
              <br />
              starts here.
            </h2>
            <p className="muted">
              {area === "admin"
                ? "Explore the businesses building on Commerce."
                : "Keep your catalog fresh and make your storefront feel like you."}
            </p>
            <Link
              className="button"
              href={`${base}/${area === "admin" ? "marketplaces" : "products"}`}
            >
              {area === "admin" ? "View marketplaces" : "Manage products"}{" "}
              <Icon name="arrow" />
            </Link>
          </section>
        </div>
        <h2 className="subheading">Recent orders</h2>
        <DataTable
          columns={["Order", "Date", "Items", "Status", "Total"]}
          rows={scopedOrders.map((o) => [
            o.id,
            o.date,
            o.items.length,
            o.status,
            money(o.items.reduce((s, i) => s + i.price * i.quantity, 0)),
          ])}
        />
      </>
    );
  if (page === "products" || page === "inventory")
    return (
      <DataTable
        columns={["Product", "SKU", "Status", "Price", "Stock", "Action"]}
        rows={products.flatMap((p) =>
          page === "inventory"
            ? p.variants.map((v) => [
                p.name + " · " + v.name,
                v.sku,
                p.status,
                money(v.price),
                <input
                  key={v.id}
                  className="stock-input"
                  type="number"
                  min="0"
                  aria-label={`Stock for ${p.name} ${v.name}`}
                  value={v.stock}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      products: s.products.map((item) =>
                        item.id === p.id && item.marketplaceId === m.id
                          ? {
                              ...item,
                              variants: item.variants.map((variant) =>
                                variant.id === v.id
                                  ? {
                                      ...variant,
                                      stock: Math.max(
                                        0,
                                        Math.floor(Number(e.target.value) || 0),
                                      ),
                                    }
                                  : variant,
                              ),
                            }
                          : item,
                      ),
                    }))
                  }
                />,
                "Auto-saved locally",
              ])
            : [
                [
                  p.name,
                  p.variants[0].sku,
                  p.status,
                  money(p.price),
                  p.variants.reduce((s, v) => s + v.stock, 0),
                  area === "seller" ? (
                    <Link
                      key={p.id}
                      className="text-link"
                      href={`${base}/listing/${p.id}`}
                    >
                      Edit listing ↗
                    </Link>
                  ) : (
                    <Link
                      key={p.id}
                      className="text-link"
                      href={`/m/${m.slug}/product/${p.id}`}
                    >
                      View ↗
                    </Link>
                  ),
                ],
              ],
        )}
      />
    );
  if (page === "orders" || page === "transactions")
    return (
      <DataTable
        columns={["Order", "Marketplace", "Date", "Status", "Gross total"]}
        rows={scopedOrders.map((o) => [
          o.id,
          o.marketplaceId,
          o.date,
          o.status,
          money(o.items.reduce((sum, i) => sum + i.price * i.quantity, 0)),
        ])}
      />
    );
  if (page === "sellers")
    return (
      <DataTable
        columns={["Seller", "Marketplace", "Location", "Type", "Status"]}
        rows={scopedSellers.map((s) => [
          s.name,
          s.marketplaceId,
          s.location,
          s.isOwner ? "Owner" : "Third-party",
          s.status,
        ])}
      />
    );
  if (page === "users" || page === "customers") {
    const visible =
      page === "users"
        ? users
        : users.filter((u) =>
            memberships.some(
              (member) =>
                member.marketplaceId === m.id &&
                member.userId === u.id &&
                member.roles.includes("buyer"),
            ),
          );
    return (
      <DataTable
        columns={["Name", "Email", "Roles", "Memberships"]}
        rows={visible.map((u) => [
          u.name,
          u.email,
          page === "users"
            ? [
                ...new Set([
                  ...u.platformRoles,
                  ...memberships
                    .filter((member) => member.userId === u.id)
                    .flatMap((member) => member.roles),
                ]),
              ].join(", ")
            : memberships
                .find(
                  (member) =>
                    member.userId === u.id && member.marketplaceId === m.id,
                )
                ?.roles.join(", ") || "",
          memberships.filter(
            (member) =>
              member.userId === u.id &&
              (page === "users" || member.marketplaceId === m.id),
          ).length,
        ])}
      />
    );
  }
  if (page === "marketplaces")
    return (
      <DataTable
        columns={["Marketplace", "Mode", "Owner", "Commission", "Open"]}
        rows={state.marketplaces.map((t) => [
          t.name,
          t.mode,
          users.find((u) => u.id === t.ownerId)?.name,
          `${t.commission}%`,
          <Link key={t.id} className="text-link" href={`/m/${t.slug}/owner`}>
            Open workspace ↗
          </Link>,
        ])}
      />
    );
  if (page === "payouts" || page === "domains")
    return (
      <div className="panel placeholder">
        <Icon name={page === "payouts" ? "bag" : "globe"} size={36} />
        <h2>
          {page === "payouts"
            ? "A home for your earnings"
            : "Your brand. Your address."}
        </h2>
        <p>
          {page === "payouts"
            ? "Payout schedules, balances, and connected payment accounts will be available after payment integration."
            : "Custom domain verification and SSL provisioning will be available with hosting integration."}
        </p>
        <span className="status">
          Planned integration · no account or domain connected
        </span>
      </div>
    );
  if (page === "disputes" || page === "moderation")
    return (
      <DataTable
        columns={["Reference", "Marketplace", "Subject", "Status", "Action"]}
        rows={state.marketplaces.map((t) => {
          const key = `${page}-${t.id}`;
          const resolved = state.settings[key]?.status === "Resolved";
          return [
            `${page === "disputes" ? "DSP" : "MOD"}-${t.id}`,
            t.name,
            page === "disputes"
              ? "Sample delivery inquiry"
              : "Sample listing review",
            resolved ? "Resolved" : "Needs review",
            <button
              key={t.id}
              disabled={resolved}
              className="text-button"
              onClick={() => {
                update((s) => ({
                  ...s,
                  settings: { ...s.settings, [key]: { status: "Resolved" } },
                }));
                notify("Demo review marked resolved");
              }}
            >
              {resolved ? "Reviewed" : "Mark resolved"}
            </button>,
          ];
        })}
      />
    );
  return (
    <Settings
      key={`${m.id}-${area}-${page}-${sellerId}`}
      m={m}
      area={area}
      page={page}
      sellerId={sellerId}
    />
  );
}
