import { notFound } from "next/navigation";
import { demoEnabled } from "@/lib/supabase/config";
import { CommerceApp } from "@/components/commerce-app";
import Link from "next/link";
export default async function Page({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  if (!demoEnabled()) notFound();
  const { segments = [] } = await params;
  const admin = segments[0] === "admin";
  const tenant = admin ? "goxavni" : segments[1] || "goxavni";
  return (
    <>
      <div className="info-banner" role="status">
        DEMO WORKSPACE · No authentication or database access. Changes affect
        only local sample data.{" "}
        <Link href="/auth/sign-in">Sign in to the real workspace →</Link>
      </div>
      <CommerceApp
        tenant={tenant}
        segments={admin ? segments.slice(1) : segments.slice(2)}
        admin={admin}
      />
    </>
  );
}
