# Database setup and schema

## Apply locally

Prerequisites: Node 22.18+, npm, Supabase CLI, and a running Docker daemon.

```sh
npm ci
supabase start
supabase migration up --local
```

For a **disposable local database only**, `supabase db reset --local` applies migrations and `supabase/seed.sql`. It destroys local data. Do not run a remote reset. No migration or reset command is run automatically by the application or npm scripts.

Copy `.env.example` to `.env.local`, then set the local project URL and **anon/publishable** key from `supabase status`. Do not use the service-role key printed by that command. Set `APP_ORIGIN` to the exact origin you use in the browser (for example `http://127.0.0.1:3000`). Run `npm run dev` and visit `/auth/sign-up`.

Email confirmation is enabled in `supabase/config.toml`. Open the local email testing inbox at the address shown by `supabase status`. The app supports PKCE code exchange at `/auth/callback`, as well as `/auth/confirm?token_hash=...&type=email` for a customized confirmation email template. The local redirect allowlist includes both localhost and 127.0.0.1 callback URLs.

## Apply to a chosen hosted project

Review all SQL first, back up existing data, and select the intended project explicitly:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

These commands are manual. The development seed is not suitable for production and must not be pushed with `--include-seed` to production. Existing `auth.users` receive a profile during the first migration; the auth trigger provisions subsequent profiles. If you have existing tables with these names, reconcile your schema before applying this initial migration.

Configure hosted Auth Site URL and allowed callback URLs to your actual deployment origin. Enable email confirmations and configure your mail provider in Supabase. Account confirmation and delivery must be verified in that environment before release.

## Migrations

| File                        | Responsibility                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `202610020001_commerce.sql` | Tables, constraints, indexes, profile trigger, immutable identities, RLS, public catalog views, conversation creation |
| `202610020002_cart.sql`     | Original atomic cart additions (superseded by hardening shared add/set implementation)                                |
| `202610020003_listings.sql` | Transactional seller-authorized listing and Original variant creation/update                                          |

Migration `202610020004_security_hardening.sql` adds onboarding RPCs, participant-only privacy, strict validation, locked cart set/add operations, restricted grants, and authenticated monetary DTO views. It validates existing rows: incompatible legacy data must be reviewed and corrected before applying; nothing is silently truncated. See [SECURITY.md](SECURITY.md) for the full matrix and definer inventory.

## Schema

All resource primary keys are UUIDs. Timestamps use `timestamptz`; applicable mutable tables maintain `updated_at` with a trigger. Tenant records carry `marketplace_id`. Public slugs are routing conveniences; authorization and APIs use stable UUIDs.

| Table                       | Purpose and tenant boundary                                                          |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `profiles`                  | Global identity, PK references `auth.users`; display name/avatar only                |
| `platform_admins`           | Global administrator allowlist, provisioned only by trusted SQL; no client writes    |
| `marketplaces`              | Tenant, owner identity, mode, status, brand, currency, commission basis points       |
| `marketplace_memberships`   | User + tenant, active/suspended status and an array of tenant roles                  |
| `sellers`                   | Tenant-specific selling business tied to one user; active/pending/suspended/rejected |
| `stores`                    | Public storefront for one tenant seller                                              |
| `categories`                | Tenant catalog taxonomy and public status                                            |
| `products`                  | Tenant + seller + category, listing status, base amount/currency                     |
| `product_variants`          | Tenant + product, SKU, inventory, amount/currency, visibility                        |
| `carts`                     | One cart per authenticated user per tenant                                           |
| `cart_items`                | Cart + product + variant + positive integer quantity; no stored client prices        |
| `orders`                    | Buyer, tenant, status, immutable monetary snapshots; client writes disabled          |
| `order_items`               | Tenant-safe order/product/variant/seller attribution and monetary snapshots          |
| `reviews`                   | One buyer review per tenant/product; writes require a delivered purchase             |
| `conversations`             | Tenant + seller and creator; participants control access                             |
| `conversation_participants` | Conversation/user membership; no direct client mutation                              |
| `messages`                  | Tenant + conversation + sender participant; append-only for clients                  |

Composite FKs tie `(marketplace_id, seller_id)`, `(marketplace_id, category_id)`, `(marketplace_id, product_id)`, and `(marketplace_id, conversation_id)` to their parent rows. Additional product/seller and product/variant composite FKs prevent an order item from attributing a product to the wrong seller, even inside the same tenant. A message's sender must be a participant of its exact tenant/conversation. Currency FKs keep variant, product, marketplace, and order currencies consistent. Identity/ownership columns are immutable on update, preventing resource reassignment after authorization. Ownership transfer requires a separately reviewed migration/workflow; it is not a settings form feature.

## Money

Canonical money is PostgreSQL `BIGINT`: `price_amount`, `subtotal_amount`, `total_amount`, and `commission_amount`. Currency is a three-uppercase-letter code. Commission configuration uses integer basis points (100 = 1%). Monetary columns are nonnegative and capped at `9007199254740991` to keep direct Supabase integer decoding exact. Public catalog views cast amounts to `text` before JSON serialization; versioned DTOs carry decimal **strings**, such as `"12900"`, not JavaScript decimal prices. Cart arithmetic uses `BigInt`; currency-aware formatting never computes totals with floating point. This application currently seeds USD, while the formatter respects other currency exponents.

