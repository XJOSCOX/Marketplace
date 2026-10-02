import { saveBranding } from "@/services/management";
import { jsonObject, verifyMutationOrigin } from "@/api/mutations";
import { errorResponse } from "@/domain/errors";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ marketplaceId: string }> },
) {
  try {
    verifyMutationOrigin(request);
    return Response.json(
      {
        data: await saveBranding(
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
