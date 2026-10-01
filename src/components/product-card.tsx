"use client";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/domain/models";
import { sellers } from "@/data/mock";
import { money } from "@/domain/commerce";
import { useCommerce } from "./commerce-provider";
import { Icon } from "./ui";
export function ProductCard({
  product: p,
  base,
}: {
  product: Product;
  base: string;
}) {
  const { state, update } = useCommerce();
  const favorite = state.favorites.includes(p.id);
  return (
    <article className="product-card">
      <div className="product-photo" style={{ background: p.color }}>
        <Link href={`${base}/product/${p.id}`}>
          <Image
            src={p.image}
            alt={p.name}
            fill
            sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
          />
        </Link>
        {p.badge && <span className="product-badge">{p.badge}</span>}
        <button
          className={`favorite ${favorite ? "selected" : ""}`}
          aria-label={`${favorite ? "Remove" : "Save"} ${p.name} ${favorite ? "from" : "to"} favorites`}
          aria-pressed={favorite}
          onClick={() =>
            update((s) => ({
              ...s,
              favorites: favorite
                ? s.favorites.filter((id) => id !== p.id)
                : [...s.favorites, p.id],
            }))
          }
        >
          <Icon name="heart" size={18} />
        </button>
      </div>
      <div className="product-meta">
        <Link href={`${base}/store/${p.sellerId}`}>
          {sellers.find((s) => s.id === p.sellerId)?.name}
        </Link>
        <span>
          ★ <b>{p.rating.toFixed(1)}</b> <small>({p.reviewCount})</small>
        </span>
      </div>
      <Link className="product-title" href={`${base}/product/${p.id}`}>
        {p.name}
      </Link>
      <p className="product-price">
        {money(p.price)} <span>USD</span>
      </p>
    </article>
  );
}
