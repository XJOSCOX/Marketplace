"use client";
import Image from "next/image";
import { useState } from "react";
import { dollarsToMinor, minorToDollars } from "@/domain/management";
import { ImageUpload } from "./management-actions";
import { useRouter } from "next/navigation";
export interface EditableListing {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_amount: string;
  status: string;
  stock: number;
  sku: string;
  seller_id: string;
  image_path?: string | null;
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
                priceAmount: dollarsToMinor(String(data.get("amount"))),
                sku: data.get("sku") || undefined,
                stock: Number(data.get("stock")),
                status: data.get("status"),
              }),
            },
          );
          const json = await response.json();
          if (response.ok) {
            router.push(base + "/listing/" + json.data.id);
            setMessage("Listing saved. You can now upload its primary image.");
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
        Price (USD)
        <input
          name="amount"
          inputMode="decimal"
          pattern="[0-9]+([.][0-9]{1,2})?"
          defaultValue={minorToDollars(product?.price_amount || "2500")}
          required
        />
      </label>
      <label>
        Original edition stock
        <input
          name="stock"
          type="number"
          min="0"
          max="1000000"
          step="1"
          defaultValue={product?.stock ?? 10}
          required
        />
      </label>
      <label>
        SKU
        <input
          name="sku"
          maxLength={80}
          pattern="[A-Za-z0-9._-]+"
          defaultValue={product?.sku}
          placeholder="Automatically generated if blank"
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
          <option value="active">Published product</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      {product?.image_path && (
        <Image
          className="editor-image"
          src={`/api/v1/marketplaces/${tenant}/assets?productId=${product.id}&v=${encodeURIComponent(product.image_path)}`}
          unoptimized
          width={240}
          height={200}
          alt={product.name}
        />
      )}
      {product ? (
        <ImageUpload tenant={tenant} productId={product.id} />
      ) : (
        <div className="logo-placeholder">
          ✳<small>Save your listing, then upload a product photo.</small>
        </div>
      )}
      <button className="button" disabled={pending || !categories.length}>
        {pending ? "Saving…" : "Save listing"}
      </button>
      {!categories.length && (
        <p className="info-banner">
          Add an active category before creating a product.
        </p>
      )}
      {message && (
        <p role="alert" className="info-banner">
          {message}
        </p>
      )}
    </form>
  );
}
