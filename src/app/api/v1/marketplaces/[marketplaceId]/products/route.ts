import { listCatalog } from "@/services/catalog";
import { errorResponse } from "@/domain/errors";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketplaceId: string }> },
) {
  try {
    const { marketplaceId } = await params;
    return Response.json(
      await listCatalog(marketplaceId, new URL(request.url).searchParams),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
