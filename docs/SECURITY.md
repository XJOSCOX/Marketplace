# Security hardening audit

This is a code and database regression audit of Phase 2, not a production security certification. Migration `202610020004_security_hardening.sql` is additive. No remote database was changed. No payment or checkout implementation was added.

## Findings and fixes

| Finding                                                                                                             | Fix                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Platform admins inherited access to all private conversations/messages and carts                                    | Participant-only correspondence; cart ownership applies to every application role, including administrators                                |
| Cart quantity INSERT/UPDATE could bypass the RPC locking path                                                       | Revoke direct quantity writes; add/set RPCs share one checked, locking implementation                                                      |
| No atomic marketplace ownership lifecycle                                                                           | `create_marketplace` derives owner from `auth.uid()`, creates membership and mode-appropriate seller/store in one transaction              |
| Seller identities had broad management writes and no application workflow                                           | Revoke direct seller writes; pending application and manager-only review RPCs; no self-approval or identity reassignment                   |
| API-only length checks could be bypassed using PostgREST                                                            | Database constraints for names, descriptions, slugs, URLs, SKU, stock, nonblank content, and role arrays                                   |
| Workspace money was decoded numerically before conversion                                                           | Security-invoker DTO views cast money to text in SQL before JSON decoding                                                                  |
| Redirect controls and action CSRF needed defense in depth                                                           | Reject control/space characters in redirects; exact APP_ORIGIN check for cookie APIs and auth actions; explicit malformed bearer rejection |
| Listing RPC could accept states beyond its UI contract or silently omit stock changes for missing Original variants | Validate RPC arguments; fail and roll back when the required variant is missing                                                            |
| New functions could inherit PUBLIC EXECUTE                                                                          | Explicit execution revocations and safer function default privileges; test definer ACLs/search paths                                       |

## Permission matrix: effective direct table access

Each cell lists **S / I / U / D**, in that order: SELECT, INSERT, UPDATE, DELETE. `-` is denied. `O` means own identity/cart/order/review. `P` means publicly eligible rows. `T` means managed tenant only. `G` means global. `A` means attributable active seller resources (active seller membership required). `C` means conversation participant. `B` means own review backed by a delivered purchase. `N` means non-owner memberships only. Permissions are additive across a user's roles, except participant/cart restrictions apply even to platform admins. RPC side effects are separately documented below; they do not imply direct table grants.

| Table                     | anon    | buyer     | seller    | staff         | owner         | platform admin |
| ------------------------- | ------- | --------- | --------- | ------------- | ------------- | -------------- |
| profiles                  | -/-/-/- | O/-/O/-   | O/-/O/-   | O/-/O/-       | O/-/O/-       | G/-/O/-        |
| platform_admins           | -/-/-/- | O/-/-/-   | O/-/-/-   | O/-/-/-       | O/-/-/-       | G/-/-/-        |
| marketplaces              | P/-/-/- | P/-/-/-   | P/-/-/-   | P/-/-/-       | P/-/T/-       | G/-/G/-        |
| marketplace_memberships   | -/-/-/- | O/-/-/-   | O/-/-/-   | O+T/-/-/-     | O+T/TN/TN/TN  | G/GN/GN/GN     |
| sellers                   | P/-/-/- | P+O/-/-/- | P+O/-/-/- | P+O+T/-/-/-   | P+O+T/-/-/-   | G/-/-/-        |
| stores                    | P/-/-/- | P/-/-/-   | P+A/A/A/A | P+T/T/T/T     | P+T/T/T/T     | G/G/G/G        |
| categories                | P/-/-/- | P/-/-/-   | P/-/-/-   | P+T/T/T/T     | P+T/T/T/T     | G/G/G/G        |
| products                  | P/-/-/- | P/-/-/-   | P+A/A/A/A | P+T/T/T/T     | P+T/T/T/T     | G/G/G/G        |
| product_variants          | P/-/-/- | P/-/-/-   | P+A/A/A/A | P+T/T/T/T     | P+T/T/T/T     | G/G/G/G        |
| carts                     | -/-/-/- | O/O/O/O   | O/O/O/O   | O/O/O/O       | O/O/O/O       | O/O/O/O        |
| cart_items                | -/-/-/- | O/-/-/O   | O/-/-/O   | O/-/-/O       | O/-/-/O       | O/-/-/O        |
| orders                    | -/-/-/- | O/-/-/-   | O/-/-/-   | O+T/-/-/-     | O+T/-/-/-     | G/-/-/-        |
| order_items               | -/-/-/- | O/-/-/-   | O+A/-/-/- | O+T/-/-/-     | O+T/-/-/-     | G/-/-/-        |
| reviews                   | P/-/-/- | P+O/B/B/O | P+O/B/B/O | P+O+T/B/B/O+T | P+O+T/B/B/O+T | G/B/B/G        |
| conversations             | -/-/-/- | C/-/-/-   | C/-/-/-   | C/-/-/-       | C/-/-/-       | C/-/-/-        |
| conversation_participants | -/-/-/- | C/-/-/-   | C/-/-/-   | C/-/-/-       | C/-/-/-       | C/-/-/-        |
| messages                  | -/-/-/- | C/C/-/-   | C/C/-/-   | C/C/-/-       | C/C/-/-       | C/C/-/-        |