Seller listing writes accept an integer minor-unit string, validate seller access, and write through a transactional RPC. Buyers cannot write products, commissions, orders, or order snapshots. Cart APIs accept only a variant UUID and integer quantity, resolve the current database price on reads, and verify stock and marketplace mode when adding. A cart does not reserve stock. Order creation, reservation, settlement, taxes, and shipping calculations remain Phase 3; there is no payable checkout.

## Development fixtures and real users

`supabase/seed.sql` recreates GoXAvni (HYBRID), Atelier Living (STORE), and Makers Collective (MARKETPLACE), with six seller entities, 24 products, 48 variants, categories, orders, and conversations. IDs are deterministic UUIDs. `npm run db:seed:generate` regenerates the SQL from the prototype fixtures using `scripts/generate-seed.mjs`.

Seeded auth rows use reserved `.example.test` emails and **have no passwords or sign-in identities**. They are relationship fixtures, not usable demo logins. No platform administrator is seeded. Create a real test user through `/auth/sign-up`; confirm it before testing. To bootstrap a trusted development administrator after reviewing the identity, use Supabase's SQL editor:

```sql
-- Replace with the UUID of your confirmed test user, never a value from an untrusted request.
insert into public.platform_admins(user_id)
values ('YOUR_CONFIRMED_AUTH_USER_UUID'::uuid);
```

This grants global permissions to that specific user and is deliberately not exposed by the application.

For ordinary ownership, sign in and call `POST /api/v1/marketplaces` with `{ "slug": "my-shop", "name": "My shop", "mode": "HYBRID", "currency": "USD" }`. The service calls `create_marketplace`; caller identity becomes owner and owner membership/seller/store are created atomically as applicable. Supply the exact Origin header for cookies or a verified bearer token for mobile/API use.

For seller onboarding, `POST /api/v1/marketplaces/:uuid/sellers` accepts `{ "name": "My brand", "description": "Independent products" }` and creates a pending application for the caller. A different tenant owner/staff user calls `PATCH` on the same URL with `{ "sellerId": "UUID", "decision": "active" }`; decisions also include `suspended` and `rejected`. Direct seller identity writes are no longer available. These endpoints have no new UI in this hardening phase. Bootstrap real test users through Auth, not fixture passwords or signup roles.

All app monetary reads use `catalog_*` or `secure_*` security-invoker text projections. Persisted amounts remain capped at MAX_SAFE_INTEGER; derived cart totals may exceed it and remain BigInt/string. Do not consume raw base-table monetary JSON in mobile or application code.

## Verification

`npm test` includes a PGlite suite that executes the actual SQL migrations and seed on embedded PostgreSQL, using a minimal emulation of Supabase's `auth.users`/`auth.uid()`. It exercises real SQL grants, RLS, constraints, and transactional RPCs. It does not emulate email delivery, PostgREST, cookies, GoTrue, or a hosted network.

The separate `npm run test:integration` suite is read-only and skips without `RUN_SUPABASE_INTEGRATION=true`, the two Supabase public variables, and a migrated development project. An optional `SUPABASE_TEST_ACCESS_TOKEN` checks a real signed session; keep that token outside source control. In PowerShell, set those environment variables for the test process (or load them through your local environment tooling). Never paste tokens into committed files or logs.

Local Docker was unavailable during implementation, so hosted Auth/PostgREST integration was not executed. The embedded database tests and unconfigured HTTP security tests were executed. Apply the migrations and complete the integration tests before deploying with real users.

## Phase 3 migrations and setup

Apply `202610020005_onboarding.sql` and `202610020006_storage.sql` in order using the existing manual `supabase db push --dry-run` / `supabase db push` workflow (or `supabase migration up --local` against a running local stack). No reset is needed. Migration 005 adds marketplace description/location/hero/logo and completion timestamps, product image paths, category ordering/archive status, draft-aware management policies, publication/setup RPCs, expanded creation input, and SKU/archive listing support. Existing active tenants keep their status; newly created tenants are drafts. Migration 006 creates/updates private Storage buckets, safe-path authorization and restrictive guard policies. Supabase's managed `storage` schema must already exist; do not substitute the test fixture schema on a real project.

The `create_marketplace` signature adds optional `branding jsonb`; only tagline, description, accent and location strings are accepted. It still derives uid and provisions all identity rows in one transaction. New currency selection is limited to USD. `save_listing` adds optional `sku_code`; previous named argument calls continue to work via defaults. New `complete_setup` and `publish_marketplace` functions are authenticated-only, empty-search-path definers with owner checks; completion/status columns have no direct client update grants.

Draft managers need private marketplace reads to edit and preview. Active seller memberships can also resolve their own draft tenant for authorized catalog editing. Public eligibility functions still require publication. A draft is not a suspension: suspension continues to deny ordinary management and is not reversible through the publication RPC. The existing hardening tests explicitly publish their test fixture before exercising public application flows; separate Phase 3 tests cover the new private lifecycle.

Additional fields are bounded by SQL checks; image paths must contain the correct tenant and product UUID. Category slugs remain unique inside a tenant; numeric sort_order is 0..10,000. Archive hides affected products without deleting order history. Authenticated/public product text views are refreshed to include image paths without returning numeric monetary columns.

Configure the existing Supabase URL, publishable key and exact APP_ORIGIN. Keep email confirmation and redirect allowlists enabled. Apply both migrations before running the new UI. Buckets need no manual public-access toggle and must remain private. See STORAGE.md for upload limits and SECURITY.md for production throttling prerequisites.
