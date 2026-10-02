import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/domain/errors";
export async function workspaceSeller(
  db: SupabaseClient,
  tenant: string,
  userId: string,
) {
  const { data, error } = await db
    .from("sellers")
    .select("id")
    .eq("marketplace_id", tenant)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error)
    throw new AppError(
      503,
      "WORKSPACE_UNAVAILABLE",
      "Seller information is temporarily unavailable.",
    );
  return data;
}
export async function marketplaceCommission(
  db: SupabaseClient,
  tenant: string,
): Promise<number> {
  const { data, error } = await db
    .from("marketplaces")
    .select("commission_basis_points")
    .eq("id", tenant)
    .single();
  if (error)
    throw new AppError(
      503,
      "WORKSPACE_UNAVAILABLE",
      "Settings are temporarily unavailable.",
    );
  return data.commission_basis_points;
}
export async function editableProduct(
  db: SupabaseClient,
  tenant: string,
  seller: string,
  id: string,
) {
  const { data, error } = await db
    .from("secure_products")
    .select("id,category_id,name,description,price_amount,status")
    .eq("marketplace_id", tenant)
    .eq("seller_id", seller)
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new AppError(
      503,
      "WORKSPACE_UNAVAILABLE",
      "Listing information is temporarily unavailable.",
    );
  if (!data) return null;
  const { data: variant, error: variantError } = await db
    .from("secure_product_variants")
    .select("stock")
    .eq("marketplace_id", tenant)
    .eq("product_id", data.id)
    .eq("name", "Original")
    .maybeSingle();
  if (variantError)
    throw new AppError(
      503,
      "WORKSPACE_UNAVAILABLE",
      "Inventory is temporarily unavailable.",
    );
  return {
    ...data,
    price_amount: data.price_amount,
    stock: variant?.stock || 0,
  };
}
// Explicit table/column allowlist: never forward a client-supplied table or arbitrary select.
const views = {
  products: {
    table: "secure_products",
    columns: "id,name,status,price_amount,currency,seller_id",
    labels: [
      "ID",
      "Name",
      "Status",
      "Price amount (minor units)",
      "Currency",
      "Seller",
    ],
  },
  inventory: {
    table: "secure_product_variants",
    columns: "id,name,sku,stock,price_amount,currency",
    labels: [
      "ID",
      "Name",
      "SKU",
      "Stock",
      "Price amount (minor units)",
      "Currency",
    ],
  },
  sellers: {
    table: "sellers",
    columns: "id,name,status,marketplace_id",
    labels: ["ID", "Name", "Status", "Marketplace"],
  },
  orders: {
    table: "secure_orders",
    columns: "id,status,total_amount,currency,created_at",
    labels: [
      "ID",
      "Status",
      "Total amount (minor units)",
      "Currency",
      "Created",
    ],
  },
  "seller-orders": {
    table: "secure_order_items",
    columns: "id,order_id,name,quantity,subtotal_amount,currency,seller_id",
    labels: [
      "ID",
      "Order",
      "Item",
      "Quantity",
      "Subtotal (minor units)",
      "Currency",
      "Seller",
    ],
  },
  customers: {
    table: "marketplace_memberships",
    columns: "user_id,roles,status",
    labels: ["User ID", "Roles", "Status"],
  },
  marketplaces: {
    table: "marketplaces",
    columns: "id,name,mode,status",
    labels: ["ID", "Name", "Mode", "Status"],
  },
  users: {
    table: "profiles",
    columns: "id,display_name,created_at",
    labels: ["ID", "Name", "Created"],
  },
  messages: {
    table: "messages",
    columns: "id,conversation_id,body,created_at",
    labels: ["ID", "Conversation", "Message", "Created"],
  },
} as const;
export async function workspaceRecords(
  db: SupabaseClient,
  page: keyof typeof views,
  tenant?: string,
  sellerId?: string,
  userId?: string,
) {
  const view = views[page];
  let query = db.from(view.table).select(view.columns).order("id").limit(100);
  if (tenant) query = query.eq("marketplace_id", tenant);
  if (sellerId && ["products", "seller-orders"].includes(page))
    query = query.eq("seller_id", sellerId);
  if (sellerId && page === "inventory") {
    const { data, error } = await db
      .from("secure_products")
      .select("id")
      .eq("marketplace_id", tenant!)
      .eq("seller_id", sellerId);
    if (error)
      throw new AppError(
        503,
        "WORKSPACE_UNAVAILABLE",
        "Inventory is temporarily unavailable.",
      );
    if (!data?.length) return { columns: [...view.labels], rows: [] };
    query = query.in(
      "product_id",
      data.map((p) => p.id),
    );
  }
  if (userId && page === "orders") query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error)
    throw new AppError(
      503,
      "WORKSPACE_UNAVAILABLE",
      "Workspace data is temporarily unavailable.",
    );
  const fields = view.columns.split(",");
  return {
    columns: [...view.labels],
    rows: (data || []).map((row) =>
      fields.map((f) => {
        const v = (row as unknown as Record<string, unknown>)[f];
        return Array.isArray(v) ? v.join(", ") : String(v ?? "");
      }),
    ),
  };
}
