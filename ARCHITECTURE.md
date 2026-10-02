# GoXAvni Commerce — Phase 3

GoXAvni Commerce is a multi-tenant Next.js App Router application with a Supabase/PostgreSQL foundation. The original frontend remains available as an explicitly isolated development demo. Configured deployments read real catalogs, authenticate with Supabase, and authorize private operations on the server and in PostgreSQL. Payments and order placement are not implemented.

## Directory structure

```text
src/
  app/
    create/                      Authenticated five-step marketplace wizard
    demo/create, demo/manage     Explicit, non-writing wizard/dashboard previews
    m/[tenant]/[[...segments]]/   Tenant route validation and server authorization
    admin/[[...segments]]/        Protected global administration
    auth/                        Sign-in/up, PKCE callback, email confirmation
    demo/[[...segments]]/         Explicit fixture-only workspaces
    api/v1/                      JSON APIs for catalog, identity, cart, listings, settings
  auth/                          Supabase identity verification, page guards, auth actions
  api/mutations.ts               CSRF-origin and bounded JSON-body handling
  lib/supabase/                  Public configuration and request-scoped server clients
  domain/
    models.ts                    Original demo models (all Phase 1 concepts)
    catalog.ts                   Database-backed public DTOs with string minor-unit amounts
    authorization.ts             Independently testable permission checks
    api.ts, listing.ts           UUID, pagination, redirect, money and listing validation
    commerce.ts                  Preserved demo catalog/cart rules
    errors.ts                    Safe JSON error contract
  data-access/                   Supabase query adapters
  services/                      Catalog, cart, seller-listing and marketplace operations
  components/
    live-*                       Database-backed storefront, account, workspace and forms
    auth-form.tsx                Shared sign-in/sign-up form
    commerce-provider.tsx        Demo-only localStorage state
    home/browse/product-*/...    Preserved mock storefront and workspaces
    ui.tsx, data-table.tsx        Shared design primitives
  data/mock.ts                   Deterministic prototype fixtures
  proxy.ts                       Cookie-session refresh (not the authorization boundary)
supabase/
  migrations/                    Schema/RLS, cart transaction, listing transaction
  seed.sql                       Password-free development fixtures
  config.toml                    Local Supabase configuration
scripts/generate-seed.mjs         Deterministic SQL seed generator
tests/                           Unit, embedded PostgreSQL, HTTP and optional Supabase tests
docs/DATABASE.md                 Schema, money, setup and bootstrap procedures
docs/AUTHORIZATION.md             Identity, roles, policies and security boundaries
```

The boundaries are intentionally small: route adapters → services → data access/SQL. Business authorization, money representation, catalog eligibility, and cart validation do not depend on React. UI forms call versioned JSON APIs; no service-role client or browser-owned authorization data is used.

## Domain and tenant model

The domain includes User/Profile, Marketplace, MarketplaceMembership, Seller, Store, Product, ProductVariant, Category, Cart, CartItem, Order, OrderItem, Review, Conversation, ConversationParticipant, and Message. Global users have multiple tenant memberships; a selling business and its storefront are tenant-specific. Products have independently priced/stocked variants. Orders retain seller-attributed line snapshots. Conversations have explicit participants.

All database identities are UUIDs. Tenant-owned rows carry `marketplace_id`; composite foreign keys prevent cross-tenant references and inconsistent product/seller/variant attribution. Public routes resolve a tenant slug to a stable database ID. User-supplied tenant IDs select a resource, not an authorization context. Identity and relationship fields cannot be reassigned by ordinary updates. A future verified custom-domain registry can resolve hostnames to the same tenant IDs.

GoXAvni is a normal HYBRID seed tenant. Atelier Living is STORE, and Makers Collective is MARKETPLACE. SQL derives owner inventory from the seller's `user_id` and marketplace's `owner_user_id`; no client flag determines ownership. Public SQL catalog views and cart mutations enforce the mode, marketplace/category/seller/product/variant status. Mode changes preserve excluded inventory for management.

## Roles and authentication

A user may hold buyer, seller, marketplace_owner, and marketplace_staff roles simultaneously across memberships. Platform administrator is a separate database allowlist. Supabase Auth supplies the single identity; signup creates only a profile. Server helpers verify the user and load database grants, then RLS checks the same subject. Private seller, owner, and admin pages are guarded before rendering. Seller pages derive the seller from the authenticated identity, replacing the mock selector.

