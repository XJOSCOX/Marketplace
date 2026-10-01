"use client";
import type { Marketplace } from "@/domain/models";
import { sellers } from "@/data/mock";
import { useCommerce } from "./commerce-provider";
import { Icon } from "./ui";
export function Settings({
  m,
  area,
  page,
  sellerId,
}: {
  m: Marketplace;
  area: string;
  page: string;
  sellerId: string;
}) {
  const { state, update, notify } = useCommerce();
  const key = `${m.id}-${area}-${page}-${area === "seller" ? sellerId : ""}`;
  const settings = state.settings[key] || {};
  return (
    <form
      className="form-card"
      onSubmit={(e) => {
        e.preventDefault();
        const values = Object.fromEntries(
          new FormData(e.currentTarget),
        ) as Record<string, string>;
        update((s) => ({
          ...s,
          settings: { ...s.settings, [key]: values },
          marketplaces: s.marketplaces.map((t) =>
            t.id !== m.id
              ? t
              : {
                  ...t,
                  ...(page === "setup"
                    ? {
                        name: values.name,
                        tagline: values.tagline,
                        mode: values.mode as Marketplace["mode"],
                      }
                    : {}),
                  ...(page === "branding"
                    ? { name: values.name, accent: values.accent }
                    : {}),
                  ...(page === "commission"
                    ? { commission: Number(values.commission) }
                    : {}),
                },
          ),
        }));
        notify("Changes saved to this demo browser");
      }}
    >
      <h2>
        {page === "settings"
          ? "Seller details"
          : page === "branding"
            ? "Make it your own"
            : page === "commission"
              ? "Commission model"
              : page === "store-settings"
                ? "Store preferences"
                : "Marketplace essentials"}
      </h2>
      {page === "setup" || page === "branding" ? (
        <label>
          Marketplace name
          <input name="name" required defaultValue={m.name} />
        </label>
      ) : null}
      {page === "setup" && (
        <>
          <label>
            Tagline
            <input name="tagline" required defaultValue={m.tagline} />
          </label>
          <label>
            Operating mode
            <select name="mode" defaultValue={m.mode}>
              <option value="STORE">STORE — owner products only</option>
              <option value="MARKETPLACE">
                MARKETPLACE — third-party products only
              </option>
              <option value="HYBRID">
                HYBRID — owner and third-party products
              </option>
            </select>
          </label>
          <p className="muted">
            Mode changes determine which sellers’ products appear in your
            storefront. Existing catalog data is retained.
          </p>
        </>
      )}
      {page === "branding" && (
        <>
          <label>
            Brand accent
            <input type="color" name="accent" defaultValue={m.accent} />
          </label>
          <p className="muted">
            Your name and accent apply to the storefront and workspace.
          </p>
        </>
      )}
      {page === "commission" && (
        <>
          <label>
            Platform commission (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              name="commission"
              defaultValue={m.commission}
              required
            />
          </label>
          <p className="muted">
            A configuration preview for future seller settlements. No funds are
            processed.
          </p>
        </>
      )}
      {page === "store-settings" && (
        <>
          <label>
            Support email
            <input
              type="email"
              required
              name="support"
              defaultValue={settings.support || "hello@example.com"}
            />
          </label>
          <label>
            Shipping policy
            <textarea
              name="shipping"
              defaultValue={
                settings.shipping || "Orders ship within 2–3 business days."
              }
            />
          </label>
          <label>
            Returns policy
            <textarea
              name="returns"
              defaultValue={
                settings.returns ||
                "Contact the seller within 30 days of delivery."
              }
            />
          </label>
        </>
      )}
      {page === "settings" && (
        <>
          <label>
            Contact name
            <input
              name="contact"
              required
              defaultValue={
                settings.contact || sellers.find((s) => s.id === sellerId)?.name
              }
            />
          </label>
          <label>
            Support email
            <input
              name="email"
              type="email"
              required
              defaultValue={settings.email || "studio@example.com"}
            />
          </label>
          <label>
            Seller bio
            <textarea
              name="bio"
              defaultValue={
                settings.bio ||
                "Thoughtfully made essentials for everyday living."
              }
            />
          </label>
        </>
      )}
      <button className="button">
        Save changes <Icon name="check" />
      </button>
    </form>
  );
}
