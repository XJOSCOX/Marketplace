import "server-only";
import { MAX_IMAGE_BYTES } from "@/domain/assets";
import { AppError } from "@/domain/errors";
export { normalizedImage } from "@/domain/image-normalization";
export async function imageBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "INVALID_IMAGE", "Choose an image.");
  const parts: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new AppError(413, "IMAGE_TOO_LARGE", "Images must be under 5 MB.");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