Browser sessions use Supabase SSR cookies and proxy refresh. APIs support both verified cookies and bearer tokens for mobile. No localStorage identity, URL role, signup metadata, caller price, or arbitrary seller ID grants permission. See [AUTHORIZATION.md](docs/AUTHORIZATION.md) for the policy matrix and bootstrap constraints.

## Routes

Tenant routes retain the `/m/:tenant` prefix:

| Area        | Paths                                                                                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public      | `/`, `/products`, `/category/:slug`, `/product/:uuid`, `/store/:sellerUuid`                                                                                                                               |
| Account     | `/cart`, `/checkout`, `/favorites`, `/orders`, `/messages`, `/profile`                                                                                                                                    |
| Seller      | `/seller`, `/seller/products`, `/seller/listing`, `/seller/listing/:uuid`, `/seller/orders`, `/seller/inventory`, `/seller/sales`, `/seller/payouts`, `/seller/settings`                                  |
| Marketplace | `/owner`, `/owner/setup`, `/owner/branding`, `/owner/store-settings`, `/owner/sellers`, `/owner/products`, `/owner/orders`, `/owner/customers`, `/owner/analytics`, `/owner/commission`, `/owner/domains` |
| Global      | `/admin`, `/admin/marketplaces`, `/admin/users`, `/admin/sellers`, `/admin/transactions`, `/admin/disputes`, `/admin/moderation`                                                                          |
| Auth        | `/auth/sign-in`, `/auth/sign-up`, `/auth/callback`, `/auth/confirm`                                                                                                                                       |
| Demo        | `/demo/m/:tenant/...`, `/demo/admin/...` (unconfigured development only)                                                                                                                                  |

The root redirects to the deployment's default GoXAvni tenant; reusable business rules do not special-case it. App Router catch-all entries validate supported paths and dispatch to focused components. Unknown resources fail with not-found or explicit errors. Private pages are never opened by demo state.

## Database-backed behavior

With Supabase configured:

- Public homepage, categories, paginated/searchable catalog, product details, variants, and seller storefronts read real rows.
- Sign-up, sign-in, confirmation, sign-out, session refresh, and server-guarded workspaces are connected.
- Authenticated carts support atomic additions, quantity replacement, removals, own-cart reads, and exact database-derived totals. Cart additions do not reserve stock.
- Sellers can create/edit their own listings and Original variant price/stock through a transactional RPC. Inventory and attributable order lines are live reads.
- Owners/admins can update branding, operating mode, and commission basis points. Staff cannot modify owner-only settings.
- Tenant management reads products, sellers, orders, and membership-based customer identifiers. Platform views read marketplaces, profiles, sellers, and order transaction snapshots under global authorization.
- Buyers read their own orders and participant-authorized messages. Private data never falls back to fixtures.

Some Phase 1 screens remain prototype-only workflows: detailed analytics, payouts, custom domains, disputes, moderation queues, advanced seller settings, shipping/return settings, profile editing, favorites persistence, and conversation composition. Real-mode routes explicitly identify remaining work instead of fabricating reports or storing business changes in localStorage. The database already defines secure review and conversation/message policies; full UI/API workflows for those resources are deferred. No payments, order-placement API, production order writer, or fulfillment are present. Marketplace logos and product primary images are supported.

## API and money contracts

| Method and path                                       | Behavior                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `GET /api/v1/marketplaces/:uuid/products`             | Public database catalog; `q`, category slug, `page`, `pageSize` |
| `GET /api/v1/me`                                      | Verified identity and own memberships                           |
| `GET /api/v1/marketplaces/:uuid/cart`                 | Own cart and current server-calculated amounts                  |
| `POST /api/v1/marketplaces/:uuid/cart`                | Add `{ variantId, quantity }`; no client prices                 |
| `DELETE /api/v1/marketplaces/:uuid/cart?itemId=:uuid` | Remove an item from the verified user's cart                    |
| `POST /api/v1/marketplaces/:uuid/listings`            | Create/edit an authorized seller listing                        |
| `PATCH /api/v1/marketplaces/:uuid/settings`           | Owner/admin-only settings and commission changes                |

