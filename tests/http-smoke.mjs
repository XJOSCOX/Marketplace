// Run against an unconfigured development server (or ALLOW_DEMO=true production preview).
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
  ...seller.map((p) => "/demo/m/goxavni/seller" + p),
  ...owner.map((p) => "/demo/m/goxavni/owner" + p),
  ...admin.map((p) => "/demo/admin" + p),
  "/m/atelier",
  "/m/makers",
  "/auth/sign-in",
  "/auth/sign-up",
];
for (const path of routes) {
  const res = await fetch(base + path, { redirect: "manual" });
  assert.equal(res.status, 200, path);
}
for (const path of [
  "/m/missing",
  "/m/goxavni/category/missing",
  "/m/goxavni/product/atelier-p1",
  "/admin/missing",
])
  assert.equal((await fetch(base + path)).status, 404, path);
for (const path of [
  ...seller.map((p) => "/m/goxavni/seller" + p),
  ...owner.map((p) => "/m/goxavni/owner" + p),
  ...admin.map((p) => "/admin" + p),
]) {
  const res = await fetch(base + path, { redirect: "manual" });
  assert.equal(res.status, 307, path);
  assert.ok(
    res.headers.get("location").startsWith("/auth/sign-in?next="),
    path,
  );
}
const id = "11111111-1111-4111-a111-111111111111";
for (const [path, status, code] of [
  [`/api/v1/marketplaces/${id}/products`, 503, "BACKEND_NOT_CONFIGURED"],
  ["/api/v1/marketplaces/goxavni/products", 400, "INVALID_ID"],
  [`/api/v1/marketplaces/${id}/products?page=0`, 400, "INVALID_PAGINATION"],
  ["/api/v1/me", 401, "UNAUTHENTICATED"],
  [`/api/v1/marketplaces/${id}/cart`, 401, "UNAUTHENTICATED"],
]) {
  const response = await fetch(base + path);
  assert.equal(response.status, status, path);
  const json = await response.json();
  assert.equal(json.error.code, code);
  assert.equal(json.data, undefined);
}
console.log(
  `Passed ${routes.length} public/demo/auth routes, 27 protected redirects, negative routes, and fail-closed API checks.`,
);
