"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { commerceMutation } from "@/lib/client-api";
type Seller = {
  id: string;
  name: string;
  description: string;
  status: string;
  user_id?: string;
};
const labels: Record<string, string> = {
  pending: "Pending review",
  active: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};
export function SellerApplications({
  tenant,
  sellers,
  userId,
  ownerId,
}: {
  tenant: string;
  sellers: Seller[];
  userId: string;
  ownerId?: string;
}) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <>
      <p className="muted">
        Approve businesses you want to welcome. Decisions apply only to this
        marketplace.
      </p>
      {message && (
        <p role="status" className="info-banner">
          {message}
        </p>
      )}
      <div className="management-list">
        {sellers.length ? (
          sellers.map((s) => (
            <article className="seller-application panel" key={s.id}>
              <div>
                <span className="status">{labels[s.status]}</span>
                <h3>{s.name}</h3>
                <p>{s.description || "No business description provided."}</p>
              </div>
              {s.user_id !== userId && s.user_id !== ownerId && (
                <div className="form-actions">
                  {[
                    ["active", "Approve"],
                    ["rejected", "Reject"],
                    ["suspended", "Suspend"],
                  ]
                    .filter(([v]) => v !== s.status)
                    .map(([decision, label]) => (
                      <button
                        className="button secondary"
                        key={decision}
                        disabled={!!busy}
                        onClick={async () => {
                          setBusy(s.id);
                          setMessage("");
                          try {
                            await commerceMutation(
                              `/api/v1/marketplaces/${tenant}/sellers`,
                              { sellerId: s.id, decision },
                              "PATCH",
                            );
                            setMessage("Seller status updated.");
                            router.refresh();
                          } catch (error) {
                            setMessage((error as Error).message);
                          } finally {
                            setBusy("");
                          }
                        }}
                      >
                        {busy === s.id ? "Saving…" : label}
                      </button>
                    ))}
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="panel">
            <h3>Make room for great businesses.</h3>
            <p>
              No seller applications yet. Share your published storefront to
              invite sellers.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
export function SellerApplication({
  tenant,
  slug,
  application,
}: {
  tenant: string;
  slug: string;
  application: Seller | null;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  if (application)
    return (
      <section className="form-card">
        <span className="status">{labels[application.status]}</span>
        <h2>{application.name}</h2>
        <p>
          {application.status === "pending"
            ? "Your application is with the marketplace team. Check back here for their decision."
            : application.status === "active"
              ? "You’re ready to create your first listing."
              : "Please contact the marketplace team about your application."}
        </p>
        {application.status === "active" && (
          <Link className="button" href={`/m/${slug}/seller`}>
            Open seller studio →
          </Link>
        )}
      </section>
    );
  return (
    <form
      className="form-card"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          await commerceMutation(`/api/v1/marketplaces/${tenant}/sellers`, {
            name: f.get("name"),
            description: f.get("description"),
          });
          router.refresh();
        } catch (error) {
          setMessage((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Bring your business to a new audience.</h2>
      <label>
        Business / store name
        <input name="name" required maxLength={120} />
      </label>
      <label>
        Tell us about your business
        <textarea name="description" required maxLength={10000} />
      </label>
      <p className="muted">
        The marketplace team will review your application before you can publish
        products.
      </p>
      <button className="button" disabled={busy}>
        {busy ? "Submitting…" : "Apply to sell"}
      </button>
      {message && (
        <p role="alert" className="info-banner">
          {message}
        </p>
      )}
    </form>
  );
}
