import { ownApplication } from "@/services/management-read";
import { applySeller, reviewSeller } from "@/services/onboarding";
import { jsonObject, verifyMutationOrigin } from "@/api/mutations";
import { errorResponse } from "@/domain/errors";
type Context = { params: Promise<{ marketplaceId: string }> };
export async function POST(request: Request, { params }: Context) {
  try {
    verifyMutationOrigin(request);
    return Response.json(
      {
        data: await applySeller(
          (await params).marketplaceId,
          await jsonObject(request),
          request,
        ),
      },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    verifyMutationOrigin(request);
    return Response.json(
      {
        data: await reviewSeller(
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketplaceId: string }> },
) {
  try {
    return Response.json(
      { data: await ownApplication((await params).marketplaceId, request) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
