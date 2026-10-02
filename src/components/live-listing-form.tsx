"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export interface EditableListing {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_amount: string;
  status: string;
  stock: number;
}
export function LiveListingForm({
  tenant,
  seller,
  base,
  categories,
  product,
}: {
  tenant: string;
  seller: string;
  base: string;
  categories: { id: string; name: string }[];
  product?: EditableListing;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <form
      className="form-card wide-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const data = new FormData(e.currentTarget);
        try {
          const response = await fetch(
            `/api/v1/marketplaces/${tenant}/listings`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sellerId: seller,
                productId: product?.id,
                categoryId: data.get("category"),
                name: data.get("name"),
                description: data.get("description"),
                priceAmount: data.get("amount"),
                stock: Number(data.get("stock")),
                status: data.get("status"),
              }),
            },
          );
          const json = await response.json();
          if (response.ok) {
            router.push(base + "/products");
            router.refresh();
          } else setMessage(json.error.message);
        } catch {
          setMessage("Could not save the listing. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        Product name
        <input
          name="name"
          defaultValue={product?.name}
          required
          maxLength={120}
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          defaultValue={product?.description}
          maxLength={10000}
          required
        />
      </label>
      <label>
        Price in integer minor units (USD cents)
        <input
          name="amount"
          inputMode="numeric"
          pattern="[0-9]+"
          defaultValue={product?.price_amount || "2500"}
          required
        />
      </label>
      <label>
        Original edition stock
        <input
          name="stock"
          type="number"
          min="0"
          max="2147483647"
          step="1"
          defaultValue={product?.stock ?? 10}
          required
        />
      </label>
      <label>
        Category
        <select name="category" defaultValue={product?.category_id} required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Visibility
        <select name="status" defaultValue={product?.status || "draft"}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
        </select>
      </label>
      <button className="button" disabled={pending}>
        {pending ? "Saving…" : "Save listing"}
      </button>
      {message && (
        <p role="alert" className="info-banner">
          {message}
        </p>
      )}
    </form>
  );
}
