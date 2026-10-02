import { productDetail } from "@/services/storefront";
import { errorResponse } from "@/domain/errors";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketplaceId: string; productId: string }> },
) {
  try {
    const { marketplaceId, productId } = await params;
    return Response.json(
      { data: await productDetail(marketplaceId, productId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
