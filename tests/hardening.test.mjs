import { storageSchema } from "./storage-schema.mjs";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
function id(s) {
  const h = createHash("md5")
    .update("commerce-dev:" + s)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20)}`;
}
test("hardening migration: real PostgreSQL adversarial regression suite", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,aud text,role text,email text,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
    );
    await db.exec(storageSchema);
    for (const file of readdirSync("supabase/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(readFileSync("supabase/migrations/" + file, "utf8"));
    await db.exec(readFileSync("supabase/seed.sql", "utf8"));
    const as = async (role, user = "") =>
      db.exec(
        `reset role; select set_config('request.jwt.claim.sub','${user ? id(user) : ""}',false); set role ${role}`,
      );
    const rows = async (sql) => (await db.query(sql)).rows;
    const count = async (table, where = "true") =>
      Number(
        (await rows(`select count(*) n from public.${table} where ${where}`))[0]
          .n,
      );
    const deny = async (sql, code = "42501") =>
      assert.rejects(
        () => db.exec(sql),
        (e) => e.code === code,
      );
    const go = id("goxavni"),
      maya = id("maya"),
      noah = id("noah");
    let tenant, seller;
    await t.test(
      "anonymous writes and definer execution ACLs fail closed",
      async () => {
        await as("anon");
        for (const table of [
          "products",
          "orders",
          "order_items",
          "messages",
          "marketplaces",
          "sellers",
          "carts",
        ])
          await deny(`delete from public.${table}`);
        await deny(
          `select public.create_marketplace('evil','Evil','HYBRID','USD')`,
        );
        await deny(`select public.apply_seller('${go}','Evil','')`);
        await deny(
          `select private.change_cart('${go}','${id("goxavni-p2-v0")}',1,true)`,
        );
        await as("postgres");
        const unsafe = await rows(
          `select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prosecdef and (not coalesce(p.proconfig @> array['search_path=""'],false) or exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'))`,
        );
        assert.deepEqual(unsafe, []);
      },
    );
    await t.test(
      "creation binds caller, provisions by mode, and rolls back all rows",
      async () => {
        await as("authenticated", "noah");
        tenant = (
          await rows(
            `select public.create_marketplace('  Secure-Shop  ','Secure shop','HYBRID','USD') id`,
          )
        )[0].id;
        assert.equal(
          await count(
            "marketplace_memberships",
            `marketplace_id='${tenant}' and user_id='${noah}' and roles @> array['marketplace_owner']`,
          ),
          1,
        );
        assert.equal(
          await count(
            "sellers",
            `marketplace_id='${tenant}' and user_id='${noah}' and status='active'`,
          ),
          1,
        );
        assert.equal(await count("stores", `marketplace_id='${tenant}'`), 1);
        const marketplace = (
          await rows(
            `select public.create_marketplace('third-party','Third party','MARKETPLACE','USD') id`,
          )
        )[0].id;
        assert.equal(
          await count("sellers", `marketplace_id='${marketplace}'`),
          0,
        );
        const store = (
          await rows(
            `select public.create_marketplace('owner-only','Owner only','STORE','USD') id`,
          )
        )[0].id;
        assert.equal(await count("stores", `marketplace_id='${store}'`), 1);
        await deny(
          `insert into public.marketplace_memberships(marketplace_id,user_id,roles) values('${tenant}','${maya}',array['marketplace_owner'])`,
        );
        await as("postgres");
        // Force a failure after marketplace/membership/seller insertion, proving atomic rollback.
        await db.exec(
          `create function private.test_failure() returns trigger language plpgsql as $$begin if new.name='Rollback test' then raise exception 'Injected failure'; end if; return new; end$$; create trigger test_failure before insert on public.stores for each row execute function private.test_failure()`,
        );
        const before = await count("marketplaces");
        await as("authenticated", "noah");
        await deny(
          `select public.create_marketplace('rollback-test','Rollback test','HYBRID','USD')`,
          "P0001",
        );
        await as("postgres");
        assert.equal(await count("marketplaces"), before);
        assert.equal(await count("sellers", "name='Rollback test'"), 0);
        await db.exec(
          "drop trigger test_failure on public.stores; drop function private.test_failure()",
        );
      },
    );
    await t.test(
      "seller lifecycle prevents self approval, impersonation and cross-tenant management",
      async () => {
        await as("postgres");
        await db.exec(
          `update public.marketplaces set status='active' where id='${tenant}'`,
        );

        await as("authenticated", "maya");
        seller = (
          await rows(
            `select public.apply_seller('${tenant}','Maya shop','Independent goods') id`,
          )
        )[0].id;
        assert.equal(
          await count("sellers", `id='${seller}' and status='pending'`),
          1,
        );
        await deny(
          `update public.sellers set status='active' where id='${seller}'`,
        );
        await deny(
          `update public.sellers set marketplace_id='${go}' where id='${seller}'`,
        );
        await deny(
          `select public.review_seller('${tenant}','${seller}','active')`,
        );
        await deny(
          `insert into public.marketplace_memberships(marketplace_id,user_id,roles) values('${go}','${maya}',array['marketplace_owner'])`,
        );
        await deny(
          `insert into public.platform_admins(user_id) values('${maya}')`,
        );
        await as("authenticated", "alex"); // staff of other tenants, owner of GoXAvni
        await deny(
          `select public.review_seller('${tenant}','${seller}','active')`,
        );
        await db.exec(
          `update public.products set name='Hijacked' where marketplace_id='${tenant}'`,
        );
        await as("authenticated", "noah");
        await db.exec(
          `select public.review_seller('${tenant}','${seller}','active')`,
        );
        assert.equal(
          await count(
            "stores",
            `marketplace_id='${tenant}' and seller_id='${seller}'`,
          ),
          1,
        );
        assert.equal(
          await count(
            "marketplace_memberships",
            `marketplace_id='${tenant}' and user_id='${maya}' and roles @> array['seller'] and not roles @> array['marketplace_owner']`,
          ),
          1,
        );
        await deny(
          `select public.review_seller('${tenant}','${seller}','administrator')`,
          "23514",
        );
        await db.exec(
          `select public.review_seller('${tenant}','${seller}','suspended')`,
        );
        await as("authenticated", "maya");
        await deny(
          `select public.apply_seller('${tenant}','Retry','')`,
          "23505",
        );
        await as("authenticated", "noah");
        await db.exec(
          `select public.review_seller('${tenant}','${seller}','rejected')`,
        );
        await db.exec(
          `insert into public.marketplace_memberships(marketplace_id,user_id,roles) values('${tenant}','${id("alex")}',array['marketplace_staff'])`,
        );
        await as("authenticated", "alex");
        await db.exec(
          `select public.review_seller('${tenant}','${seller}','active')`,
        );
        // Even a staff member cannot approve their own seller application.
        const own = (
          await rows(
            `select public.apply_seller('${tenant}','Staff shop','') id`,
          )
        )[0].id;
        await deny(
          `select public.review_seller('${tenant}','${own}','active')`,
        );
        assert.equal(
          (await rows(`select private.manages('${id("atelier")}') allowed`))[0]
            .allowed,
          true,
        );
        await as("authenticated", "noah");
        const thread = (
          await rows(
            `select public.start_conversation('${tenant}','${seller}','Private buyer question') id`,
          )
        )[0].id;
        await db.exec(
          `insert into public.messages(marketplace_id,conversation_id,sender_id,body) values('${tenant}','${thread}','${noah}','Private content')`,
        );
        await as("authenticated", "alex");
        assert.equal(
          await count("conversations", `marketplace_id='${tenant}'`),
          0,
        );
        assert.equal(await count("messages", `marketplace_id='${tenant}'`), 0);
        // Maya owns Atelier, but does not manage Noah's new marketplace.
        await as("authenticated", "maya");
        assert.equal(
          (await rows(`select private.manages('${tenant}') allowed`))[0]
            .allowed,
          false,
        );
      },
    );
    await t.test(
      "buyer and seller order/cart isolation and all direct order mutations",
      async () => {
        await as("authenticated", "noah");
        await db.exec(
          `select public.add_cart_item('${go}','${id("goxavni-p2-v0")}',1)`,
        );
        await as("authenticated", "maya");
        assert.equal(await count("carts", `marketplace_id='${go}'`), 0);
        assert.equal(await count("cart_items", `marketplace_id='${go}'`), 0);
        assert.equal(await count("orders", `marketplace_id='${go}'`), 0);
        assert.equal(
          await count(
            "order_items",
            `marketplace_id='${go}' and seller_id='${id("goxavni-studio")}'`,
          ),
          0,
        );
        await db.exec(
          `update public.products set name='Hijacked' where id='${id("goxavni-p1")}'`,
        );
        assert.equal(await count("products", "name='Hijacked'"), 0);
        for (const table of ["orders", "order_items"]) {
          await deny(`insert into public.${table} default values`);
          await deny(`update public.${table} set currency='USD'`);
          await deny(`delete from public.${table}`);
        }
      },
    );
    await t.test(
      "private messages require participation even for administrators",
      async () => {
        await as("postgres");
        await db.exec(
          `insert into public.platform_admins(user_id) values('${noah}')`,
        );
        await as("authenticated", "noah");
        for (const table of [
          "messages",
          "conversations",
          "conversation_participants",
        ])
          assert.equal(await count(table, `marketplace_id='${go}'`), 0);
        await deny(
          `insert into public.messages(marketplace_id,conversation_id,sender_id,body) values('${go}','${id("goxavni-conversation")}','${id("alex")}','Spoof')`,
        );
        await deny(
          `insert into public.conversation_participants(marketplace_id,conversation_id,user_id) values('${go}','${id("goxavni-conversation")}','${noah}')`,
        );
        await as("postgres");
        await db.exec(
          `delete from public.platform_admins where user_id='${noah}'`,
        );
        await as("authenticated", "alex");
        assert.equal(await count("messages", `marketplace_id='${tenant}'`), 0); // staff does not inherit messages
        await deny(
          `select public.start_conversation('${go}','${id("atelier-studio")}','Cross tenant')`,
        );
        await deny(
          `insert into public.messages(marketplace_id,conversation_id,sender_id,body) values('${go}','${id("atelier-conversation")}','${id("alex")}','Cross tenant')`,
        );
      },
    );
    await t.test(
      "SQL input bounds and tenant foreign keys cannot be bypassed",
      async () => {
        await as("authenticated", "maya");
        await deny(
          `insert into public.products(marketplace_id,seller_id,category_id,name,price_amount) values('${go}','${id("goxavni-form")}','${id("atelier-home")}','Cross category',1)`,
          "23503",
        );
        await deny(
          `insert into public.product_variants(marketplace_id,product_id,name,sku,price_amount) values('${go}','${id("atelier-p1")}','Cross variant','CROSS',1)`,
        );
        await deny(
          `update public.products set description=repeat('x',10001) where id='${id("goxavni-p2")}'`,
          "23514",
        );
        await deny(
          `update public.products set image_url='javascript:alert(1)' where id='${id("goxavni-p2")}'`,
          "23514",
        );
        await deny(
          `update public.product_variants set stock=1000001 where id='${id("goxavni-p2-v0")}'`,
          "23514",
        );
        await deny(
          `update public.product_variants set sku=repeat('x',81) where id='${id("goxavni-p2-v0")}'`,
          "23514",
        );
        await deny(
          `select public.create_marketplace('Bad / slug','Name','HYBRID','USD')`,
          "23514",
        );
        await deny(
          `select public.create_marketplace('bad-mode','Name','ADMIN','USD')`,
          "23514",
        );
      },
    );
    await t.test(
      "mode, draft, seller and variant status gate public reads and cart writes",
      async () => {
        for (const [mode, expected] of [
          ["STORE", 4],
          ["MARKETPLACE", 4],
          ["HYBRID", 8],
        ]) {
          await as("postgres");
          await db.exec(
            `update public.marketplaces set mode='${mode}' where id='${go}'`,
          );
          await as("anon");
          assert.equal(
            await count("catalog_products", `marketplace_id='${go}'`),
            expected,
          );
        }
        await as("postgres");
        await db.exec(
          `update public.sellers set status='suspended' where id='${id("goxavni-form")}'`,
        );
        await as("anon");
        assert.equal(
          await count("catalog_products", `marketplace_id='${go}'`),
          4,
        );
        await as("authenticated", "noah");
        await deny(
          `select public.add_cart_item('${go}','${id("goxavni-p2-v0")}',1)`,
        );
        await as("postgres");
        await db.exec(
          `update public.sellers set status='active' where id='${id("goxavni-form")}'; update public.products set status='draft' where id='${id("goxavni-p2")}'`,
        );
        await as("anon");
        assert.equal(
          await count("catalog_products", `id='${id("goxavni-p2")}'`),
          0,
        );
        await as("authenticated", "noah");
        await deny(
          `select public.add_cart_item('${go}','${id("goxavni-p2-v0")}',1)`,
        );
        await as("postgres");
        await db.exec(
          `update public.products set status='active' where id='${id("goxavni-p2")}'; update public.product_variants set status='draft' where id='${id("goxavni-p2-v0")}'`,
        );
        await as("authenticated", "noah");
        await deny(
          `select public.set_cart_item('${go}','${id("goxavni-p2-v0")}',2)`,
        );
        await as("postgres");
        await db.exec(
          `update public.product_variants set status='active',stock=2 where id='${id("goxavni-p2-v0")}'`,
        );
        await as("authenticated", "noah");
        await deny(
          `select public.set_cart_item('${go}','${id("goxavni-p2-v0")}',3)`,
          "23514",
        );
        await db.exec(
          `select public.set_cart_item('${go}','${id("goxavni-p2-v0")}',2)`,
        );
        await deny(`update public.cart_items set quantity=999`);
        await deny(`insert into public.cart_items default values`);
        assert.equal(
          (
            await rows(
              `select quantity from public.cart_items where marketplace_id='${go}'`,
            )
          )[0].quantity,
          2,
        );
      },
    );
    await t.test(
      "monetary DTO views serialize text before JSON, including large totals",
      async () => {
        await as("postgres");
        await db.exec(
          `update public.products set price_amount=9007199254740991 where id='${id("goxavni-p2")}'`,
        );
        await as("authenticated", "maya");
        const result = (
          await rows(
            `select price_amount from public.secure_products where id='${id("goxavni-p2")}'`,
          )
        )[0];
        assert.equal(result.price_amount, "9007199254740991");
        assert.equal(
          JSON.stringify(result),
          '{"price_amount":"9007199254740991"}',
        );
        const large = (
          await rows(
            `select (sum(price_amount::bigint)*999)::text amount from public.secure_products where id='${id("goxavni-p2")}'`,
          )
        )[0].amount;
        assert.equal(large, (9007199254740991n * 999n).toString());
        assert.equal(typeof large, "string");
        for (const table of [
          "secure_products",
          "secure_product_variants",
          "secure_orders",
          "secure_order_items",
        ]) {
          const monetary = await rows(
            `select column_name,data_type from information_schema.columns where table_schema='public' and table_name='${table}' and column_name like '%amount'`,
          );
          assert.ok(monetary.length);
          assert.ok(monetary.every((c) => c.data_type === "text"));
        }
        await deny(
          `update public.products set price_amount=9007199254740992 where id='${id("goxavni-p2")}'`,
          "23514",
        );
      },
    );
  } finally {
    await db.close();
  }
});
