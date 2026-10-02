import { readCart, addCartItem, removeCartItem } from "@/services/cart";
import { jsonObject, verifyMutationOrigin } from "@/api/mutations";
import { errorResponse } from "@/domain/errors";
type Context = { params: Promise<{ marketplaceId: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    return Response.json(
      { data: await readCart((await params).marketplaceId, request) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    verifyMutationOrigin(request);
    return Response.json(
      {
        data: await addCartItem(
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
export async function DELETE(request: Request, { params }: Context) {
  try {
    verifyMutationOrigin(request);
    await removeCartItem(
      (await params).marketplaceId,
      new URL(request.url).searchParams.get("itemId") || "",
      request,
    );
    return Response.json({ data: { removed: true } });
  } catch (error) {
    return errorResponse(error);
  }
}
