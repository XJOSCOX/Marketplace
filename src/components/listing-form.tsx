"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Marketplace, Product } from "@/domain/models";
import { categories } from "@/data/mock";
import { useCommerce } from "./commerce-provider";
import { Empty, Heading } from "./ui";
export function Listing({
  m,
  sellerId,
  product,
  editing,
  base,
}: {
  m: Marketplace;
  sellerId: string;
  product?: Product;
  editing: boolean;
  base: string;
}) {
  const { update, notify } = useCommerce();
  const router = useRouter();
  if (editing && !product)
    return (
      <Empty
        title="Listing not found"
        text="This listing does not belong to the selected seller."
        href={`${base}/products`}
        action="Back to products"
      />
    );
  return (
    <>
      <Heading
        eyebrow="SELLER STUDIO"
        title={product ? "Edit your listing" : "Make your next good find."}
        text="A great listing starts with a clear story."
      />
      <form
        className="form-card wide-form"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const id = product?.id || `${m.id}-${crypto.randomUUID()}`;
          const price = Number(data.get("price"));
          const item: Product = {
            id,
            marketplaceId: m.id,
            sellerId,
            name: String(data.get("name")),
            description: String(data.get("description")),
            categoryId: String(data.get("category")),
            price,
            image:
              product?.image ||
              "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=85",
            color: "#e8e8e0",
            rating: product?.rating || 0,
            reviewCount: product?.reviewCount || 0,
            status: String(data.get("status")) as Product["status"],
            variants: product
              ? product.variants.map((v, i) => ({
                  ...v,
                  price: i === 0 ? price : v.price,
                  stock: i === 0 ? Number(data.get("stock")) : v.stock,
                }))
              : [
                  {
                    id: `${id}-v0`,
                    productId: id,
                    marketplaceId: m.id,
                    name: "Original",
                    sku: `NEW-${id.slice(-6)}`,
                    price,
                    stock: Number(data.get("stock")),
                  },
                ],
          };
          update((s) => ({
            ...s,
            products: product
              ? s.products.map((p) =>
                  p.id === id && p.marketplaceId === m.id ? item : p,
                )
              : [...s.products, item],
          }));
          notify(product ? "Listing updated" : "Listing created");
          router.push(`${base}/products`);
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
            required
            rows={4}
          />
        </label>
        <div className="form-columns">
          <label>
            Base price (USD)
            <input
              name="price"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={product?.price || 25}
              required
            />
          </label>
          <label>
            Original edition stock
            <input
              name="stock"
              type="number"
              min="0"
              step="1"
              defaultValue={product?.variants[0].stock ?? 10}
              required
            />
          </label>
        </div>
        <label>
          Category
          <select name="category" defaultValue={product?.categoryId}>
            {categories
              .filter((c) => c.marketplaceId === m.id)
              .map((c) => (
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
        <p className="muted">
          New listings use a sample product photograph. Uploads will be added
          with object storage.
        </p>
        <div className="form-actions">
          <button className="button">Save listing</button>
          <Link href={`${base}/products`}>Cancel</Link>
        </div>
      </form>
    </>
  );
}
