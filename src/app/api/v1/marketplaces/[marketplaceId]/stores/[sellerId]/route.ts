import { sellerStorefront } from "@/services/storefront";
import { errorResponse } from "@/domain/errors";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketplaceId: string; sellerId: string }> },
) {
  try {
    const { marketplaceId, sellerId } = await params;
    return Response.json(
      {
        data: await sellerStorefront(
          marketplaceId,
          sellerId,
          new URL(request.url).searchParams,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
