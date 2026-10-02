import { storefrontDetail } from "@/services/storefront";
import { errorResponse } from "@/domain/errors";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketplaceId: string }> },
) {
  try {
    const { marketplaceId } = await params;
    return Response.json(
      { data: await storefrontDetail(marketplaceId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