Success responses contain `{ data }`, with catalog `{ meta: { marketplaceId, currency, page, pageSize, total, hasNext, source } }`. Errors are `{ error: { code, message } }` with appropriate status and no raw database details. Catalog sorting uses `created_at` plus ID for deterministic offset pagination. Default page size is 20, maximum 100, and page number is capped at 10,000. UUID resource IDs replace fixture names at real API boundaries. APIs never use demo fallback data.

Canonical money is PostgreSQL BIGINT in integer minor units. Public and authenticated DTO views cast money in SQL and encode amounts as decimal strings; services use `BigInt` arithmetic and currency exponents for display. SQL bounds direct-driver values to the exact JavaScript integer range. See [DATABASE.md](docs/DATABASE.md) for constraints. Legacy floating-point prototype display models remain exclusively in the isolated demo, not production services.

## Demo compatibility

With no Supabase environment variables, development public pages retain the original localStorage demo and display a banner. `/demo/m/goxavni/seller` and `/demo/admin` retain interactive fixture workspaces. Links and listing saves stay within the demo prefix. These pages have no real database access. Real seller/owner/admin URLs still redirect unauthenticated users to sign-in.

Production requires `ALLOW_DEMO=true` to expose this fallback. Providing only half the Supabase configuration is an error, not an invitation to fall back. Configured connection/query failures also never switch to mock data. The demo remains under the existing `commerce-demo-v1` localStorage key, separate from live sessions and database state.

## Android and future backend evolution

Android can authenticate against the same Supabase Auth project and send its access token to versioned JSON APIs. The API server verifies the token, resolves database membership, and uses the caller-scoped Supabase client so RLS remains effective. Android does not need Next.js server actions or browser cookies. Future iOS and public API clients use the same stable UUID/decimal-string contracts. Introduce an OpenAPI specification, generated Kotlin/Swift/TypeScript clients, API credential scopes, rate limiting, and cursor pagination as client needs grow.

The current server layer can stay inside Next.js or move to a separate service behind unchanged contracts. Phase 3 should add server-calculated order placement with stock reservation, idempotency, shipping/tax/commission snapshots, transactional outbox/audit events, storage uploads, messaging workflows, and full management operations. Payment processing is intentionally outside this phase.

## Verification and environment

Run `npm run lint`, `npm test`, and `npm run build`. `npm test` includes pure authorization/validation tests, the original demo domain tests, and actual migration/RLS/RPC execution in embedded PostgreSQL (PGlite). `npm run test:smoke` checks the unconfigured local demo, private redirects, and safe API failures. `npm run test:integration` is a separate opt-in suite for real Supabase Auth/PostgREST; it skips without explicit environment configuration.

Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `APP_ORIGIN` manually. Optional `ALLOW_DEMO` controls only the unconfigured production demo. No service-role key, password, or JWT secret belongs in the application. Setup and manual migration/bootstrap commands are in [DATABASE.md](docs/DATABASE.md).

## Security hardening follow-up

Migration 004 preserves the architecture and UI while closing private admin read overrides, restricting seller and cart direct writes, and adding database validation. `src/services/onboarding.ts` and `src/domain/onboarding.ts` expose validated atomic marketplace creation and seller application/review workflows. `src/domain/mutations.ts` contains testable CSRF/body boundaries; auth actions enforce origin independently of proxy.

New routes: POST `/api/v1/marketplaces` creates caller-owned tenant; POST `/api/v1/marketplaces/:uuid/sellers` applies; PATCH on that route reviews as tenant manager; PATCH `/api/v1/marketplaces/:uuid/cart` replaces a variant quantity. All preserve verified bearer support for Android and common error envelopes. No UI redesign or payment functionality is included.

See [SECURITY.md](docs/SECURITY.md) for the operation-by-operation permission matrix, every definer function, locking strategy, test limitations, and production rate-limit plan. New RPCs are not permission to expose unthrottled public onboarding in production.

## Phase 3 onboarding and management

`/create` authenticates before showing the five-step business/type/branding/currency/review wizard. It sends validated fields to the existing marketplace creation service/RPC; owner identity is never a request field. Creation now atomically produces a **draft** tenant and its owner membership, plus owner seller/store in STORE/HYBRID. USD is the only currency accepted for new tenants; persisted currency fields and string minor-unit contracts remain currency-aware.

Managers can work in draft or active tenants; suspended tenants remain unavailable to ordinary memberships. Anonymous public catalog/image access still requires active status. `/m/:slug/owner/preview` is a server-authorized preview, including optional `?previewProduct=:uuid`; it uses tenant-scoped authenticated projections, filters by mode/category/product/seller visibility, and does not allow purchasing. It is not a public draft token/link.

