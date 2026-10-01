import assert from "node:assert/strict";
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const customer = [
  "",
  "/products",
  "/category/home",
  "/product/goxavni-p1",
  "/store/goxavni-studio",
  "/cart",
  "/checkout",
  "/favorites",
  "/orders",
  "/messages",
  "/profile",
];
const seller = [
  "",
  "/products",
  "/listing",
  "/listing/goxavni-p1",
  "/orders",
  "/inventory",
  "/sales",
  "/payouts",
  "/settings",
];
const owner = [
  "",
  "/setup",
  "/branding",
  "/store-settings",
  "/sellers",
  "/products",
  "/orders",
  "/customers",
  "/analytics",
  "/commission",
  "/domains",
];
const admin = [
  "",
  "/marketplaces",
  "/users",
  "/sellers",
  "/transactions",
  "/disputes",
  "/moderation",
];
const routes = [
  ...customer.map((p) => "/m/goxavni" + p),
  ...seller.map((p) => "/m/goxavni/seller" + p),
  ...owner.map((p) => "/m/goxavni/owner" + p),
  ...admin.map((p) => "/admin" + p),
  "/m/atelier",
  "/m/makers",
];
for (const path of routes) {
  const res = await fetch(base + path);
  assert.equal(res.status, 200, path);
}
for (const path of [
  "/m/missing",
  "/m/goxavni/category/missing",
  "/m/goxavni/product/atelier-p1",
  "/admin/missing",
]) {
  const res = await fetch(base + path);
  assert.equal(res.status, 404, path);
}
for (const id of ["goxavni", "atelier", "makers"]) {
  const response = await fetch(`${base}/api/v1/marketplaces/${id}/products`);
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.meta.marketplaceId, id);
  assert.equal(json.data.length, 8);
  assert.ok(json.data.every((p) => p.marketplaceId === id));
}
assert.equal(
  (await fetch(base + "/api/v1/marketplaces/missing/products")).status,
  404,
);
const search = await (
  await fetch(
    base + "/api/v1/marketplaces/goxavni/products?q=mug&category=home",
  )
).json();
assert.equal(search.data.length, 1);
assert.equal(search.data[0].name, "Stoneware morning mug");
console.log(
  `Passed ${routes.length} page routes, four negative routes, and catalog API isolation/search checks.`,
);
