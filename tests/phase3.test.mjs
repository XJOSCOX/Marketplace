import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { storageSchema } from "./storage-schema.mjs";
import { marketplaceInput } from "../src/domain/onboarding.ts";
import {
  categoryInput,
  brandingInput,
  dollarsToMinor,
  minorToDollars,
  onboardingProgress,
} from "../src/domain/management.ts";
import { assetPath, imageKind } from "../src/domain/assets.ts";
import { normalizedImage } from "../src/domain/image-normalization.ts";
const owner = "11111111-1111-4111-a111-111111111111",
  other = "22222222-2222-4222-a222-222222222222",
  sellerUser = "33333333-3333-4333-a333-333333333333";
test("wizard, category, branding and exact USD input contracts", () => {
  const input = {
    name: "My store",
    slug: "  My-Store ",
    mode: "STORE",
    currency: "USD",
    tagline: "Good things",
    description: "A considered collection",
    location: "Austin",
    accent: "#27624c",
  };
  const valid = marketplaceInput(input);
  assert.equal(valid.requested_slug, "my-store");
  assert.equal(valid.branding.description, input.description);
  for (const extra of [
    { owner_user_id: owner },
    { currency: "EUR" },
    { description: "x".repeat(5001) },
    { location: "x".repeat(201) },
    { accent: "red" },
    { mode: "SUPERSTORE" },
  ])
    assert.throws(() => marketplaceInput({ ...input, ...extra }));
  assert.equal(
    categoryInput({
      name: "Home",
      slug: " Home ",
      icon: "⌂",
      status: "archived",
      sortOrder: 1,
    }).slug,
    "home",
  );
  assert.throws(() =>
    categoryInput({
      name: "Home",
      slug: "home",
      icon: "",
      status: "active",
      sortOrder: 0,
      marketplace_id: owner,
    }),
  );
  assert.throws(() => brandingInput({ owner_user_id: owner }));
  assert.equal(dollarsToMinor("90071992547409.91"), "9007199254740991");
  assert.equal(minorToDollars("9007199254740991"), "90071992547409.91");
  for (const amount of ["1.001", "-1", "1e5", "Infinity", "90071992547409.92"])
    assert.throws(() => dollarsToMinor(amount));
  assert.equal(
    onboardingProgress(
      { mode: "STORE", status: "draft" },
      { categories: 0, products: 0 },
    ).percent,
    14,
  );
});
test("image content validation, decoding, bounded dimensions and unique tenant paths", async () => {
  const path = assetPath(owner, other, sellerUser);
  assert.equal(
    path,
    `marketplaces/${owner}/products/${sellerUser}/${other}.webp`,
  );
  assert.throws(() => assetPath("../other", other));
  assert.throws(() =>
    imageKind(
      new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      ),
    ),
  );
  assert.throws(() => imageKind(new Uint8Array(5 * 1024 * 1024 + 1)));
  await assert.rejects(() =>
    normalizedImage(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
    ),
  );
  const png = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#27624c" },
  })
    .png()
    .toBuffer();
  assert.equal(imageKind(png), "png");
  const normalized = await normalizedImage(png);
  const info = await sharp(normalized).metadata();
  assert.equal(info.format, "webp");
  assert.equal(info.exif, undefined);
});
test("Phase 3 database onboarding, publication, catalog and Storage RLS", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
    );
    await db.exec(storageSchema);
    for (const file of readdirSync("supabase/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(readFileSync("supabase/migrations/" + file, "utf8"));
    await db.exec(
      `insert into auth.users(id) values('${owner}'),('${other}'),('${sellerUser}')`,
    );
    const as = async (role, user = "") =>
      db.exec(
        `reset role;select set_config('request.jwt.claim.sub','${user}',false);set role ${role}`,
      );
    const rows = async (sql) => (await db.query(sql)).rows;
    const deny = async (sql, code = "42501") =>
      assert.rejects(
        () => db.exec(sql),
        (e) => e.code === code,
      );
    let store, market, hybrid, category, product, ownerSeller, application;
    await t.test(
      "creation rejects anon and private draft does not appear publicly",
      async () => {
        await as("anon");
        await deny(
          `select public.create_marketplace('denied','Denied','STORE','USD')`,
        );
        await as("authenticated", owner);
        const branding = `'{"description":"Considered goods","tagline":"Good finds","accent":"#27624c"}'::jsonb`;
        store = (
          await rows(
            `select public.create_marketplace('store','Store','STORE','USD',${branding}) id`,
          )
        )[0].id;
        market = (
          await rows(
            `select public.create_marketplace('market','Market','MARKETPLACE','USD',${branding}) id`,
          )
        )[0].id;
        hybrid = (
          await rows(
            `select public.create_marketplace('hybrid','Hybrid','HYBRID','USD',${branding}) id`,
          )
        )[0].id;
        assert.equal(
          (
            await rows(
              `select status from public.marketplaces where id='${store}'`,
            )
          )[0].status,
          "draft",
        );
        ownerSeller = (
          await rows(
            `select id from public.sellers where marketplace_id='${store}'`,
          )
        )[0].id;
        assert.equal(
          (
            await rows(
              `select * from public.sellers where marketplace_id='${market}'`,
            )
          ).length,
          0,
        );
        await deny(
          `select public.publish_marketplace('${store}',true)`,
          "23514",
        );
        await as("anon");
        assert.equal(
          (await rows(`select * from public.marketplaces`)).length,
          0,
        );
        assert.equal(
          (await rows(`select * from public.catalog_products`)).length,
          0,
        );
      },
    );
    await t.test(
      "category duplicate slug, tenant scope and branding isolation",
      async () => {
        await as("authenticated", owner);
        category = (
          await rows(
            `insert into public.categories(marketplace_id,slug,name) values('${store}','home','Home') returning id`,
          )
        )[0].id;
        await deny(
          `insert into public.categories(marketplace_id,slug,name) values('${store}','home','Duplicate')`,
          "23505",
        );
        await db.exec(
          `insert into public.categories(marketplace_id,slug,name) values('${market}','home','Home'),('${hybrid}','home','Home')`,
        );
        await as("authenticated", other);
        assert.equal(
          (
            await rows(
              `update public.categories set name='Hijack' where id='${category}' returning id`,
            )
          ).length,
          0,
        );
        await deny(
          `insert into public.categories(marketplace_id,slug,name) values('${store}','hijack','Hijack')`,
        );
        assert.equal(
          (
            await rows(
              `update public.marketplaces set accent='#ff0000' where id='${store}' returning id`,
            )
          ).length,
          0,
        );
        await as("authenticated", owner);
        assert.equal(
          (
            await rows(
              `select accent from public.marketplaces where id='${store}'`,
            )
          )[0].accent,
          "#27624c",
        );
      },
    );
    await t.test(
      "own listing, SKU, archive and first-product publication guard",
      async () => {
        await as("authenticated", owner);
        product = (
          await rows(
            `select public.save_listing('${store}','${ownerSeller}',null,'${category}','First product','A description',12900,10,'draft','FIRST-001') id`,
          )
        )[0].id;
        for (const tenant of [store, market, hybrid])
          await db.exec(
            `select public.complete_setup('${tenant}','branding');select public.complete_setup('${tenant}','store');select public.complete_setup('${tenant}','preview')`,
          );
        await deny(
          `select public.publish_marketplace('${store}',true)`,
          "23514",
        );
        await db.exec(
          `select public.save_listing('${store}','${ownerSeller}','${product}','${category}','First product','A description',12900,10,'active','FIRST-001');select public.publish_marketplace('${store}',true);select public.publish_marketplace('${market}',true)`,
        );
        await as("authenticated", other);
        await deny(
          `select public.save_listing('${store}','${ownerSeller}','${product}','${category}','Hijack','',1,1,'active','BAD')`,
        );
        await as("anon");
        assert.equal(
          (
            await rows(
              `select id from public.catalog_products where id='${product}'`,
            )
          ).length,
          1,
        );
        await as("authenticated", owner);
        await db.exec(
          `select public.save_listing('${store}','${ownerSeller}','${product}','${category}','First product','A description',12900,10,'archived','FIRST-001')`,
        );
        await as("anon");
        assert.equal(
          (
            await rows(
              `select id from public.catalog_products where id='${product}'`,
            )
          ).length,
          0,
        );
        await as("authenticated", owner);
        await db.exec(
          `update public.products set status='active' where id='${product}';update public.categories set status='archived' where id='${category}'`,
        );
        await as("anon");
        assert.equal(
          (
            await rows(
              `select id from public.catalog_products where id='${product}'`,
            )
          ).length,
          0,
        );
        await as("authenticated", owner);
        await db.exec(
          `update public.categories set status='active' where id='${category}'`,
        );
      },
    );
    await t.test(
      "STORE rejection, MARKETPLACE approval and HYBRID owner inventory",
      async () => {
        await as("authenticated", sellerUser);
        await deny(`select public.apply_seller('${store}','Third party','')`);
        application = (
          await rows(
            `select public.apply_seller('${market}','Independent maker','Small business') id`,
          )
        )[0].id;
        assert.equal(
          (
            await rows(
              `select status from public.sellers where id='${application}'`,
            )
          )[0].status,
          "pending",
        );
        await deny(
          `select public.review_seller('${market}','${application}','active')`,
        );
        await as("authenticated", owner);
        await db.exec(
          `select public.review_seller('${market}','${application}','active')`,
        );
        await as("authenticated", sellerUser);
        assert.equal(
          (
            await rows(
              `select status from public.sellers where id='${application}'`,
            )
          )[0].status,
          "active",
        );
        await as("authenticated", owner);
        await db.exec(
          `select public.review_seller('${market}','${application}','suspended')`,
        );
        await as("authenticated", sellerUser);
        assert.equal(
          (
            await rows(
              `select status from public.sellers where id='${application}'`,
            )
          )[0].status,
          "suspended",
        );
        await as("authenticated", owner);
        await db.exec(
          `select public.review_seller('${market}','${application}','rejected')`,
        );
        await as("authenticated", sellerUser);
        assert.equal(
          (
            await rows(
              `select status from public.sellers where id='${application}'`,
            )
          )[0].status,
          "rejected",
        );
        await as("authenticated", owner);
        const hs = (
          await rows(
            `select id from public.sellers where marketplace_id='${hybrid}'`,
          )
        )[0].id;
        const hc = (
          await rows(
            `select id from public.categories where marketplace_id='${hybrid}'`,
          )
        )[0].id;
        await db.exec(
          `select public.save_listing('${hybrid}','${hs}',null,'${hc}','Hybrid owner product','',1000,2,'active','HYBRID-001');select public.publish_marketplace('${hybrid}',true)`,
        );
        await as("authenticated", sellerUser);
        assert.ok(
          (
            await rows(
              `select public.apply_seller('${hybrid}','Hybrid seller','') id`,
            )
          )[0].id,
        );
      },
    );
    await t.test(
      "Storage enforces object tenant and product owner, including permissive policy attack",
      async () => {
        const logo = assetPath(store, owner),
          photo = assetPath(store, other, product);
        await as("postgres");
        await db.exec(
          `create policy unrelated_broad_policy on storage.objects for all to authenticated using(true) with check(true)`,
        );
        await as("authenticated", owner);
        await db.exec(
          `insert into storage.objects(bucket_id,name) values('marketplace-assets','${logo}'),('product-images','${photo}')`,
        );
        await db.exec(
          `update public.marketplaces set logo_path='${logo}' where id='${store}';update public.products set image_path='${photo}' where id='${product}'`,
        );
        await deny(
          `update public.marketplaces set logo_path='${assetPath(market, owner)}' where id='${store}'`,
          "23514",
        );
        await as("authenticated", other);
        await deny(
          `insert into storage.objects(bucket_id,name) values('marketplace-assets','${assetPath(store, sellerUser)}')`,
        );
        await deny(
          `insert into storage.objects(bucket_id,name) values('product-images','${assetPath(store, sellerUser, product)}')`,
        );
        assert.equal(
          (
            await rows(
              `update storage.objects set name='overwritten' where name='${photo}' returning id`,
            )
          ).length,
          0,
        );
        assert.equal(
          (
            await rows(
              `delete from storage.objects where name='${photo}' returning id`,
            )
          ).length,
          0,
        );
        await as("anon");
        assert.equal(
          (
            await rows(
              `select * from storage.objects where name in ('${photo}','${logo}')`,
            )
          ).length,
          2,
        );
        await as("authenticated", owner);
        await db.exec(`select public.publish_marketplace('${store}',false)`);
        await as("anon");
        assert.equal(
          (
            await rows(
              `select * from storage.objects where name in ('${photo}','${logo}')`,
            )
          ).length,
          0,
        );
        await as("authenticated", other);
        assert.equal(
          (await rows(`select * from storage.objects where name='${photo}'`))
            .length,
          0,
        );
        await as("authenticated", owner);
        assert.equal(
          (await rows(`select * from storage.objects where name='${photo}'`))
            .length,
          1,
        );
        for (const path of [
          "../escape",
          "marketplaces/bad/logo/file.webp",
          `marketplaces/${store}/products/${product}/../file.webp`,
        ])
          await deny(
            `insert into storage.objects(bucket_id,name) values('product-images','${path}')`,
          );
      },
    );
  } finally {
    await db.close();
  }
});
