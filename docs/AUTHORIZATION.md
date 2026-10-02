# Authentication and authorization

## One identity, multiple roles

Supabase Auth owns the global identity. The `profiles` trigger copies only the display name from signup metadata and creates no role assignments. An authenticated user may be a buyer in one marketplace, a seller and owner in another, staff in a third, and a platform administrator independently. There are no separate role-specific logins.

Tenant roles live in active `marketplace_memberships` rows. Global administrators live in `platform_admins`, which has no authenticated write grant. Owning a seller row alone does not authorize seller management: a seller also needs an active seller membership. Owner permission requires a matching `marketplaces.owner_user_id`, not just a role string. Suspended memberships cannot manage tenant resources. Platform administrators are an explicit global exception.

## Request flow

1. `/auth/sign-up` and `/auth/sign-in` submit to server actions. Supabase performs credential verification. User-facing errors do not expose raw provider/database details.
2. Signup confirmation returns through PKCE `/auth/callback`, or a configured token-hash email template through `/auth/confirm`. `next` destinations must be local application paths.
3. `src/proxy.ts` refreshes cookie sessions and passes refreshed cookies through to the request and response, with `private, no-store` caching. Proxy is session plumbing, not the authorization boundary.
4. `authContext()` calls Supabase `auth.getUser()` to verify identity. It never trusts `getSession()` as authorization, browser-local roles, or unsigned token contents.
5. `protectPage()` checks the identity and database roles before constructing protected workspace content. Missing identity redirects to sign-in; missing permission produces an access-denied view. Missing Supabase configuration never produces a synthetic authenticated user.
6. Sensitive services recheck identity and tenant/seller authorization. Queries are scoped to the requested tenant and authorized owner; RLS and composite FKs independently enforce those boundaries.

This follows the [Supabase SSR client/session guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client). Browser sessions use cookies via `@supabase/ssr`. JSON APIs also accept `Authorization: Bearer <Supabase access token>` for Android, iOS, and future external clients. A supplied bearer header takes precedence over cookies and is verified by Supabase; malformed tokens cannot fall back to a browser identity. Mobile token refresh remains a client concern using the same Supabase Auth project.

## Reusable checks

`domain/authorization.ts` defines injectable checks that are unit tested without a network. `auth/server.ts` supplies verified users and database lookups:

- `requireUser()`
- `requireMarketplaceMembership(tenant)`
- `requireMarketplaceRole(tenant, allowedRoles)`
- `requireSellerAccess(tenant, seller)`
- `requirePlatformAdmin()`

Caller-supplied IDs identify a requested resource; they do not prove permission. Seller workspaces derive their seller ID from the current verified user. Listing APIs accept a resource seller ID only after `requireSellerAccess`. Marketplace settings, including commission, require owner or database-admin authorization. Staff may manage catalog resources but cannot grant roles or change owner-only settings. Marketplace creation atomically provisions the signed-in owner through `create_marketplace`; only a trusted database operator bootstraps global-admin privileges. Tenant owners can grant buyer/seller/staff membership but cannot manufacture another owner membership.

## RLS matrix

The complete per-table SELECT/INSERT/UPDATE/DELETE matrix, definer audit, and RPC permissions are in [SECURITY.md](SECURITY.md). Every application table has RLS; table grants also deny operations such as order writes, seller identity writes, and direct cart quantity writes. Admins have no private message or cart read override.

Public and authenticated monetary DTO views use `security_invoker=true`; they do not bypass caller RLS. Seller order reads expose attributable lines, not unrelated order headers/items. Conversation/message reads require actual participation. No manager or platform-admin moderation access is implied.

## Marketplace modes

Owner inventory is derived by comparing seller identity with marketplace owner identity, not a user-writable `isOwner` flag. Public eligibility is enforced in SQL:

- STORE: active owner seller inventory only.
- MARKETPLACE: active third-party seller inventory only.
- HYBRID: both kinds of active seller inventory.

Public products also require an active category and marketplace. Variant display requires an active variant. Changing modes retains private catalog data but immediately changes public visibility and cart eligibility. Atomic cart additions consult the same SQL eligibility rule. Checkout cannot rely on a past cart: Phase 3 must recheck these invariants inside order/stock reservation transactions.

## Request and secret handling

The application uses only a public publishable/legacy anon key, even on the server; user-scoped clients preserve RLS. No service-role client exists. `.env.local` and other environment files are ignored, with only `.env.example` allowed. Public configuration rejects `sb_secret_` keys and legacy JWTs with non-anon roles.

Cookie-based JSON mutations require `Origin` to exactly match `APP_ORIGIN`; mobile bearer requests authenticate independently and do not depend on browser origin. Server actions additionally enforce APP_ORIGIN on cookie writes alongside Next.js action-origin protections. JSON bodies have a 16 KiB bound, mutations use explicit field allowlists, UUIDs/pagination/amounts are validated, and database errors map to fixed public error envelopes. Responses carrying private data are not cacheable. Supabase Auth provides its own auth rate controls; broader application throttling, CAPTCHA policy, audit event storage, and abuse workflows remain deployment/Phase 3 work.

## Demo separation

Without Supabase, development builds can render the original labeled public demo and `/demo/...` workspaces. Production requires explicit `ALLOW_DEMO=true` to enable those fixture views. Real `/m/:tenant/seller`, `/m/:tenant/owner`, and `/admin` routes still require real authentication and never accept localStorage identities. JSON APIs never use mock records as an authentication or database fallback. If Supabase is configured but unreachable, the app returns an error, not demo data. `/demo` is disabled when Supabase is configured.

The legacy demo domain models use decimal display prices and browser-local state; they are not the production contracts and are never used to authorize or calculate real cart totals.

## Seller onboarding

`apply_seller` derives the applicant from auth.uid and creates only pending status. `review_seller` requires tenant management, refuses self-approval, and atomically approves membership/store or suspends/rejects the seller. Ordinary seller table mutations are revoked. Membership grants alone never activate a seller. See SECURITY.md for lifecycle details and rate-limit prerequisites.