Additional constraints: profile updates only name/avatar; marketplace updates only name/tagline/mode/accent/commission. Marketplace owners/staff require active membership and active tenant. Owner role must match the actual owner ID. Cart insertion requires active marketplace. Message insertion requires sender=`auth.uid()` and active marketplace. Identity and relationship columns are immutable on update. Foreign keys may reject otherwise authorized deletes. Reviews cannot be created without a delivered purchase, even by admins. `platform_admins` own-read permission does not create a row or grant admin status.

Public eligibility checks marketplace/category/product/seller status and STORE/MARKETPLACE/HYBRID owner relationships. Variant public reads additionally require active variant status. An active seller is public by seller status; suspended membership separately removes that user's management privileges. To remove listings publicly, suspend the seller through `review_seller`, not merely the membership.

## SECURITY DEFINER and RPC audit

Every definer has an empty `search_path`, schema-qualified application references, and no PUBLIC execution grant. Private schema must remain absent from Supabase exposed schemas. Application identity always comes from `auth.uid()`; resource UUIDs are locators, never identity assertions.

| Function(s)                                               | Privilege / identity / tenant boundary                                                                                                                                                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| private.is_admin                                          | Current uid against DB allowlist; no user argument                                                                                                                                                                          |
| private.has_role, is_owner, manages                       | Current uid, active tenant membership, actual owner relationship; explicit global-admin exception                                                                                                                           |
| private.seller_access, product_access                     | Current uid through membership; tenant+seller/product relationship checked                                                                                                                                                  |
| private.owns_cart, owns_order, purchased                  | Current uid and exact tenant/resource; purchase requires delivered order                                                                                                                                                    |
| private.participates                                      | Current uid and exact tenant/conversation participant row; no admin exception                                                                                                                                               |
| private.public_marketplace, public_seller, public_product | Identity-independent boolean public eligibility, not private-record retrieval; no caller user/role argument                                                                                                                 |
| private.create_profile                                    | Trusted auth.users INSERT trigger, not callable RPC; NEW.id comes from inserted Auth row. Uses no auth.uid because signup trigger context may be unauthenticated. No role metadata is copied                                |
| public.start_conversation                                 | Signed uid; eligible seller in tenant; creates exactly caller+seller participants; no supplied participants                                                                                                                 |
| public.create_marketplace                                 | Signed uid; validated normalized slug/mode/currency; atomically owns newly created tenant; zero commission default; owner seller/store only in STORE/HYBRID                                                                 |
| public.apply_seller                                       | Signed uid; active non-STORE marketplace; rejects owner and suspended membership; inserts pending seller for caller and buyer-only membership if absent; duplicate applications fail                                        |
| public.review_seller                                      | Current uid must manage tenant; rejects own application and owner seller; active/suspended/rejected only; approval adds seller role without replacing other roles and creates store; never reactivates suspended membership |
| private.change_cart                                       | Not executable by anon/authenticated; wrapper-only; validates uid, tenant, product/variant, availability/stock; locks eligibility/inventory/cart rows                                                                       |
| public.add_cart_item, set_cart_item                       | Authenticated-only wrappers, delegate to private.change_cart with uid-derived owner; no user/cart/price arguments                                                                                                           |

`save_listing` is SECURITY INVOKER, so normal RLS and grants apply. It validates all mutation arguments in SQL and commits product plus Original variant together. `guard_update` is an invoker trigger and cannot be directly executed by clients. All public mutation RPCs revoke EXECUTE from PUBLIC and anon. Private policy predicates retain only grants needed to evaluate RLS; authenticated users cannot execute the cart implementation directly. Public predicates deliberately disclose only eligibility booleans.

`catalog_products`/`catalog_variants` and `secure_products`/`secure_product_variants`/`secure_orders`/`secure_order_items` retain caller RLS with `security_invoker=true`. Catalog views also explicitly enforce public eligibility. Secure views grant authenticated SELECT only and include authorized drafts. All monetary fields in application JSON and server-rendered data are SQL text; raw base-table PostgREST reads are not the supported client money contract and remain bounded to MAX_SAFE_INTEGER. Future mobile clients must use `/api/v1` DTOs or these text views, not raw monetary columns.

## Transactions, stock and lifecycle boundaries

