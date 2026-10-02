"use client";
import Image from "next/image";
import Link from "./demo-link";
import type { Marketplace } from "@/domain/models";
import { sellers } from "@/data/mock";
import { cartLines, catalogFor, money } from "@/domain/commerce";
import { useCommerce } from "./commerce-provider";
import { Empty, Heading, Icon } from "./ui";

export function CartPage({
  m,
  checkout = false,
}: {
  m: Marketplace;
  checkout?: boolean;
}) {
  const { state, update } = useCommerce();
  const lines = cartLines(
    state.cart,
    catalogFor(m, state.products, sellers),
    m.id,
  );
  const stockIssue = lines.some(
    (line) => line.quantity > line.variant.stock || line.variant.stock === 0,
  );
  const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const base = `/m/${m.slug}`;
  return (
    <div className="page section">
      <Heading
        eyebrow="GOOD CHOICES"
        title={checkout ? "Checkout preview" : "Your shopping bag"}
        text={
          checkout
            ? "Explore the checkout experience. No order will be placed and no payment is collected."
            : `${lines.length} little reasons to love your everyday.`
        }
      />
      {!lines.length ? (
        <Empty
          title="Your next favorite is waiting"
          text="Explore the marketplace and add something good to your bag."
          href={`${base}/products`}
        />
      ) : (
        <div className="cart-grid">
          <div>
            {checkout && (
              <div className="info-banner">
                Checkout is a placeholder. Address, payment, and order
                submission will arrive with the backend.
              </div>
            )}
            {stockIssue && (
              <p role="alert" className="info-banner">
                Stock has changed. Reduce quantities to available stock or
                remove unavailable items before continuing.
              </p>
            )}
            {lines.map((l) => (
              <div className="cart-row" key={l.variantId}>
                <Image
                  src={l.product.image}
                  alt={l.product.name}
                  width={100}
                  height={110}
                />
                <div>
                  <Link href={`${base}/product/${l.product.id}`}>
                    <strong>{l.product.name}</strong>
                  </Link>
                  <p className="muted">
                    {l.variant.name} · {money(l.variant.price)}
                  </p>
                  {l.quantity > l.variant.stock && (
                    <p className="muted">Only {l.variant.stock} available</p>
                  )}
                  <button
                    className="text-button"
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        cart: s.cart.filter(
                          (i) =>
                            !(
                              i.marketplaceId === m.id &&
                              i.variantId === l.variantId
                            ),
                        ),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
                <label className="quantity-label">
                  Qty
                  <input
                    aria-label={`Quantity for ${l.product.name}`}
                    type="number"
                    min="1"
                    max={l.variant.stock}
                    value={l.quantity}
                    onChange={(e) =>
                      update((s) => ({
                        ...s,
                        cart: s.cart.map((i) =>
                          i.marketplaceId === m.id &&
                          i.variantId === l.variantId
                            ? {
                                ...i,
                                quantity: Math.max(
                                  1,
                                  Math.min(
                                    l.variant.stock,
                                    Math.floor(Number(e.target.value)) || 1,
                                  ),
                                ),
                              }
                            : i,
                        ),
                      }))
                    }
                  />
                </label>
                <strong>{money(l.subtotal)}</strong>
              </div>
            ))}
          </div>
          <aside className="summary-card">
            <h2>Order summary</h2>
            <div>
              <span>Subtotal</span>
              <b>{money(total)}</b>
            </div>
            <div>
              <span>Shipping & taxes</span>
              <span>At checkout</span>
            </div>
            <div className="summary-total">
              <span>Estimated total</span>
              <b>{money(total)}</b>
            </div>
            {stockIssue ? (
              <button disabled className="button">
                Review item availability
              </button>
            ) : checkout ? (
              <button disabled className="button">
                Payments coming later
              </button>
            ) : (
              <Link className="button" href={`${base}/checkout`}>
                Continue to checkout <Icon name="arrow" />
              </Link>
            )}
            <p className="muted">Mock cart · Prices in USD</p>
          </aside>
        </div>
      )}
    </div>
  );
}
