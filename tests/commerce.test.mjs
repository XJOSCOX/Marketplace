import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogFor,
  cartLines,
  sellerAllowed,
} from "../src/domain/commerce.ts";
import { marketplaces, products, sellers } from "../src/data/mock.ts";

test("every catalog is tenant scoped and observes its operating mode", () => {
  for (const m of marketplaces) {
    const catalog = catalogFor(m, products, sellers);
    assert.ok(catalog.length > 0);
    for (const product of catalog) {
      assert.equal(product.marketplaceId, m.id);
      assert.ok(
        sellerAllowed(
          m,
          sellers.find((s) => s.id === product.sellerId),
        ),
      );
      for (const v of product.variants) assert.equal(v.marketplaceId, m.id);
    }
    if (m.mode === "STORE")
      assert.ok(
        catalog.every((p) => sellers.find((s) => s.id === p.sellerId).isOwner),
      );
    if (m.mode === "MARKETPLACE")
      assert.ok(
        catalog.every((p) => !sellers.find((s) => s.id === p.sellerId).isOwner),
      );
  }
});

test("mode changes filter catalog without destroying listings; drafts remain private", () => {
  const m = marketplaces[0];
  const hybrid = catalogFor(m, products, sellers);
  const store = catalogFor({ ...m, mode: "STORE" }, products, sellers);
  const marketplace = catalogFor(
    { ...m, mode: "MARKETPLACE" },
    products,
    sellers,
  );
  assert.equal(hybrid.length, store.length + marketplace.length);
  assert.equal(
    catalogFor(m, [{ ...hybrid[0], status: "draft" }], sellers).length,
    0,
  );
});

test("cart joins reject cross-tenant and mismatched variants and use variant price", () => {
  const product = products[0];
  const other = products.find((p) => p.marketplaceId !== product.marketplaceId);
  const variant = product.variants[1];
  const valid = {
    marketplaceId: product.marketplaceId,
    productId: product.id,
    variantId: variant.id,
    quantity: 2,
  };
  const lines = cartLines(
    [
      valid,
      { ...valid, marketplaceId: other.marketplaceId },
      { ...valid, productId: other.id },
      { ...valid, variantId: other.variants[0].id },
    ],
    products,
    product.marketplaceId,
  );
  assert.equal(lines.length, 1);
  assert.equal(lines[0].subtotal, variant.price * 2);
});