Owner dashboard counts and launch progress come from tenant database rows and explicit branding/store/preview completion timestamps. Publication is an owner RPC: branding and store information, preview acknowledgement, an active category and an active owner product are required for STORE/HYBRID. MARKETPLACE can publish before inventory exists so third-party sellers can apply; its first-product checklist item remains incomplete until a seller adds one. Saving branding validates current fields, and publish checks current description/hero content rather than trusting timestamps alone.

Focused UI modules include `marketplace-wizard`, `owner-overview`, `category-manager`, `branding-editor`, `seller-applications`, `management-content`, and `management-actions`. `domain/management.ts` holds validation, exact USD parsing and checklist calculation. Services and data-access modules remain independent of React. `sharp` decodes, bounds, strips metadata and normalizes uploads; private Supabase Storage policies enforce tenant/resource access. See [STORAGE.md](docs/STORAGE.md).

New owner pages: `categories`, `listing`, `listing/:uuid`, `preview`, `publish`; branding/setup/store-settings and sellers are now connected editors. Owners/staff may edit authorized tenant products; seller pages derive the seller from the current user. Creation without an owner seller prompts managers to choose an approved seller rather than manufacturing owner inventory in MARKETPLACE mode. Categories use tenant-unique slugs, archive status and numeric display order. SKU edits and product draft/publish/archive changes are transactional with the Original variant.

The public storefront reflects saved logo/name/tagline/accent/hero content; categories, featured/new collections, variant stock and seller descriptions come from the database. Seller application links are hidden for STORE. `/m/:slug/apply` authenticates applicants and displays their own pending/approved/rejected/suspended state. Decisions use the hardened review RPC; public seller pages never display moderation state.

New versioned contracts (all writes enforce origin or verified bearer token):

| Method / tenant-relative endpoint           | Contract                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| POST `/api/v1/marketplaces`                 | Existing name/slug/mode/currency plus optional tagline/description/location/accent; returns UUID and slug |
| GET `/api/v1/marketplaces/:uuid/management` | Manager-only marketplace, counts, categories, sellers and recent product summaries                        |
| GET `.../listings?productId=:uuid`          | Authorized product editor data plus categories; omit ID for the caller's seller catalog                   |
| GET `.../sellers`                           | Current user's application or null                                                                        |
| POST `.../categories`                       | Optional id, name, slug, icon, status, sortOrder; creates or updates, including archive                   |
| POST `.../branding`                         | Name/tagline/description/location/accent/heroHeading/heroDescription                                      |
| POST `.../setup`                            | action: branding/store/preview/publish/unpublish; owner only                                              |
| POST `.../assets?productId=:uuid`           | Raw image bytes; omit productId for logo; returns path and authorized image URL                           |
| GET `.../assets?productId=:uuid`            | RLS-filtered normalized WebP bytes, private no-store response                                             |

Listing POST adds optional SKU and accepts archived status. Amounts remain decimal minor-unit strings; the USD form uses BigInt decimal parsing rather than float multiplication. Management/listing reads preserve SQL text casts. Android can execute the same setup, category, product, application, branding, publication and binary upload operations without React or server actions.

## Future hostname resolution

Current canonical storefront URLs are `/m/:slug`. A future `marketplace_domains` registry will map normalized, verified hosts to marketplace UUIDs, with unique host ownership, pending/verified state and proof of control. Resolve `{slug}.goxavni.com` only on an explicitly configured base domain; reserve platform names such as `www`, `api`, and `admin`. Resolve custom hosts only through the verified registry, never by trusting arbitrary Host/forwarding input or deriving authorization from a hostname. Reject unknown hosts, use trusted proxy forwarding rules, and retain UUID-scoped service/RLS checks after resolution. Extend CSRF allowed origins only for verified tenant domains, and review cookie isolation, TLS and cache keys before rollout. DNS automation, wildcard hosting, custom-domain verification and cookie sharing are not implemented.

Public mobile reads are also available through GET `/api/v1/marketplaces/:uuid` (branding/categories), GET `.../products/:productUuid` (product/variants), and GET `.../stores/:sellerUuid` (public seller description and paginated eligible products). These use anonymous catalog clients, so even a manager token cannot turn the public API into a draft preview.
