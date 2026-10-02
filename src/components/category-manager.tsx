"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { commerceMutation } from "@/lib/client-api";
type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  status: string;
  sort_order: number;
};
export function CategoryManager({
  tenant,
  categories,
}: {
  tenant: string;
  categories: Category[];
}) {
  const empty = {
    id: "",
    name: "",
    slug: "",
    icon: "✳",
    status: "active",
    sort_order: 0,
  };
  const [item, setItem] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="management-split">
      <form
        className="form-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            await commerceMutation(
              `/api/v1/marketplaces/${tenant}/categories`,
              {
                id: item.id || undefined,
                name: item.name,
                slug: item.slug,
                icon: item.icon,
                status: item.status,
                sortOrder: item.sort_order,
              },
            );
            setItem(empty);
            setMessage("Category saved.");
            router.refresh();
          } catch (error) {
            setMessage((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{item.id ? "Edit category" : "A place for every good find."}</h2>
        <p className="muted">
          Organize your collection with clear, useful categories.
        </p>
        <label>
          Name
          <input
            required
            maxLength={120}
            value={item.name}
            onChange={(e) => setItem({ ...item, name: e.target.value })}
          />
        </label>
        <label>
          URL slug
          <input
            required
            maxLength={80}
            value={item.slug}
            onChange={(e) => setItem({ ...item, slug: e.target.value })}
          />
        </label>
        <div className="form-columns">
          <label>
            Icon / emoji
            <input
              maxLength={32}
              value={item.icon}
              onChange={(e) => setItem({ ...item, icon: e.target.value })}
            />
          </label>
          <label>
            Display order
            <input
              type="number"
              min={0}
              max={10000}
              value={item.sort_order}
              onChange={(e) =>
                setItem({ ...item, sort_order: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label>
          Status
          <select
            value={item.status}
            onChange={(e) => setItem({ ...item, status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <p className="muted">
          Archiving hides the category and its products from discovery without
          deleting inventory.
        </p>
        <div className="form-actions">
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save category"}
          </button>
          {item.id && (
            <button
              className="button secondary"
              type="button"
              onClick={() => setItem(empty)}
            >
              Cancel
            </button>
          )}
        </div>
        {message && (
          <p role="status" className="form-feedback">
            {message}
          </p>
        )}
      </form>
      <div className="management-list">
        {categories.length ? (
          categories.map((c) => (
            <article className="management-row" key={c.id}>
              <span className="category-symbol">{c.icon}</span>
              <div>
                <strong>{c.name}</strong>
                <small>
                  /{c.slug} · {c.status} · position {c.sort_order}
                </small>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setItem(c);
                  setMessage("");
                }}
              >
                Edit
              </button>
            </article>
          ))
        ) : (
          <div className="panel">
            <h3>Your collection starts here.</h3>
            <p>Add your first category to begin listing products.</p>
          </div>
        )}
      </div>
    </div>
  );
}
