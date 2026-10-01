import { marketplaces, products, sellers } from "@/data/mock";
import { catalogFor } from "@/domain/commerce";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketplaceId: string }> },
) {
  const { marketplaceId } = await params;
  const marketplace = marketplaces.find((m) => m.id === marketplaceId);
  if (!marketplace)
    return Response.json(
      {
        error: {
          code: "MARKETPLACE_NOT_FOUND",
          message: "Marketplace not found",
        },
      },
      { status: 404 },
    );
  const search = new URL(request.url).searchParams;
  const q = (search.get("q") || "").toLowerCase();
  const category = search.get("category");
  const result = catalogFor(marketplace, products, sellers).filter(
    (p) =>
      p.name.toLowerCase().includes(q) &&
      (!category || p.categoryId === `${marketplaceId}-${category}`),
  );
  return Response.json({
    data: result,
    meta: {
      marketplaceId,
      currency: "USD",
      count: result.length,
      source: "static-demo-fixtures",
    },
  });
}
