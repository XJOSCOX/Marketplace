import { notFound } from "next/navigation";
import { CommerceApp } from "@/components/commerce-app";
export default async function Page({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments = [] } = await params;
  if (
    segments.length > 1 ||
    (segments[0] &&
      ![
        "overview",
        "marketplaces",
        "users",
        "sellers",
        "transactions",
        "disputes",
        "moderation",
      ].includes(segments[0]))
  )
    notFound();
  return <CommerceApp tenant="goxavni" segments={segments} admin />;
}
