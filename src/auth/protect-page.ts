import "server-only";
import { redirect } from "next/navigation";
import { authContext } from "./server";
import { AppError } from "@/domain/errors";
export async function protectPage(
  path: string,
  tenant?: string,
  area?: string,
) {
  try {
    const auth = await authContext();
    await auth.requireUser();
    if (area === "admin") await auth.requirePlatformAdmin();
    else if (tenant && area === "owner")
      await auth.requireMarketplaceRole(tenant, [
        "marketplace_owner",
        "marketplace_staff",
      ]);
    else if (tenant && area === "seller")
      await auth.requireMarketplaceRole(tenant, [
        "seller",
        "marketplace_owner",
        "marketplace_staff",
      ]);
    return auth;
  } catch (error) {
    if (error instanceof AppError && error.status === 401)
      redirect(`/auth/sign-in?next=${encodeURIComponent(path)}`);
    throw error;
  }
}
