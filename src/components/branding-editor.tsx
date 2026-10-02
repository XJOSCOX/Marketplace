"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicMarketplace } from "@/domain/catalog";
import { commerceMutation } from "@/lib/client-api";
import { ImageUpload } from "./management-actions";
export function BrandingEditor({
  m,
  store = false,
}: {
  m: PublicMarketplace;
  store?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="management-split">
      <form
        className="form-card"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            await commerceMutation(`/api/v1/marketplaces/${m.id}/branding`, {
              name: f.get("name"),
              tagline: f.get("tagline"),
              description: f.get("description"),
              location: f.get("location"),
              accent: f.get("accent"),
              heroHeading: f.get("heroHeading"),
              heroDescription: f.get("heroDescription"),
            });
            await commerceMutation(`/api/v1/marketplaces/${m.id}/setup`, {
              action: store ? "store" : "branding",
            });
            setMessage("Saved. Your storefront reflects these changes.");
            router.refresh();
          } catch (error) {
            setMessage((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>
          {store
            ? "A little more about your business."
            : "A storefront that feels like you."}
        </h2>
        <label>
          Marketplace name
          <input name="name" defaultValue={m.name} required maxLength={120} />
        </label>
        <label>
          Tagline
          <input name="tagline" defaultValue={m.tagline} maxLength={300} />
        </label>
        <label>
          Store description
          <textarea
            name="description"
            defaultValue={m.description}
            required
            maxLength={5000}
          />
        </label>
        <label>
          Business location (optional)
          <input name="location" defaultValue={m.location} maxLength={200} />
        </label>
        <label>
          Accent color
          <input name="accent" type="color" defaultValue={m.accent} />
        </label>
        <label>
          Hero heading
          <input
            name="heroHeading"
            defaultValue={m.hero_heading || m.name}
            required
            maxLength={160}
          />
        </label>
        <label>
          Hero description
          <textarea
            name="heroDescription"
            defaultValue={m.hero_description || m.tagline}
            maxLength={500}
          />
        </label>
        <button className="button" disabled={busy}>
          {busy
            ? "Saving…"
            : store
              ? "Save store information"
              : "Save branding"}
        </button>
        {message && (
          <p role="status" className="form-feedback">
            {message}
          </p>
        )}
      </form>
      <aside className="panel">
        <div className="brand-preview" style={{ borderTopColor: m.accent }}>
          {m.logo_path && (
            <Image
              unoptimized
              src={`/api/v1/marketplaces/${m.id}/assets?v=${encodeURIComponent(m.logo_path)}`}
              width={80}
              height={80}
              alt="Marketplace logo"
            />
          )}
          <p className="eyebrow">YOUR BRAND</p>
          <h2>{m.name}</h2>
          <p>{m.tagline}</p>
          <span className="color-dot" style={{ background: m.accent }} />{" "}
          {m.accent}
        </div>
        <ImageUpload tenant={m.id} />
        <p className="muted">
          A simple identity, a memorable experience. Your logo appears in the
          storefront header.
        </p>
      </aside>
    </div>
  );
}
