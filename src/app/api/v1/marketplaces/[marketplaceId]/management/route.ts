import { managementSnapshot } from "@/services/management-read";
import { errorResponse } from "@/domain/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketplaceId: string }> },
) {
  try {
    return Response.json(
      { data: await managementSnapshot((await params).marketplaceId, request) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
