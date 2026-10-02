import { createMarketplace } from "@/services/onboarding";
import { jsonObject, verifyMutationOrigin } from "@/api/mutations";
import { errorResponse } from "@/domain/errors";
export async function POST(request: Request) {
  try {
    verifyMutationOrigin(request);
    return Response.json(
      { data: await createMarketplace(await jsonObject(request), request) },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
