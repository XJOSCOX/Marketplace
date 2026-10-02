import { protectPage } from "@/auth/protect-page";
import { MarketplaceWizard } from "@/components/marketplace-wizard";
export default async function Page() {
  await protectPage("/create");
  return <MarketplaceWizard />;
}
