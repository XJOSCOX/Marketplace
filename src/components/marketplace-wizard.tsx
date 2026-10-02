"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { marketplaceInput } from "@/domain/onboarding";
import { commerceMutation } from "@/lib/client-api";
const modes = [
  {
    id: "STORE",
    icon: "⌂",
    title: "Your own store",
    text: "I sell my own products",
    detail: "A home for your brand, your products, your customers.",
  },
  {
    id: "MARKETPLACE",
    icon: "◎",
    title: "A marketplace",
    text: "Other sellers sell through my marketplace",
    detail: "Bring independent businesses together in one destination.",
  },
  {
    id: "HYBRID",
    icon: "✳",
    title: "The best of both",
    text: "I sell my products and allow other sellers",
    detail: "Build your own collection and invite others to grow with you.",
  },
];
export function MarketplaceWizard({ demo = false }: { demo?: boolean }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [data, setData] = useState({
    name: "",
    slug: "",
    tagline: "",
    mode: "STORE",
    description: "",
    location: "",
    accent: "#27624c",
    currency: "USD",
  });
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    if (step > 0) card.current?.focus();
  }, [step]);
  const labels = ["Business", "Type", "Branding", "Currency", "Review"];
  function field(
    key: keyof typeof data,
    label: string,
    max: number,
    required = false,
  ) {
    return (
      <label>
        {label}
        <input
          value={data[key]}
          maxLength={max}
          required={required}
          onChange={(e) => setData({ ...data, [key]: e.target.value })}
        />
      </label>
    );
  }
  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <Link className="brand" href="/">
          GoXAvni<span className="brand-dot">.</span>
        </Link>
        <span className="status">
          {demo ? "DEMO DATA · no account changes" : "LIVE SUPABASE DATA"}
        </span>
      </header>
      <main className="wizard-layout">
        <aside className="wizard-intro">
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h1>Good ideas deserve a great storefront.</h1>
          <p>
            Create a space that feels like you. Start small, make it yours, and
            grow at your own pace.
          </p>
          <ol className="wizard-steps">
            {labels.map((label, i) => (
              <li
                key={label}
                className={i === step ? "current" : i < step ? "complete" : ""}
              >
                <span>{i < step ? "✓" : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <p className="muted">
            No payments or checkout are enabled yet. Your new marketplace starts
            as a private draft.
          </p>
        </aside>
        <section
          className="wizard-card"
          ref={card}
          tabIndex={-1}
          aria-label="Marketplace setup step"
        >
          <div className="wizard-progress">
            <span>STEP {step + 1} OF 5</span>
            <span>{labels[step]}</span>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                if (step === 0) {
                  marketplaceInput(data);
                }
                if (step < 4) {
                  setStep(step + 1);
                  return;
                }
                if (demo) {
                  setError(
                    "This is a demo preview. Sign in to create your real marketplace.",
                  );
                  return;
                }
                marketplaceInput(data);
                setBusy(true);
                const result = await commerceMutation(
                  "/api/v1/marketplaces",
                  data,
                );
                router.push(`/m/${result.slug}/owner`);
                router.refresh();
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {step === 0 && (
              <>
                <h2>Tell us about your business.</h2>
                <p className="muted">You can refine your branding later.</p>
                {field("name", "Marketplace / store name", 120, true)}
                {field("slug", "Your storefront address", 80, true)}
                <p className="url-preview">
                  /m/{data.slug.trim().toLowerCase() || "your-name"}
                </p>
                {field("tagline", "A short tagline", 300)}
              </>
            )}
            {step === 1 && (
              <>
                <h2>How will you sell?</h2>
                <p className="muted">
                  Choose the model that fits your business.
                </p>
                <div className="mode-options">
                  {modes.map((mode) => (
                    <label
                      key={mode.id}
                      className={`mode-option ${data.mode === mode.id ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value={mode.id}
                        checked={data.mode === mode.id}
                        onChange={() => setData({ ...data, mode: mode.id })}
                      />
                      <span className="mode-symbol">{mode.icon}</span>
                      <span>
                        <strong>{mode.title}</strong>
                        <span>{mode.text}</span>
                        <small>{mode.detail}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <h2>Make it feel like you.</h2>
                {field("name", "Marketplace name", 120, true)}
                <div className="logo-placeholder">
                  {data.name.slice(0, 1) || "✳"}
                  <small>Upload your logo in Branding after creation</small>
                </div>
                <label>
                  Accent color
                  <input
                    type="color"
                    value={data.accent}
                    onChange={(e) =>
                      setData({ ...data, accent: e.target.value })
                    }
                  />
                </label>
                <label>
                  Store description
                  <textarea
                    required
                    maxLength={5000}
                    value={data.description}
                    onChange={(e) =>
                      setData({ ...data, description: e.target.value })
                    }
                  />
                </label>
                {field("location", "Business location (optional)", 200)}
              </>
            )}
            {step === 3 && (
              <>
                <h2>A currency for your business.</h2>
                <p className="muted">
                  Your catalog and future orders use this currency.
                </p>
                <label>
                  Currency
                  <select
                    value={data.currency}
                    onChange={(e) =>
                      setData({ ...data, currency: e.target.value })
                    }
                  >
                    <option value="USD">USD — US Dollar</option>
                  </select>
                </label>
                <div className="info-banner">
                  USD is available at launch. Additional currencies will be
                  supported later.
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <h2>Ready to make it yours?</h2>
                <p className="muted">
                  We’ll create a private draft. Review your storefront before
                  publishing.
                </p>
                <div
                  className="brand-preview"
                  style={{ borderTopColor: data.accent }}
                >
                  <span className="eyebrow">
                    {data.mode} · {data.currency}
                  </span>
                  <h3>{data.name}</h3>
                  <p>{data.tagline}</p>
                  <small>/m/{data.slug.trim().toLowerCase()}</small>
                  <p>{data.description}</p>
                  <span
                    className="color-dot"
                    style={{ background: data.accent }}
                  />{" "}
                  {data.accent}
                </div>
              </>
            )}
            {error && (
              <p role="alert" className="info-banner">
                {error}
              </p>
            )}
            <div className="wizard-actions">
              {step > 0 ? (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </button>
              ) : (
                <Link href="/">Save for another day</Link>
              )}
              <button className="button" disabled={busy}>
                {busy
                  ? "Creating…"
                  : step === 4
                    ? "Create marketplace"
                    : "Continue →"}
              </button>
            </div>
            {demo && step === 4 && (
              <Link className="text-link" href="/auth/sign-up?next=/create">
                Create your account →
              </Link>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
