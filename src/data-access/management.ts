import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicMarketplace, CatalogProduct } from "@/domain/catalog";
import { AppError } from "@/domain/errors";
export const marketplaceColumns =
  "id,owner_user_id,slug,name,tagline,mode,accent,currency,status,description,location,hero_heading,hero_description,logo_path,branding_completed_at,store_completed_at,previewed_at";
function failed() {
  return new AppError(
    503,
    "WORKSPACE_UNAVAILABLE",
    "Your marketplace is temporarily unavailable.",
  );
}
export async function managedMarketplace(
  db: SupabaseClient,
  slug: string,
): Promise<PublicMarketplace> {
  const { data, error } = await db
    .from("marketplaces")
    .select(marketplaceColumns)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw failed();
  if (!data) throw new AppError(404, "NOT_FOUND", "Marketplace not found.");
  return data as PublicMarketplace;
}
export async function managedCategories(db: SupabaseClient, tenant: string) {
  const { data, error } = await db
    .from("categories")
    .select("id,name,slug,icon,status,sort_order")
    .eq("marketplace_id", tenant)
    .order("sort_order")
    .order("name");
  if (error) throw failed();
  return data || [];
}
export async function managedSellers(db: SupabaseClient, tenant: string) {
  const { data, error } = await db
    .from("sellers")
    .select("id,user_id,name,description,status")
    .eq("marketplace_id", tenant)
    .order("created_at");
  if (error) throw failed();
  return data || [];
}
export async function applicationState(
  db: SupabaseClient,
  tenant: string,
  user: string,
) {
  const { data, error } = await db
    .from("sellers")
    .select("id,name,description,status")
    .eq("marketplace_id", tenant)
    .eq("user_id", user)
    .maybeSingle();
  if (error) throw failed();
  return data;
}
export async function dashboardCounts(db: SupabaseClient, tenant: string) {
  const defs = [
    ["products", undefined],
    ["products", "active"],
    ["sellers", "active"],
    ["sellers", "pending"],
    ["categories", "active"],
  ] as const;
  const results = await Promise.all(
    defs.map(async ([table, status]) => {
      let q = db
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("marketplace_id", tenant);
      if (status) q = q.eq("status", status);
      const r = await q;
      if (r.error) throw failed();
      return r.count || 0;
    }),
  );
  return {
    products: results[0],
    activeProducts: results[1],
    sellers: results[2],
    pending: results[3],
    categories: results[4],
  };
}
export async function managedProducts(
  db: SupabaseClient,
  tenant: string,
  seller?: string,
) {
  let q = db
    .from("secure_products")
    .select("id,name,status,price_amount,currency,seller_id,image_path")
    .eq("marketplace_id", tenant)
    .order("created_at", { ascending: false })
    .limit(100);
  if (seller) q = q.eq("seller_id", seller);
  const { data, error } = await q;
  if (error) throw failed();
  return data || [];
}
export async function previewCatalog(
  db: SupabaseClient,
  m: PublicMarketplace,
): Promise<CatalogProduct[]> {
  const [
    { data: owner, error: oe },
    { data: ps, error: pe },
    { data: vs, error: ve },
    sellers,
    categories,
  ] = await Promise.all([
    db.from("marketplaces").select("owner_user_id").eq("id", m.id).single(),
    db
      .from("secure_products")
      .select("*")
      .eq("marketplace_id", m.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("secure_product_variants")
      .select("*")
      .eq("marketplace_id", m.id)
      .eq("status", "active"),
    managedSellers(db, m.id),
    managedCategories(db, m.id),
  ]);
  if (oe || pe || ve) throw failed();
  return (ps || [])
    .filter(
      (p) =>
        categories.some(
          (c) => c.id === p.category_id && c.status === "active",
        ) &&
        sellers.some(
          (s) =>
            s.id === p.seller_id &&
            s.status === "active" &&
            (m.mode === "HYBRID" ||
              (m.mode === "STORE"
                ? s.user_id === owner.owner_user_id
                : s.user_id !== owner.owner_user_id)),
        ),
    )
    .map((p) => ({
      id: p.id,
      marketplaceId: m.id,
      sellerId: p.seller_id,
      categoryId: p.category_id,
      name: p.name,
      description: p.description,
      imageUrl: p.image_path
        ? `/api/v1/marketplaces/${m.id}/assets?productId=${p.id}&v=${encodeURIComponent(p.image_path)}`
        : p.image_url,
      priceAmount: p.price_amount,
      currency: p.currency,
      variants: (vs || [])
        .filter((v) => v.product_id === p.id)
        .map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          stock: v.stock,
          priceAmount: v.price_amount,
          currency: v.currency,
        })),
    }));
}
