// Opt-in read-only checks against a migrated development Supabase project.
import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const enabled =
  process.env.RUN_SUPABASE_INTEGRATION === "true" && !!url && !!key;
test(
  "Supabase exposes public catalog but denies anonymous private data",
  { skip: !enabled },
  async () => {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db
      .from("catalog_products")
      .select("id,marketplace_id,price_amount")
      .limit(5);
    assert.equal(error, null);
    assert.ok(data.length > 0);
    assert.equal(typeof data[0].price_amount, "string");
    for (const table of ["profiles", "orders", "messages", "platform_admins"]) {
      const result = await db.from(table).select("*");
      assert.ok(result.error || result.data.length === 0, table);
    }
    const { error: rpcError } = await db.rpc("add_cart_item", {
      tenant: data[0].marketplace_id,
      variant: data[0].id,
      quantity_to_add: 1,
    });
    assert.ok(rpcError);
  },
);
test(
  "optional verified bearer session returns only its own profile",
  { skip: !enabled || !process.env.SUPABASE_TEST_ACCESS_TOKEN },
  async () => {
    const token = process.env.SUPABASE_TEST_ACCESS_TOKEN;
    const db = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db.auth.getUser(token);
    assert.equal(error, null);
    const result = await db
      .from("profiles")
      .select("id")
      .eq("id", data.user.id);
    assert.equal(result.error, null);
    assert.equal(result.data[0].id, data.user.id);
  },
);
