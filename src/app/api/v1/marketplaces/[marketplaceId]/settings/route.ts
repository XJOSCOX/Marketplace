import { updateMarketplace } from "@/services/marketplace";
import { jsonObject, verifyMutationOrigin } from "@/api/mutations";
import { errorResponse } from "@/domain/errors";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ marketplaceId: string }> },
) {
  try {
    verifyMutationOrigin(request);
    return Response.json(
      {
        data: await updateMarketplace(
          (await params).marketplaceId,
          await jsonObject(request),
          request,
        ),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
