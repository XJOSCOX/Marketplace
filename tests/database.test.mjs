import { storageSchema } from "./storage-schema.mjs";
// A real embedded PostgreSQL engine exercises constraints and RLS without Docker.
// The small auth schema below emulates Supabase auth.uid; hosted Auth is tested separately.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
function id(value) {
  const h = createHash("md5")
    .update("commerce-dev:" + value)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20)}`;
}
test("PostgreSQL migrations, tenant constraints, RLS and privilege escalation resistance", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,aud text,role text,email text,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
    );
    await db.exec(storageSchema);
    for (const name of readdirSync("supabase/migrations")
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(readFileSync("supabase/migrations/" + name, "utf8"));
    await db.exec(readFileSync("supabase/seed.sql", "utf8"));
    const rejected = async (sql, code) => {
      await assert.rejects(
        () => db.exec(sql),
        (error) => error.code === code,
      );
    };
    const as = async (role, user = "") => {
      await db.exec(
        `reset role; select set_config('request.jwt.claim.sub','${user ? id(user) : ""}',false); set role ${role};`,
      );
    };
    const count = async (table, where = "true") =>
      Number(
        (
          await db.query(
            `select count(*) as n from public.${table} where ${where}`,
          )
        ).rows[0].n,
      );
    assert.equal(await count("products"), 24);
    const unsecured = await db.query(
      "select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity",
    );
    assert.deepEqual(unsecured.rows, []);
    await rejected(
      `insert into public.products(marketplace_id,seller_id,category_id,name,price_amount) values('${id("goxavni")}','${id("atelier-studio")}','${id("goxavni-home")}','Bad tenant',100)`,
      "23503",
    );
    await rejected(
      `insert into public.product_variants(marketplace_id,product_id,name,sku,price_amount) values('${id("goxavni")}','${id("atelier-p1")}','Bad','BAD',100)`,
      "23503",
    );
    await rejected(
      `insert into public.order_items(marketplace_id,order_id,product_id,variant_id,seller_id,name,quantity,price_amount,subtotal_amount) values('${id("goxavni")}','${id("goxavni-1040")}','${id("goxavni-p1")}','${id("goxavni-p1-v0")}','${id("atelier-studio")}','Bad',1,100,100)`,
      "23503",
    );
    await rejected(
      `insert into public.messages(marketplace_id,conversation_id,sender_id,body) values('${id("goxavni")}','${id("atelier-conversation")}','${id("alex")}','Bad')`,
      "23503",
    );
    await as("anon");
    assert.equal(await count("catalog_products"), 24);
    await rejected("select * from public.profiles", "42501");
    // Switch modes as a trusted migration actor. Public reads must immediately follow mode changes.
    await as("postgres");
    await db.exec(
      `update public.marketplaces set mode='STORE' where id='${id("goxavni")}'`,
    );
    await as("anon");
    assert.equal(
      await count("catalog_products", `marketplace_id='${id("goxavni")}'`),
      4,
    );
    await as("postgres");
    await db.exec(
      `update public.marketplaces set mode='MARKETPLACE' where id='${id("goxavni")}'`,
    );
    await as("anon");
    assert.equal(
      await count("catalog_products", `marketplace_id='${id("goxavni")}'`),
      4,
    );
    await as("authenticated", "noah");
    assert.equal(await count("orders", `marketplace_id='${id("goxavni")}'`), 0);
    assert.equal(await count("messages"), 1); // Noah participates only in Atelier's seeded conversation.
    await rejected(
      `insert into public.platform_admins(user_id) values('${id("noah")}')`,
      "42501",
    );
    await rejected(
      `update public.marketplaces set owner_user_id='${id("noah")}' where id='${id("goxavni")}'`,
      "42501",
    );
    await rejected(
      `insert into public.orders(marketplace_id,user_id,subtotal_amount,total_amount) values('${id("goxavni")}','${id("noah")}',0,0)`,
      "42501",
    );
    await rejected(
      `insert into public.conversation_participants(marketplace_id,conversation_id,user_id) values('${id("goxavni")}','${id("goxavni-conversation")}','${id("noah")}')`,
      "42501",
    );
    await rejected(
      `insert into public.messages(marketplace_id,conversation_id,sender_id,body) values('${id("goxavni")}','${id("goxavni-conversation")}','${id("alex")}','spoof')`,
      "42501",
    );
    await db.exec(
      `insert into public.carts(marketplace_id,user_id) values('${id("goxavni")}','${id("noah")}')`,
    );
    assert.equal(await count("carts"), 1);
    await as("authenticated", "maya");
    assert.equal(await count("carts"), 0);
    assert.equal(
      await count("order_items", `marketplace_id='${id("goxavni")}'`),
      1,
    );
    assert.equal(await count("orders", `marketplace_id='${id("goxavni")}'`), 0);
    await rejected(
      `insert into public.products(marketplace_id,seller_id,category_id,name,price_amount) values('${id("goxavni")}','${id("goxavni-studio")}','${id("goxavni-home")}','Hijack',1)`,
      "42501",
    );
    await db.exec(
      `insert into public.products(marketplace_id,seller_id,category_id,name,price_amount) values('${id("goxavni")}','${id("goxavni-form")}','${id("goxavni-home")}','Own draft',12345)`,
    );
    const saved = await db.query(
      `select public.save_listing('${id("goxavni")}','${id("goxavni-form")}',null,'${id("goxavni-home")}','RPC listing','Description',2345,10,'active') as id`,
    );
    assert.ok(saved.rows[0].id);
    await db.exec(
      `select public.save_listing('${id("goxavni")}','${id("goxavni-form")}','${saved.rows[0].id}','${id("goxavni-home")}','RPC updated','Description',2500,8,'active')`,
    );
    assert.equal(await count("products", "name='RPC updated'"), 1);
    await rejected(
      `select public.save_listing('${id("goxavni")}','${id("atelier-studio")}',null,'${id("goxavni-home")}','Cross tenant','Description',100,1,'active')`,
      "42501",
    );
    assert.equal(await count("products", "name='Own draft'"), 1);
    await as("anon");
    assert.equal(await count("products", "name='Own draft'"), 0);
    await as("authenticated", "alex");
    await rejected(
      `update public.marketplace_memberships set roles='{platform_admin}' where marketplace_id='${id("goxavni")}' and user_id='${id("maya")}'`,
      "23514",
    );
    await rejected(
      `update public.products set marketplace_id='${id("atelier")}' where id='${id("goxavni-p1")}'`,
      "23514",
    );
    const result = await db.query(
      `select public.start_conversation('${id("goxavni")}','${id("goxavni-form")}','A legitimate question') as id`,
    );
    assert.ok(result.rows[0].id);
    await db.exec(
      `select public.add_cart_item('${id("goxavni")}','${id("goxavni-p2-v0")}',2)`,
    );
    await db.exec(
      `select public.add_cart_item('${id("goxavni")}','${id("goxavni-p2-v0")}',1)`,
    );
    const cartQuantity = await db.query(
      `select quantity from public.cart_items where variant_id='${id("goxavni-p2-v0")}'`,
    );
    assert.equal(cartQuantity.rows[0].quantity, 3);
    await rejected(
      `select public.add_cart_item('${id("goxavni")}','${id("goxavni-p2-v0")}',999)`,
      "23514",
    );
    await rejected(
      `select public.add_cart_item('${id("goxavni")}','${id("atelier-p1-v0")}',1)`,
      "42501",
    );
    await rejected(
      `select public.add_cart_item('${id("goxavni")}','${id("goxavni-p1-v0")}',1)`,
      "42501",
    ); // Owner inventory is excluded in MARKETPLACE mode.
  } finally {
    await db.close();
  }
});
