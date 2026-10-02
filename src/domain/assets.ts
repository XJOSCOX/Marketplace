import { AppError } from "./errors.ts";
import { requireUuid } from "./api.ts";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export function assetPath(
  tenant: string,
  objectId: string,
  productId?: string,
) {
  requireUuid(tenant);
  requireUuid(objectId);
  if (productId) requireUuid(productId);
  return `marketplaces/${tenant.toLowerCase()}/${productId ? `products/${productId.toLowerCase()}` : "logo"}/${objectId.toLowerCase()}.webp`;
}
export function imageKind(bytes: Uint8Array) {
  if (bytes.length > MAX_IMAGE_BYTES || bytes.length < 12)
    throw new AppError(
      400,
      "INVALID_IMAGE",
      "Choose a PNG, JPEG or WebP image under 5 MB.",
    );
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return "png";
  const str = (a: number, b: number) =>
    String.fromCharCode(...bytes.slice(a, b));
  if (str(0, 4) === "RIFF" && str(8, 12) === "WEBP") return "webp";
  throw new AppError(
    400,
    "INVALID_IMAGE",
    "Only PNG, JPEG or WebP image content is supported.",
  );
}
