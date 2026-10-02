import { notFound } from "next/navigation";
import { demoEnabled } from "@/lib/supabase/config";
import { MarketplaceWizard } from "@/components/marketplace-wizard";
export default function Page() {
  if (!demoEnabled()) notFound();
  return <MarketplaceWizard demo />;
}
