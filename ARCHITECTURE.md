# GoXAvni Commerce architecture

## Scope

This is a navigable frontend prototype built with Next.js App Router, React, TypeScript, and Tailwind CSS v4. It includes a public marketplace, seller studio, marketplace management, and platform administration. There is no authentication, payment processing, Supabase connection, production database, or real message delivery.

## Directory structure

```text
src/
  app/
    layout.tsx                    Global styles and demo state provider
    page.tsx                      Redirect to the default public tenant
    m/[tenant]/[[...segments]]/    Validated tenant route entry
    admin/[[...segments]]/         Platform route entry
    api/v1/marketplaces/[marketplaceId]/products/  Read-only mock catalog API
    globals.css                   Tailwind entry and shared responsive design system
    not-found.tsx                 Route fallback (client shell handles demo hydration)
  components/
    commerce-app.tsx              Route-to-view composition and tenant resolution
    commerce-provider.tsx         Browser-local demo state and notifications
    store-shell.tsx               Shared storefront header, navigation, footer
    product-card.tsx              Reusable product discovery card
    store-pages.tsx               Exports focused home, browse, cart, detail and account views
    workspace.tsx                 Shared dashboard navigation and layout
    workspace-content.tsx         Tenant/seller reports and management tables
    workspace-settings.tsx        Marketplace and seller settings forms
    listing-form.tsx              Create/edit listing form
    data-table.tsx                Searchable, horizontally scrollable record table
    ui.tsx                        Icons, headings and empty states
  domain/
    models.ts                     Framework-independent domain interfaces
    commerce.ts                   Tenant/mode catalog selection, cart joins, money display
  data/mock.ts                    Deterministic, related sample records
tests/commerce.test.mjs            Tenant isolation, mode and cart relationship tests
```

Routes share shells and primitives instead of copying pages. Optional catch-all route entries keep the initial route tree compact; domain logic remains independent of the router. As features grow, move their view components into feature folders and replace catch-all dispatch with explicit nested routes and server layouts. The mock provider is intentionally a small React context, rather than a state-management dependency or a generalized repository framework.

## Domain concepts

- **User** is a global identity, not a separate account per role. Platform roles are stored separately from marketplace memberships.
- **Marketplace** is the tenant boundary, with its own brand, mode, owner, commission configuration, and eventual domain.
- **MarketplaceMembership** associates a user with a tenant and an array of roles. Membership does not imply access to other tenants.
- **Seller** is a tenant-specific selling business associated with a user. `isOwner` identifies the marketplace owner's own selling entity. **Store** is the seller's storefront identity.
- **Product**, **ProductVariant**, and **Category** form the catalog. A product belongs to a seller and category in the same tenant. Variants have their own SKU, price, and stock. Draft products are excluded from public discovery.
- **Cart** and **CartItem** model a buyer's tenant-specific bag. The browser stores line items; each line carries its tenant ID. Variant joins determine price and reject mismatched tenant/product/variant relationships.
- **Order** and **OrderItem** preserve a purchase snapshot and seller attribution. Seller reports include only that seller's items, including for future mixed-seller orders.
- **Review** associates a rating and comment with a product and user in a tenant.
- **Conversation** identifies participants and a seller; **Message** belongs to that tenant and conversation.

All requested interfaces are in `src/domain/models.ts`. Mock monetary values are USD decimal numbers for display. A backend should use integer minor units plus explicit currency, calculate totals on the server, and preserve immutable order-line snapshots.

## Tenant model

The seed contains three tenants:

| Tenant            | Mode        | Catalog visibility                    |
| ----------------- | ----------- | ------------------------------------- |
| GoXAvni           | HYBRID      | Owner and third-party seller products |
| Atelier Living    | STORE       | Owner products only                   |
| Makers Collective | MARKETPLACE | Third-party seller products only      |

GoXAvni is a normal fixture, not a special branch in commerce rules. `/` is the deployment's default-tenant redirect; reusable components receive tenant data. Tenant slugs resolve to stable IDs. Marketplace-owned records carry `marketplaceId`, including nested variants and order lines. Public catalogs require an active product and an eligible seller in the same tenant. Changing operating mode hides ineligible sellers' products while preserving their records. Platform views deliberately aggregate tenants and label each record's tenant.

The footer switches between tenant storefronts. Cart lines, favorites (through globally unique product IDs plus scoped catalogs), messages, products, inventory, and workspace settings remain isolated in the displayed tenant. Branding and commission edits update only the chosen tenant. The browser stores all demo fixtures together for convenience; this is **not a security boundary**.

## Roles

Supported roles are buyer, seller, marketplace owner, marketplace staff, and platform administrator. A user can hold several tenant roles and participate in several marketplaces. Platform administrator is a global capability. Production authorization will derive permissions from the authenticated identity and database membership; a URL, browser state, or claimed tenant ID must never authorize access.

For evaluation, all workspaces are open and the seller studio includes an explicit seller selector. This is role simulation, not authentication or authorization. The current customer is the sample user Alex. The selector intentionally lets evaluators inspect either seller without creating accounts.

## Route structure

Prefix tenant routes with `/m/:tenant`:

| Area                        | Paths                                                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public discovery            | `/`, `/products?q=...&sort=...`, `/category/:slug`, `/product/:id`, `/store/:sellerId`                                                                                                                    |
| Customer                    | `/cart`, `/checkout`, `/favorites`, `/orders`, `/messages`, `/profile`                                                                                                                                    |
| Seller                      | `/seller`, `/seller/products`, `/seller/listing`, `/seller/listing/:id`, `/seller/orders`, `/seller/inventory`, `/seller/sales`, `/seller/payouts`, `/seller/settings`                                    |
| Marketplace owner           | `/owner`, `/owner/setup`, `/owner/branding`, `/owner/store-settings`, `/owner/sellers`, `/owner/products`, `/owner/orders`, `/owner/customers`, `/owner/analytics`, `/owner/commission`, `/owner/domains` |
| Platform (no tenant prefix) | `/admin`, `/admin/marketplaces`, `/admin/users`, `/admin/sellers`, `/admin/transactions`, `/admin/disputes`, `/admin/moderation`                                                                          |

Unknown tenants, categories, known cross-tenant product IDs, and unsupported top-level routes return a 404. Browser-created product IDs are resolved in the client and show an unavailable state if missing. Forms use ordinary HTML validation and labeled inputs. Navigation, tables, cards, dashboard grids, and purchasing flows adapt to phone and desktop widths.

## Mock-data architecture

`data/mock.ts` provides three tenants, six seller entities, 24 products, 48 variants, categories, memberships, orders, reviews, conversations, and messages. Catalog and cart services are pure functions. The React context adds mutable products, marketplace configuration, cart lines, favorites, profile, local messages, and review-resolution state. These persist under `commerce-demo-v1` in localStorage, with a hydration gate and an in-memory fallback if browser storage is unavailable. Clear that key to reset the demo. Browser tabs are not synchronized.

Implemented interactions include searching/filtering/sorting, variant selection, stock-limited cart additions and quantity edits, favorite toggles, profile updates, locally saved messages, listing creation/editing with draft/active visibility, inventory edits, marketplace setup/mode/branding/commission edits, record filtering, and resolving sample administrative reviews. Orders and financial reports are deterministic fixtures. Checkout, payouts, and custom domains explicitly remain placeholders. Shipping, seller settings, and returns are saved configuration previews; they do not trigger fulfillment. New listings use a sample image; image uploads are deferred. Sample images load from Unsplash and need an internet connection.

### API starting point

`GET /api/v1/marketplaces/:marketplaceId/products?q=mug&category=home` returns `{ data, meta }`; unknown tenants return a typed error envelope and HTTP 404. It shares catalog rules with the UI. It exposes public fixture products only. The endpoint intentionally reads deterministic server fixtures, **not browser-local edits**. It is a contract example for the future backend, not a second mutable datastore. There are no write or private-data endpoints.

## Proposed backend architecture

1. Keep a modular TypeScript service layer for catalog, memberships, sellers, carts, orders, conversations, and tenant configuration. Start with Next.js route handlers as HTTP adapters, so services can later move to a separate service without changing client contracts.
2. Add PostgreSQL (potentially via Supabase) behind repositories that require explicit tenant context. Use `(marketplace_id, id)` composite constraints or equivalent tenant-safe foreign keys for categories, sellers, variants, order lines, and messages. Add tenant-leading indexes for common queries. Use row-level security as defense in depth alongside service authorization.
3. Authenticate a global user and resolve membership/permissions server-side. Separate platform administration policies from tenant permissions, and check seller ownership for writes. Custom hosts should resolve through a verified domain registry, never a trusted arbitrary request header.
4. Define versioned JSON contracts, schema validation, consistent error codes, pagination, and an OpenAPI specification. Publish typed clients when the real endpoints stabilize. Scope cache keys, object-storage paths, rate limits, audit logs, and background jobs by tenant.
5. Introduce transactional stock reservation, idempotent order placement, server-calculated taxes/shipping/commission, immutable price snapshots, and payment webhook reconciliation together with the payment integration. Never trust cart prices, inventory, roles, or totals supplied by clients.
6. Add private uploads/object storage, async notifications, conversation access checks, and observability. Apply audit trails to moderation, role changes, and platform operations.

No part of this proposed infrastructure is configured by the prototype.

## Android, iOS, and public API

Android will call the same HTTPS `/api/v1` endpoints as web, passing its authenticated bearer token and tenant context. It will not depend on React Server Actions, Next.js rendering, browser cookies, or direct database access. A future iOS client follows the same contract. An OpenAPI specification can generate Kotlin and Swift clients while TypeScript uses the same DTO definitions. Pagination, structured errors, authorization, idempotent mutations, and server-calculated totals apply consistently across all clients. Public API credentials will eventually have explicit tenant and operation scopes, with rate limits and versioned compatibility.

## Verification

Run `npm run lint`, `npm test`, and `npm run build`. Domain tests cover all operating modes, changing modes, draft exclusion, tenant/variant isolation, and variant-specific totals. Browser evaluation should include a product-to-cart flow, reload persistence, tenant switching, a new listing, mobile layout, and a management dashboard. The demo has no production credentials or environment variables.