RPC failures roll back all side effects; regression tests force a failure after marketplace and membership insertion to verify this. Unique tenant/user seller and membership constraints handle duplicate applications. Approval updates seller/membership/store atomically. Suspension/rejection removes seller access and public inventory without deleting order history. Reapproval is a manager decision; applicants cannot reset a rejected/suspended record themselves. Marketplace owner transfer and owner-seller suspension require a future explicit workflow. Changing MARKETPLACE to HYBRID does not silently invent owner inventory; owner selling provisioning for such existing tenants remains a follow-up workflow.

Cart add/set acquires locks on marketplace, seller, category/product, variant and owned cart, checks stock, then mutates. This prevents stock overshoot and unpublishing races within those operations; no stock is reserved. Normal transaction deadlocks may abort one concurrent writer safely; callers can retry after a conflict. Removing stale/unavailable items is intentionally allowed using owner-only DELETE, since it cannot acquire inventory or change prices. Checkout must revalidate and reserve inventory atomically later. Multi-connection concurrency/load testing against actual Supabase is still required; PGlite regression tests do not establish distributed behavior.

## CSRF, validation and money

Cookie JSON mutations require exact configured APP_ORIGIN. Supplied bearer headers must be syntactically valid and the server verifies the token, with no cookie fallback. Auth actions always use cookies and enforce APP_ORIGIN regardless of supplied Authorization headers, in addition to Next.js protections. Reverse proxies must preserve trusted host/origin configuration. Body parsing caps streamed JSON at 16 KiB and rejects nonobjects. Field allowlists reject unexpected identity/role fields. Redirects reject protocol-relative paths, encoded separators, whitespace/control characters and backslashes.

SQL limits: names 120, marketplace/category/store slugs 80, tagline 300, descriptions/messages 10,000, reviews 5,000, subjects/location 200, icon 32, SKU 80 safe characters, HTTPS URLs 2,048, stock 0..1,000,000, cart/order quantity 1..999, commission 0..10,000 basis points. URL constraints reject unsafe schemes/whitespace/credentials; URLs are display data, never server fetch instructions. Add allowlisted hosts and SSRF defenses before implementing media ingestion. Monetary writes accept decimal strings, bounded to 9,007,199,254,740,991 minor units per persisted amount. SQL text projections and BigInt sum/formatting preserve larger derived totals without Number conversion. Tests cover totals and formatting above MAX_SAFE_INTEGER.

## Rate-limit preparation and production prerequisites

No process-local limiter is presented as production protection. Supabase Auth has provider rate controls; configure and test them in the target project. Before public launch, implement atomic shared enforcement (PostgreSQL counters with TTL cleanup/row locks are suitable without Redis) at the mutation boundary, including RPCs exposed by PostgREST. An API-only limiter can be bypassed through direct Supabase calls. Use server-derived uid and resource IDs for authenticated buckets, plus trusted proxy IP controls for unauthenticated abuse. Never trust a client-supplied forwarding header. Return 429 with Retry-After, bounded retention, and audit rejection counts without content or tokens.

Initial limits to tune under load (not implemented or guaranteed):

| Operation                      | Enforcement strategy                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Authentication                 | Supabase per-IP/email/provider limits; generic responses; gateway controls and CAPTCHA escalation |
| Messages/conversation creation | Per uid and conversation/seller, e.g. 30/min and 500/day; DB-side enforcement, abuse reporting    |
| Reviews                        | Per uid, e.g. 5/min and 50/day; delivered-purchase gate and unique product review retained        |
| Listing creation               | Per uid+tenant, e.g. 20/min; separate bulk-import privilege later                                 |
| Marketplace creation           | Per uid, e.g. 3/hour and account tenant quota; DB-side enforcement                                |
| Seller applications            | Per uid, e.g. 10/hour; existing unique tenant/user application retained                           |
| Cart mutations                 | Per uid+tenant, e.g. 60/min; bounded request/quantity; gateway abuse controls                     |

Still required for production: real Auth/email/PostgREST integration validation; distributed concurrency tests; configured rate limits/quotas; security event auditing; dependency/deployment review; recovery/backups; application-specific moderation/privacy workflows. Service-role/database operators can bypass RLS by design and must remain outside client runtime. No production payment/order writer exists. Do not treat the prototype as a completed production commerce system.

## Executed verification

Normal tests run real SQL migrations, constraints, grants, RLS and RPCs in embedded PostgreSQL (PGlite), with a minimal auth.uid emulation. They include anonymous denies, owner/staff tenant isolation, self-promotion/self-approval prevention, seller order isolation, cart ownership, private-message restrictions, forged sender/cross-tenant FKs, mode and suspension visibility, SQL validation, transaction rollback, SQL monetary text, CSRF/body/redirect validation.

`npm run test:integration` remains a separate real Supabase/PostgREST suite. Docker/Supabase daemon was unavailable during this audit and project credentials were not configured; skipped integration cases are not passes. This suite is currently a read-only connectivity/RLS smoke check, not full lifecycle/concurrency coverage. Apply the migration to a disposable Supabase project and exercise verified users for each matrix role before release.
