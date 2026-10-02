import { verifyMutationOrigin, jsonObject } from "../src/domain/mutations.ts";
import {
  marketplaceInput,
  sellerApplicationInput,
  sellerReviewInput,
} from "../src/domain/onboarding.ts";
import { formatAmount, safeNext } from "../src/domain/api.ts";
import test from "node:test";
import assert from "node:assert/strict";
test("cookie writes require exact origin, token requests never use cookie fallback", () => {
  const previous = process.env.APP_ORIGIN;
  try {
    process.env.APP_ORIGIN = "https://commerce.example.test";
    for (const origin of [
      "",
      "null",
      "https://evil.example.test",
      "https://commerce.example.test.evil.test",
    ])
      assert.throws(() =>
        verifyMutationOrigin(
          new Request("https://commerce.example.test/api", {
            headers: { origin },
          }),
        ),
      );
    verifyMutationOrigin(
      new Request("https://commerce.example.test/api", {
        headers: { origin: process.env.APP_ORIGIN },
      }),
    );
    verifyMutationOrigin(
      new Request("https://commerce.example.test/api", {
        headers: { authorization: "Bearer opaque-token" },
      }),
    );
    assert.throws(() =>
      verifyMutationOrigin(
        new Request("https://commerce.example.test/api", {
          headers: { authorization: "Bearer invalid token" },
        }),
      ),
    );
    delete process.env.APP_ORIGIN;
    assert.throws(() => verifyMutationOrigin(new Request("http://localhost")));
  } finally {
    if (previous === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previous;
  }
});
test("mutation bodies are bounded objects, including streamed requests", async () => {
  const request = (body) =>
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
  for (const body of ["null", "[]", "1", "{", '"hello"'])
    await assert.rejects(() => jsonObject(request(body)));
  await assert.rejects(
    () => jsonObject(request(JSON.stringify({ body: "x".repeat(17000) }))),
    (e) => e.status === 413,
  );
  await assert.rejects(
    () =>
      jsonObject(
        new Request("http://localhost", { method: "POST", body: "{}" }),
      ),
    (e) => e.status === 415,
  );
  assert.deepEqual(await jsonObject(request('{"name":"Safe"}')), {
    name: "Safe",
  });
});
test("onboarding validation normalizes slug and rejects privileges, enum and length attacks", () => {
  const valid = {
    slug: "  My-Store  ",
    name: "My store",
    mode: "HYBRID",
    currency: "USD",
  };
  assert.equal(marketplaceInput(valid).requested_slug, "my-store");
  for (const extra of [
    { owner_user_id: "me" },
    { roles: ["platform_admin"] },
    { mode: "ADMIN" },
    { slug: "a/b" },
    { slug: "x".repeat(81) },
    { currency: "usd" },
    { name: " " },
  ])
    assert.throws(() => marketplaceInput({ ...valid, ...extra }));
  assert.throws(() =>
    sellerApplicationInput({
      name: "Seller",
      description: "",
      status: "active",
    }),
  );
  assert.throws(() =>
    sellerApplicationInput({ name: "Seller", description: "x".repeat(10001) }),
  );
  assert.throws(() =>
    sellerReviewInput({ sellerId: "bad", decision: "active" }),
  );
  assert.throws(() =>
    sellerReviewInput({
      sellerId: "11111111-1111-4111-a111-111111111111",
      decision: "admin",
    }),
  );
});
test("large money stays exact and redirect controls cannot normalize into external URLs", () => {
  assert.equal(
    formatAmount("900719925474099312345", "USD"),
    "USD 9,007,199,254,740,993,123.45",
  );
  for (const path of ["/\t/evil.test", "/\u0000/evil.test", "/ /evil.test"])
    assert.equal(safeNext(path), "/m/goxavni");
});
