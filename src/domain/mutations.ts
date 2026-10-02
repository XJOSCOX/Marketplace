import { AppError } from "./errors.ts";
export function verifyMutationOrigin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    if (!/^Bearer [^\s]+$/.test(authorization))
      throw new AppError(
        401,
        "INVALID_TOKEN",
        "A valid bearer token is required.",
      );
    return; // serverClient uses this token exclusively; never falls back to cookies.
  }
  const configured = process.env.APP_ORIGIN;
  if (
    !configured ||
    request.headers.get("origin") !== new URL(configured).origin
  )
    throw new AppError(
      403,
      "INVALID_ORIGIN",
      "This request origin is not permitted.",
    );
}
export async function jsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError(
      415,
      "INVALID_CONTENT_TYPE",
      "Send an application/json body.",
    );
  // Bound the streamed body, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader)
    throw new AppError(400, "INVALID_BODY", "A JSON object is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) {
      await reader.cancel();
      throw new AppError(413, "BODY_TOO_LARGE", "The request is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || Array.isArray(value) || typeof value !== "object")
      throw new Error();
    return value;
  } catch {
    throw new AppError(400, "INVALID_BODY", "A JSON object is required.");
  }
}
