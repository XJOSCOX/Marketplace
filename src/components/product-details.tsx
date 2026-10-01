"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Marketplace, Product } from "@/domain/models";
import { reviews, sellers } from "@/data/mock";
import { money } from "@/domain/commerce";
import { useCommerce } from "./commerce-provider";
import { Icon } from "./ui";

export function ProductDetails({
  m,
  product: p,
}: {
  m: Marketplace;
  product: Product;
}) {
  const { state, update, notify } = useCommerce();
  const [variantId, setVariant] = useState(p.variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const v = p.variants.find((v) => v.id === variantId)!;
  const base = `/m/${m.slug}`;
  function add() {
    const existing = state.cart.find(
      (i) => i.variantId === v.id && i.marketplaceId === m.id,
    );
    if ((existing?.quantity || 0) + quantity > v.stock)
      return notify("That quantity exceeds the available stock.");
    update((s) => ({
      ...s,
      cart: existing
        ? s.cart.map((i) =>
            i.variantId === v.id && i.marketplaceId === m.id
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          )
        : [
            ...s.cart,
            { marketplaceId: m.id, productId: p.id, variantId: v.id, quantity },
          ],
    }));
    notify("Added to your bag");
  }
  return (
    <div className="page section">
      <p className="breadcrumbs">
        <Link href={base}>Home</Link> /{" "}
        <Link href={`${base}/products`}>Discover</Link> / {p.name}
      </p>
      <div className="detail-grid">
        <div className="detail-photo">
          <Image
            src={p.image}
            alt={p.name}
            fill
            sizes="(max-width: 700px) 100vw, 50vw"
            priority
          />
        </div>
        <div className="detail-copy">
          <Link className="eyebrow" href={`${base}/store/${p.sellerId}`}>
            {sellers.find((s) => s.id === p.sellerId)?.name} ↗
          </Link>
          <h1>{p.name}</h1>
          <p className="rating">
            ★ {p.rating.toFixed(1)}{" "}
            <span className="muted">· {p.reviewCount} mock ratings</span>
          </p>
          <h2>{money(v.price)}</h2>
          <p className="muted description">{p.description}</p>
          <label>
            Edition
            <select value={v.id} onChange={(e) => setVariant(e.target.value)}>
              {p.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {money(v.price)}
                </option>
              ))}
            </select>
          </label>
          <div className="purchase">
            <label>
              Quantity
              <input
                type="number"
                min="1"
                max={v.stock}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.max(
                      1,
                      Math.min(
                        v.stock,
                        Math.floor(Number(e.target.value)) || 1,
                      ),
                    ),
                  )
                }
              />
            </label>
            <button className="button" onClick={add} disabled={!v.stock}>
              Add to bag <Icon name="bag" />
            </button>
          </div>
          <p className="stock">
            ● {v.stock} available · Ships in 2–3 business days
          </p>
          <Link className="text-link" href={`${base}/cart`}>
            View your bag <Icon name="arrow" />
          </Link>
          <div className="detail-note">
            <Icon name="box" /> Thoughtfully packed. Delivered with care.
            <br />
            Demo shipping and return details.
          </div>
        </div>
      </div>
      <section className="section">
        <h2>A word from the community</h2>
        {reviews
          .filter((r) => r.marketplaceId === m.id && r.productId === p.id)
          .map((r) => (
            <blockquote className="review" key={r.id}>
              <span>★★★★★</span>
              <p>{r.body}</p>
              <small>Noah W. · Sample review</small>
            </blockquote>
          ))}
      </section>
    </div>
  );
}
