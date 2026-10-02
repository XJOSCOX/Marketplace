import "server-only";
import { authContext } from "@/auth/server";
import { serverClient, publicClient } from "@/lib/supabase/server";
import { requireUuid } from "@/domain/api";
import { AppError } from "@/domain/errors";
import { assetPath } from "@/domain/assets";
import { normalizedImage, imageBody } from "@/lib/images";
export async function uploadAsset(
  tenant: string,
  request: Request,
  productId?: string,
) {
  requireUuid(tenant);
  if (productId) requireUuid(productId);
  const auth = await authContext(request);
  await auth.requireUser();
  if (productId) {
    const { data } = await auth.db
      .from("products")
      .select("seller_id")
      .eq("marketplace_id", tenant)
      .eq("id", productId)
      .single();
    if (!data) throw new AppError(404, "NOT_FOUND", "Product not found.");
    await auth.requireSellerAccess(tenant, data.seller_id);
  } else await auth.requireMarketplaceRole(tenant, ["marketplace_owner"]);
  const image = await normalizedImage(await imageBody(request));
  const path = assetPath(tenant, crypto.randomUUID(), productId);
  const bucket = productId ? "product-images" : "marketplace-assets";
  const { error } = await auth.db.storage
    .from(bucket)
    .upload(path, image, { contentType: "image/webp", upsert: false });
  if (error)
    throw new AppError(
      409,
      "UPLOAD_FAILED",
      "The image could not be uploaded.",
    );
  const result = productId
    ? await auth.db
        .from("products")
        .update({ image_path: path })
        .eq("marketplace_id", tenant)
        .eq("id", productId)
        .select("id")
        .single()
    : await auth.db
        .from("marketplaces")
        .update({ logo_path: path })
        .eq("id", tenant)
        .select("id")
        .single();
  if (result.error) {
    await auth.db.storage.from(bucket).remove([path]);
    throw new AppError(
      409,
      "IMAGE_NOT_SAVED",
      "The image could not be attached.",
    );
  }
  return {
    path,
    url: `/api/v1/marketplaces/${tenant}/assets${productId ? "?productId=" + productId : ""}`,
  };
}
export async function readAsset(
  tenant: string,
  request: Request,
  productId?: string,
) {
  requireUuid(tenant);
  if (productId) requireUuid(productId);
  // Public requests need no identity. Cookie/bearer requests retain caller RLS.
  const db =
    request.headers.has("authorization") || request.headers.has("cookie")
      ? await serverClient(request)
      : publicClient();
  const result = productId
    ? await db
        .from("products")
        .select("image_path")
        .eq("marketplace_id", tenant)
        .eq("id", productId)
        .single()
    : await db
        .from("marketplaces")
        .select("logo_path")
        .eq("id", tenant)
        .single();
  const record = result.data as {
    image_path?: string;
    logo_path?: string;
  } | null;
  const path = productId ? record?.image_path : record?.logo_path;
  if (result.error || !path)
    throw new AppError(404, "IMAGE_NOT_FOUND", "Image not found.");
  const { data, error } = await db.storage
    .from(productId ? "product-images" : "marketplace-assets")
    .download(path);
  if (error || !data)
    throw new AppError(404, "IMAGE_NOT_FOUND", "Image not found.");
  // Storage's MIME whitelist does not validate bytes on direct SDK uploads. Decode
  // again here so application image responses never reflect unchecked file content.
  return normalizedImage(new Uint8Array(await data.arrayBuffer()));
}
