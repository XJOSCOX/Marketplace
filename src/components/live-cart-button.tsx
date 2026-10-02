"use client";
import { useState } from "react";
import type { CatalogProduct } from "@/domain/catalog";
import { formatAmount } from "@/domain/api";
export function AddToCart({
  tenant,
  product,
}: {
  tenant: string;
  product: CatalogProduct;
}) {
  const [variant, setVariant] = useState(product.variants[0]?.id || "");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      style={{ margin: "25px 0" }}
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          const result = await fetch(`/api/v1/marketplaces/${tenant}/cart`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ variantId: variant, quantity: 1 }),
          });
          const json = await result.json();
          setMessage(result.ok ? "Added to your bag." : json.error.message);
        } catch {
          setMessage("Unable to update your bag. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        Edition
        <select value={variant} onChange={(e) => setVariant(e.target.value)}>
          {product.variants.map((v) => (
            <option key={v.id} value={v.id} disabled={!v.stock}>
              {v.name} · {formatAmount(v.priceAmount, v.currency)} · {v.stock}{" "}
              available
            </option>
          ))}
        </select>
      </label>
      <button
        className="button"
        style={{ marginTop: 15 }}
        disabled={
          pending ||
          !product.variants.some((v) => v.id === variant && v.stock > 0)
        }
      >
        {pending ? "Adding…" : "Add to bag"}
      </button>
      {message && (
        <p role="status" className="info-banner" style={{ marginTop: 15 }}>
          {message}
        </p>
      )}
    </form>
  );
}
