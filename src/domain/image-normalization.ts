import sharp from "sharp";
import { imageKind, MAX_IMAGE_BYTES } from "./assets.ts";
import { AppError } from "./errors.ts";
export async function normalizedImage(bytes: Uint8Array) {
  imageKind(bytes);
  try {
    const result = await sharp(bytes, {
      limitInputPixels: 16000000,
      animated: false,
      failOn: "warning",
    })
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    if (result.length > MAX_IMAGE_BYTES) throw new Error("Too large");
    return result;
  } catch {
    throw new AppError(
      400,
      "INVALID_IMAGE",
      "The image could not be decoded. Use a still image up to 16 megapixels.",
    );
  }
}
