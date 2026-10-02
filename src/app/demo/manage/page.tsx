import Link from "next/link";
import { notFound } from "next/navigation";
import { demoEnabled } from "@/lib/supabase/config";
import { OwnerOverview } from "@/components/owner-overview";
export default function Page() {
  if (!demoEnabled()) notFound();
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="brand" href="/demo/create">
          GoXAvni.
        </Link>
        <p className="workspace-label">OWNER WORKSPACE</p>
        <nav>
          <Link className="active" href="/demo/manage">
            Overview
          </Link>
          <Link href="/demo/create">Try setup wizard</Link>
          <Link href="/demo/m/goxavni/owner">Explore demo workspace</Link>
        </nav>
      </aside>
      <div className="workspace-body">
        <header className="workspace-top">
          <span>North & Found</span>
          <span className="status">DEMO DATA</span>
        </header>
        <main className="workspace-content">
          <p className="info-banner">
            Read-only dashboard preview. Management links require a real
            signed-in account.
          </p>
          <OwnerOverview
            m={{
              id: "demo",
              slug: "north-and-found",
              name: "North & Found",
              tagline: "Objects for a life well lived.",
              mode: "HYBRID",
              accent: "#27624c",
              currency: "USD",
              status: "draft",
              description: "A considered collection",
              hero_heading: "Good finds, made for you.",
              branding_completed_at: "2026-10-01",
            }}
            counts={{
              products: 0,
              activeProducts: 0,
              sellers: 1,
              pending: 0,
              categories: 0,
            }}
          />
        </main>
      </div>
    </div>
  );
}
