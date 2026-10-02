import { uploadAsset, readAsset } from "@/services/assets";
import { verifyMutationOrigin } from "@/api/mutations";
import { errorResponse } from "@/domain/errors";
type Context = { params: Promise<{ marketplaceId: string }> };
export async function POST(request: Request, { params }: Context) {
  try {
    verifyMutationOrigin(request);
    return Response.json(
      {
        data: await uploadAsset(
          (await params).marketplaceId,
          request,
          new URL(request.url).searchParams.get("productId") || undefined,
        ),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function GET(request: Request, { params }: Context) {
  try {
    const bytes = await readAsset(
      (await params).marketplaceId,
      request,
      new URL(request.url).searchParams.get("productId") || undefined,
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
