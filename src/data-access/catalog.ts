import "server-only";
import { publicClient } from "@/lib/supabase/server";
import { AppError } from "@/domain/errors";
import type { CatalogProduct, PublicMarketplace } from "@/domain/catalog";
import type { pagination } from "@/domain/api";
export async function publicSeller(tenant: string, id: string) {
  const { data, error } = await publicClient()
    .from("sellers")
    .select("id,name,description,location")
    .eq("marketplace_id", tenant)
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new AppError(
      503,
      "CATALOG_UNAVAILABLE",
      "The storefront is temporarily unavailable.",
    );
  return data;
}
export async function findMarketplace(
  identifier: string,
  by: "id" | "slug" = "id",
): Promise<PublicMarketplace> {
  const db = publicClient();
  const { data, error } = await db
    .from("marketplaces")
    .select(
      "id,slug,name,tagline,mode,accent,currency,status,description,location,hero_heading,hero_description,logo_path,branding_completed_at,store_completed_at,previewed_at",
    )
    .eq(by, identifier)
    .eq("status", "active")
    .maybeSingle();
  if (error)
    throw new AppError(
      503,
      "CATALOG_UNAVAILABLE",
      "The catalog is temporarily unavailable.",
    );
  if (!data)
    throw new AppError(404, "MARKETPLACE_NOT_FOUND", "Marketplace not found.");
  return data as PublicMarketplace;
}
export async function catalogProducts(
  tenant: string,
  options: ReturnType<typeof pagination>,
  productId?: string,
  sellerId?: string,
) {
  const db = publicClient();
  let query = db
    .from("catalog_products")
    .select("*", { count: "exact" })
    .eq("marketplace_id", tenant);
  if (options.q)
    query = query.ilike("name", `%${options.q.replace(/[\\%_]/g, "\\$&")}%`);
  if (options.category) {
    const { data, error } = await db
      .from("categories")
      .select("id")
      .eq("marketplace_id", tenant)
      .eq("slug", options.category)
      .eq("status", "active")
      .maybeSingle();
    if (error)
      throw new AppError(
        503,
        "CATALOG_UNAVAILABLE",
        "The catalog is temporarily unavailable.",
      );
    if (!data) return { products: [] as CatalogProduct[], total: 0 };
    query = query.eq("category_id", data.id);
  }
  if (productId) query = query.eq("id", productId);
  if (sellerId) query = query.eq("seller_id", sellerId);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range(options.from, options.to);
  if (error)
    throw new AppError(
      503,
      "CATALOG_UNAVAILABLE",
      "The catalog is temporarily unavailable.",
    );
  const rows = data || [];
  const variants = rows.length
    ? await db
        .from("catalog_variants")
        .select("*")
        .eq("marketplace_id", tenant)
        .in(
          "product_id",
          rows.map((p) => p.id),
        )
        .order("id")
    : { data: [], error: null };
  if (variants.error)
    throw new AppError(
      503,
      "CATALOG_UNAVAILABLE",
      "The catalog is temporarily unavailable.",
    );
  const products: CatalogProduct[] = rows.map((p) => ({
    id: p.id,
    marketplaceId: p.marketplace_id,
    sellerId: p.seller_id,
    categoryId: p.category_id,
    name: p.name,
    description: p.description,
    imageUrl: p.image_path
      ? `/api/v1/marketplaces/${tenant}/assets?productId=${p.id}&v=${encodeURIComponent(p.image_path)}`
      : p.image_url,
    priceAmount: p.price_amount,
    currency: p.currency,
    variants: (variants.data || [])
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
  return { products, total: count || 0 };
}
export async function publicCategories(tenant: string) {
  const { data, error } = await publicClient()
    .from("categories")
    .select("id,slug,name,icon")
    .eq("marketplace_id", tenant)
    .eq("status", "active")
    .order("sort_order")
    .order("name");
  if (error)
    throw new AppError(
      503,
      "CATALOG_UNAVAILABLE",
      "The catalog is temporarily unavailable.",
    );
  return data || [];
}
