import Link from "next/link";
import type { PublicMarketplace } from "@/domain/catalog";
import { onboardingProgress } from "@/domain/management";
import { SetupButton, ShareStorefront } from "./management-actions";
export function OwnerOverview({
  m,
  counts,
  demo = false,
}: {
  m: PublicMarketplace;
  counts: {
    products: number;
    activeProducts: number;
    sellers: number;
    pending: number;
    categories: number;
  };
  demo?: boolean;
}) {
  const base = `${demo ? "/demo" : ""}/m/${m.slug}/owner`;
  const { steps, percent } = onboardingProgress(m, counts);
  return (
    <>
      <section className="owner-welcome">
        <div>
          <p className="eyebrow">BUILD SOMETHING YOUR OWN</p>
          <h2>
            {m.status === "active"
              ? "Your marketplace, in motion."
              : "Let’s bring your storefront to life."}
          </h2>
          <p>
            {m.name} · {m.mode} ·{" "}
            <strong>
              {m.status === "active" ? "Published" : "Private draft"}
            </strong>
          </p>
        </div>
        <Link className="button secondary" href={`${base}/preview`}>
          Preview storefront ↗
        </Link>
      </section>
      <div className="stats">
        {[
          ["Total products", counts.products],
          ["Active products", counts.activeProducts],
          ["Active sellers", counts.sellers],
          ["Pending applications", counts.pending],
        ].map(([label, n]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{n}</strong>
            <small>In your marketplace</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel onboarding-checklist">
          <div className="section-heading">
            <h2>Your launch checklist</h2>
            <strong>{percent}%</strong>
          </div>
          <progress
            value={percent}
            max={100}
            aria-label="Onboarding completion"
          />
          {steps.map((s) => (
            <Link
              key={s.label}
              href={base + s.path}
              className={`checklist-item ${s.done ? "done" : ""}`}
            >
              <span>{s.done ? "✓" : "○"}</span>
              <span>{s.label}</span>
              <span>↗</span>
            </Link>
          ))}
          {m.mode === "MARKETPLACE" && (
            <p className="muted">
              Publish your marketplace first, then invite sellers. You don’t
              need to create owner inventory.
            </p>
          )}
        </section>
        <div className="management-list">
          <section className="panel">
            <h2>Your next move</h2>
            <div className="quick-actions">
              {(m.mode === "MARKETPLACE"
                ? [
                    ["/sellers", "Manage sellers"],
                    ["/categories", "Add category"],
                    ["/branding", "Customize storefront"],
                  ]
                : [
                    ["/listing", "Add product"],
                    ["/categories", "Add category"],
                    ["/branding", "Customize storefront"],
                    ["/sellers", "Manage sellers"],
                  ]
              ).map(([path, label]) => (
                <Link key={path} href={base + path}>
                  {label} <span>→</span>
                </Link>
              ))}
            </div>
          </section>
          <section className="panel">
            <h3>Orders & revenue</h3>
            <p className="muted">
              Coming with a future checkout release. No payments or transactions
              are processed yet.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
export function PublishPanel({ m }: { m: PublicMarketplace }) {
  return (
    <div className="form-card">
      <p className="eyebrow">OPEN YOUR DOORS</p>
      <h2>
        {m.status === "active"
          ? "Your storefront is live."
          : "Ready for your first visitors?"}
      </h2>
      <p className="muted">
        Publishing makes your eligible products and branding visible to
        everyone. Checkout remains unavailable.
      </p>
      <p className="url-preview">/m/{m.slug}</p>
      {m.status === "active" && (
        <Link className="button secondary" href={`/m/${m.slug}`}>
          Open & share storefront ↗
        </Link>
      )}
      <>{m.status === "active" && <ShareStorefront href={`/m/${m.slug}`} />}</>
      <SetupButton
        tenant={m.id}
        action={m.status === "active" ? "unpublish" : "publish"}
      >
        {m.status === "active"
          ? "Return to private draft"
          : "Publish marketplace"}
      </SetupButton>
      <p className="muted">
        Complete branding, store information, a category and a preview first.
        Stores and hybrid marketplaces also need an active owner product.
      </p>
    </div>
  );
}
