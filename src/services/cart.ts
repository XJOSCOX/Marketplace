import "server-only";
import { authContext } from "@/auth/server";
import { requireUuid } from "@/domain/api";
import { AppError } from "@/domain/errors";
import { publicClient } from "@/lib/supabase/server";
export async function readCart(tenant: string, request?: Request) {
  requireUuid(tenant);
  const auth = await authContext(request);
  const user = await auth.requireUser();
  const { data: cart, error } = await auth.db
    .from("carts")
    .select("id")
    .eq("marketplace_id", tenant)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error)
    throw new AppError(
      503,
      "CART_UNAVAILABLE",
      "Your bag is temporarily unavailable.",
    );
  if (!cart) return { items: [], totalAmount: "0", currency: "USD" };
  const { data: items, error: itemsError } = await auth.db
    .from("cart_items")
    .select("id,product_id,variant_id,quantity")
    .eq("marketplace_id", tenant)
    .eq("cart_id", cart.id);
  if (itemsError)
    throw new AppError(
      503,
      "CART_UNAVAILABLE",
      "Your bag is temporarily unavailable.",
    );
  const ids = (items || []).map((i) => i.variant_id);
  const { data: variants, error: variantError } = ids.length
    ? await publicClient()
        .from("catalog_variants")
        .select("*")
        .eq("marketplace_id", tenant)
        .in("id", ids)
    : { data: [], error: null };
  if (variantError)
    throw new AppError(
      503,
      "CART_UNAVAILABLE",
      "Your bag is temporarily unavailable.",
    );
  const lines = (items || []).map((i) => {
    const v = variants?.find((v) => v.id === i.variant_id);
    return {
      id: i.id,
      productId: i.product_id,
      variantId: i.variant_id,
      name: v?.name || "Unavailable item",
      quantity: i.quantity,
      available: !!v && v.stock >= i.quantity,
      priceAmount: v?.price_amount || "0",
      subtotalAmount: v
        ? (BigInt(v.price_amount) * BigInt(i.quantity)).toString()
        : "0",
      currency: v?.currency || "USD",
    };
  });
  return {
    items: lines,
    totalAmount: lines
      .reduce((sum, i) => sum + BigInt(i.subtotalAmount), 0n)
      .toString(),
    currency: lines[0]?.currency || "USD",
  };
}
export async function addCartItem(
  tenant: string,
  body: Record<string, unknown>,
  request: Request,
) {
  requireUuid(tenant);
  if (
    Object.keys(body).some((k) => !["variantId", "quantity"].includes(k)) ||
    typeof body.variantId !== "string" ||
    !Number.isInteger(body.quantity) ||
    Number(body.quantity) < 1 ||
    Number(body.quantity) > 999
  )
    throw new AppError(
      400,
      "INVALID_CART_ITEM",
      "Supply only a variant UUID and integer quantity from 1 to 999.",
    );
  requireUuid(body.variantId);
  const auth = await authContext(request);
  await auth.requireUser();
  const { data, error } = await auth.db.rpc("add_cart_item", {
    tenant,
    variant: body.variantId,
    quantity_to_add: body.quantity,
  });
  if (error)
    throw new AppError(
      409,
      "ITEM_UNAVAILABLE",
      "The item or requested quantity is unavailable.",
    );
  return { id: data };
}
export async function removeCartItem(
  tenant: string,
  itemId: string,
  request: Request,
) {
  requireUuid(tenant);
  requireUuid(itemId);
  const auth = await authContext(request);
  const user = await auth.requireUser();
  const { data: cart, error: cartError } = await auth.db
    .from("carts")
    .select("id")
    .eq("marketplace_id", tenant)
    .eq("user_id", user.id)
    .maybeSingle();
  if (cartError)
    throw new AppError(
      503,
      "CART_UNAVAILABLE",
      "Your bag could not be updated.",
    );
  if (!cart) return;
  const { error } = await auth.db
    .from("cart_items")
    .delete()
    .eq("marketplace_id", tenant)
    .eq("cart_id", cart.id)
    .eq("id", itemId);
  if (error)
    throw new AppError(
      503,
      "CART_UNAVAILABLE",
      "Your bag could not be updated.",
    );
}
