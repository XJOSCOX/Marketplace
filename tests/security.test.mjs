import test from "node:test";
import assert from "node:assert/strict";
import { authorization } from "../src/domain/authorization.ts";
import {
  pagination,
  requireUuid,
  safeNext,
  amountString,
  formatAmount,
} from "../src/domain/api.ts";
import { AppError, errorResponse } from "../src/domain/errors.ts";
import { validateListing } from "../src/domain/listing.ts";
test("listing validation rejects privileged fields and decimal prices", () => {
  const uuid = "11111111-1111-4111-a111-111111111111";
  const input = {
    sellerId: uuid,
    categoryId: uuid,
    name: "A considered bowl",
    description: "Ceramic",
    priceAmount: "2800",
    stock: 10,
    status: "draft",
  };
  assert.equal(validateListing(input).priceAmount, "2800");
  for (const override of [
    { priceAmount: 28.5 },
    { stock: 1.5 },
    { status: "approved" },
    { commissionBasisPoints: 0 },
    { marketplaceId: uuid },
    { roles: ["platform_admin"] },
  ])
    assert.throws(() => validateListing({ ...input, ...override }), AppError);
});
const store = (overrides = {}) => ({
  user: async () => ({ id: "user-a" }),
  isAdmin: async () => false,
  membership: async (tenant) =>
    tenant === "tenant-a"
      ? { roles: ["buyer", "seller"], status: "active" }
      : null,
  marketplace: async () => ({ owner_user_id: "owner", status: "active" }),
  seller: async (tenant, id) =>
    tenant === "tenant-a" && id === "seller-a"
      ? { user_id: "user-a", status: "active" }
      : null,
  ...overrides,
});
test("authorization fails closed without a validated identity", async () => {
  const auth = authorization(store({ user: async () => null }));
  for (const action of [
    () => auth.requireUser(),
    () => auth.requirePlatformAdmin(),
    () => auth.requireMarketplaceRole("tenant-a", ["seller"]),
    () => auth.requireSellerAccess("tenant-a", "seller-a"),
  ])
    await assert.rejects(action, (e) => e.status === 401);
});
test("memberships, seller ownership, and platform roles cannot be substituted", async () => {
  const auth = authorization(store());
  await auth.requireSellerAccess("tenant-a", "seller-a");
  await assert.rejects(
    () => auth.requireMarketplaceMembership("tenant-b"),
    (e) => e.status === 403,
  );
  await assert.rejects(
    () => auth.requireSellerAccess("tenant-a", "seller-b"),
    (e) => e.status === 404,
  );
  await assert.rejects(
    () => auth.requireMarketplaceRole("tenant-a", ["marketplace_owner"]),
    (e) => e.status === 403,
  );
  await assert.rejects(
    () => auth.requirePlatformAdmin(),
    (e) => e.status === 403,
  );
  const unrelated = authorization(
    store({
      seller: async () => ({ user_id: "someone-else", status: "active" }),
    }),
  );
  await assert.rejects(
    () => unrelated.requireSellerAccess("tenant-a", "seller-a"),
    (e) => e.status === 403,
  );
});
test("suspended memberships and forged owner membership are denied", async () => {
  for (const membership of [
    { roles: ["seller"], status: "suspended" },
    { roles: ["marketplace_owner"], status: "active" },
  ])
    await assert.rejects(
      () =>
        authorization(
          store({ membership: async () => membership }),
        ).requireMarketplaceRole("tenant-a", ["seller", "marketplace_owner"]),
      (e) => e.status === 403,
    );
});
test("staff authorization is tenant specific and database admins are global", async () => {
  const staff = authorization(
    store({
      membership: async (t) =>
        t === "tenant-a"
          ? { roles: ["marketplace_staff"], status: "active" }
          : null,
    }),
  );
  await staff.requireMarketplaceRole("tenant-a", ["marketplace_staff"]);
  await assert.rejects(
    () => staff.requireMarketplaceRole("tenant-b", ["marketplace_staff"]),
    (e) => e.status === 403,
  );
  await authorization(
    store({ isAdmin: async () => true }),
  ).requirePlatformAdmin();
});
test("pagination validates bounded integer input and stable ranges", () => {
  assert.deepEqual(
    pagination(new URLSearchParams("page=3&pageSize=10&q=mug")),
    { page: 3, pageSize: 10, from: 20, to: 29, q: "mug", category: undefined },
  );
  for (const input of [
    "page=0",
    "page=-1",
    "page=1.5",
    "page=1e2",
    "pageSize=101",
    "pageSize=NaN",
    "page=10001",
  ])
    assert.throws(() => pagination(new URLSearchParams(input)), AppError);
  assert.throws(
    () => pagination(new URLSearchParams({ q: "x".repeat(101) })),
    AppError,
  );
  assert.throws(() => requireUuid("goxavni"), AppError);
  assert.equal(
    requireUuid("11111111-1111-4111-a111-111111111111"),
    "11111111-1111-4111-a111-111111111111",
  );
});
test("money contracts use exact integer strings and currency exponents", () => {
  assert.equal(amountString("9007199254740991"), "9007199254740991");
  for (const value of [12.34, 100, "12.34", "-1", "1e3", "9007199254740992"])
    assert.throws(() => amountString(value), AppError);
  assert.equal(formatAmount("12900", "USD"), "USD 129.00");
  assert.equal(formatAmount("100", "JPY"), "JPY 100");
  assert.equal(formatAmount("1234", "KWD"), "KWD 1.234");
});
test("redirects cannot escape the application and internal errors are redacted", async () => {
  for (const path of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/auth/callback",
  ])
    assert.equal(safeNext(path), "/m/goxavni");
  assert.equal(safeNext("/m/atelier/owner"), "/m/atelier/owner");
  const response = errorResponse(
    new Error("password=private internal database trace"),
  );
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: {
      code: "INTERNAL_ERROR",
      message: "The request could not be completed.",
    },
  });
});
