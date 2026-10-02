"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicMarketplace } from "@/domain/catalog";
export function LiveMarketplaceForm({
  m,
  commission,
}: {
  m: PublicMarketplace;
  commission: number;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <form
      className="form-card"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setPending(true);
        try {
          const response = await fetch(
            `/api/v1/marketplaces/${m.id}/settings`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: data.get("name"),
                tagline: data.get("tagline"),
                mode: data.get("mode"),
                accent: data.get("accent"),
                commissionBasisPoints: Number(data.get("commission")),
              }),
            },
          );
          const json = await response.json();
          setMessage(
            response.ok ? "Marketplace settings saved." : json.error.message,
          );
          if (response.ok) router.refresh();
        } catch {
          setMessage("Could not save settings.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        Marketplace name
        <input name="name" defaultValue={m.name} required maxLength={120} />
      </label>
      <label>
        Tagline
        <input name="tagline" defaultValue={m.tagline} maxLength={300} />
      </label>
      <label>
        Operating mode
        <select name="mode" defaultValue={m.mode}>
          <option>STORE</option>
          <option>MARKETPLACE</option>
          <option>HYBRID</option>
        </select>
      </label>
      <label>
        Brand accent
        <input name="accent" type="color" defaultValue={m.accent} />
      </label>
      <label>
        Commission in basis points (100 = 1%)
        <input
          name="commission"
          type="number"
          min="0"
          max="10000"
          step="1"
          defaultValue={commission}
          required
        />
      </label>
      <p className="muted">
        Only the marketplace owner or platform administrator may change these
        settings. No funds are processed.
      </p>
      <button className="button" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
      {message && (
        <p role="status" className="info-banner">
          {message}
        </p>
      )}
    </form>
  );
}
