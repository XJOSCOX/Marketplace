import type { CartItem, Marketplace, Product, Seller } from "./models";
export const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
export function sellerAllowed(marketplace: Marketplace, seller: Seller) {
  return (
    seller.marketplaceId === marketplace.id &&
    seller.status === "active" &&
    (marketplace.mode === "HYBRID" ||
      (marketplace.mode === "STORE" ? seller.isOwner : !seller.isOwner))
  );
}
export function catalogFor(
  marketplace: Marketplace,
  products: Product[],
  sellers: Seller[],
) {
  return products.filter(
    (p) =>
      p.marketplaceId === marketplace.id &&
      p.status === "active" &&
      sellers.some((s) => s.id === p.sellerId && sellerAllowed(marketplace, s)),
  );
}
export function cartLines(
  items: CartItem[],
  products: Product[],
  marketplaceId: string,
) {
  return items
    .filter(
      (i) =>
        i.marketplaceId === marketplaceId &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0,
    )
    .flatMap((item) => {
      const product = products.find(
        (p) => p.id === item.productId && p.marketplaceId === marketplaceId,
      );
      const variant = product?.variants.find(
        (v) => v.id === item.variantId && v.marketplaceId === marketplaceId,
      );
      return product && variant
        ? [
            {
              ...item,
              product,
              variant,
              subtotal: variant.price * item.quantity,
            },
          ]
        : [];
    });
}
