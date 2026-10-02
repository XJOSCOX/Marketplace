import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import * as mock from "../src/data/mock.ts";
export function seedId(value) {
  const hex = createHash("md5")
    .update("commerce-dev:" + value)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}
const q = (value) =>
  value === null
    ? "null"
    : typeof value === "boolean" || typeof value === "number"
      ? String(value)
      : `'${String(value).replaceAll("'", "''")}'`;
let sql =
  "-- Development fixtures only. Auth rows have NO passwords or sign-in identities.\n-- Run only in local/disposable development projects. Never reset a remote database automatically.\nbegin;\n";
function insert(table, rows) {
  for (const row of rows)
    sql += `insert into ${table} (${Object.keys(row).join(",")}) values (${Object.values(row).map(q).join(",")}) on conflict do nothing;\n`;
}
insert(
  "auth.users",
  mock.users.map((u) => ({
    id: seedId(u.id),
    aud: "authenticated",
    role: "authenticated",
    email: `${u.id}@commerce.example.test`,
    raw_user_meta_data: JSON.stringify({ display_name: u.name }),
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  })),
);
insert(
  "public.marketplaces",
  mock.marketplaces.map((m) => ({
    id: seedId(m.id),
    slug: m.slug,
    name: m.name,
    tagline: m.tagline,
    mode: m.mode,
    owner_user_id: seedId(m.ownerId),
    status: "active",
    accent: m.accent,
    currency: "USD",
    commission_basis_points: m.commission * 100,
  })),
);
insert(
  "public.marketplace_memberships",
  mock.memberships.map((m) => ({
    id: seedId(m.id),
    marketplace_id: seedId(m.marketplaceId),
    user_id: seedId(m.userId),
    roles: `{${m.roles.join(",")}}`,
  })),
);
insert(
  "public.sellers",
  mock.sellers.map((s) => ({
    id: seedId(s.id),
    marketplace_id: seedId(s.marketplaceId),
    user_id: seedId(s.userId),
    name: s.name,
    description: s.description,
    location: s.location,
    status: s.status,
  })),
);
insert(
  "public.stores",
  mock.stores.map((s) => ({
    id: seedId(s.id),
    marketplace_id: seedId(s.marketplaceId),
    seller_id: seedId(s.sellerId),
    name: s.name,
    slug: s.slug,
    status: "active",
  })),
);
insert(
  "public.categories",
  mock.categories.map((c) => ({
    id: seedId(c.id),
    marketplace_id: seedId(c.marketplaceId),
    slug: c.slug,
    name: c.name,
    icon: c.icon,
  })),
);
insert(
  "public.products",
  mock.products.map((p) => ({
    id: seedId(p.id),
    marketplace_id: seedId(p.marketplaceId),
    seller_id: seedId(p.sellerId),
    category_id: seedId(p.categoryId),
    name: p.name,
    description: p.description,
    image_url: p.image,
    status: p.status,
    price_amount: String(BigInt(p.price) * 100n),
    currency: "USD",
  })),
);
insert(
  "public.product_variants",
  mock.products.flatMap((p) =>
    p.variants.map((v) => ({
      id: seedId(v.id),
      marketplace_id: seedId(v.marketplaceId),
      product_id: seedId(v.productId),
      name: v.name,
      sku: v.sku,
      stock: v.stock,
      price_amount: String(BigInt(v.price) * 100n),
      currency: "USD",
    })),
  ),
);
insert(
  "public.orders",
  mock.orders.map((o) => ({
    id: seedId(o.id),
    marketplace_id: seedId(o.marketplaceId),
    user_id: seedId(o.userId),
    status: o.status.toLowerCase(),
    subtotal_amount: String(BigInt(o.total) * 100n),
    total_amount: String(BigInt(o.total) * 100n),
    commission_amount: "0",
    currency: "USD",
    created_at: o.date + "T12:00:00Z",
  })),
);
insert(
  "public.order_items",
  mock.orders.flatMap((o) =>
    o.items.map((i, n) => ({
      id: seedId(`${o.id}-item-${n}`),
      marketplace_id: seedId(o.marketplaceId),
      order_id: seedId(o.id),
      product_id: seedId(i.productId),
      seller_id: seedId(i.sellerId),
      variant_id: seedId(i.productId + "-v0"),
      name: i.name,
      quantity: i.quantity,
      price_amount: String(BigInt(i.price) * 100n),
      subtotal_amount: String(BigInt(i.price * i.quantity) * 100n),
      currency: "USD",
    })),
  ),
);
insert(
  "public.conversations",
  mock.conversations.map((c) => ({
    id: seedId(c.id),
    marketplace_id: seedId(c.marketplaceId),
    seller_id: seedId(c.sellerId),
    subject: c.subject,
    created_by: seedId("alex"),
  })),
);
insert(
  "public.conversation_participants",
  mock.conversations.flatMap((c) =>
    [
      ...new Set([
        "alex",
        mock.sellers.find((s) => s.id === c.sellerId).userId,
      ]),
    ].map((u) => ({
      id: seedId(c.id + "-" + u),
      marketplace_id: seedId(c.marketplaceId),
      conversation_id: seedId(c.id),
      user_id: seedId(u),
    })),
  ),
);
insert(
  "public.messages",
  mock.conversations.map((c) => ({
    id: seedId(c.id + "-message"),
    marketplace_id: seedId(c.marketplaceId),
    conversation_id: seedId(c.id),
    sender_id: seedId("alex"),
    body: "Hello! Can you tell me more about this item?",
  })),
);
sql += "commit;\n";
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
console.log(
  "Wrote deterministic development fixtures without passwords or admin grants.",
);
