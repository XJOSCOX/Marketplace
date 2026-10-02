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

Caller-supplied IDs identify a requested resource; they do not prove permission. Seller workspaces derive their seller ID from the current verified user. Listing APIs accept a resource seller ID only after `requireSellerAccess`. Marketplace settings, including commission, require owner or database-admin authorization. Staff may manage catalog resources but cannot grant roles or change owner-only settings. Only a trusted database operator bootstraps owner/global-admin privileges. Tenant owners can grant buyer/seller/staff membership but cannot manufacture another owner membership.

## RLS matrix

RLS is enabled on every application base table. Grants and policies both matter. Permission helpers use `SECURITY DEFINER`, an empty `search_path`, schema-qualified references, and a private schema that is not exposed through PostgREST. They derive the subject from `auth.uid()` and never accept a claimed user role. Helpers prevent policy recursion when checking memberships and conversation participants. Other than the narrowly scoped profile/conversation/cart functions, resource mutations run as the caller under RLS.

| Data                         | Public                         | Buyer                               | Seller                           | Owner/staff                                         | Platform admin                                                        |
| ---------------------------- | ------------------------------ | ----------------------------------- | -------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| Marketplace/category/catalog | Active eligible public records | Same                                | Own drafts + public              | Own tenant                                          | All authorized management records                                     |
| Seller/store                 | Active mode-eligible profiles  | Same                                | Own authorized seller/store      | Own tenant                                          | Global                                                                |
| Profiles                     | None                           | Own profile; name/avatar edits      | Own                              | Own (no unrelated personal profile data)            | Global read                                                           |
| Memberships                  | None                           | Own                                 | Own                              | Tenant read; owner can manage non-owner memberships | Tenant management through policies; owner/bootstrap rules still apply |
| Carts/items                  | None                           | Own only                            | Own buyer cart only              | Own buyer cart only                                 | Global read, not another buyer's cart mutation                        |
| Orders                       | None                           | Own                                 | No unrelated order header access | Tenant read                                         | Global read                                                           |
| Order items                  | None                           | Own order items                     | Attributable seller items only   | Tenant read                                         | Global read                                                           |
| Reviews                      | Public product reviews         | Own writes after delivered purchase | Buyer rules                      | Tenant moderation deletion                          | Moderation deletion                                                   |
| Conversations/messages       | None                           | Participants only                   | Participants only                | Participants only                                   | Global read                                                           |

Authenticated clients cannot create/update financial order records at all. A seller sees its order lines, not another seller's lines or the buyer's entire multi-seller order. Message inserts require both current-user sender identity and participation. Direct participant inserts are not granted, preventing a user from joining an arbitrary private conversation. `start_conversation()` validates an eligible tenant seller and adds only the caller and that seller's user atomically.

See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and the migration SQL for the exact policies. Public catalog views use `security_invoker=true` and explicit public eligibility checks so signed-in privileged users do not accidentally expose drafts through the public catalog contract.

## Marketplace modes

Owner inventory is derived by comparing seller identity with marketplace owner identity, not a user-writable `isOwner` flag. Public eligibility is enforced in SQL:

- STORE: active owner seller inventory only.
- MARKETPLACE: active third-party seller inventory only.
- HYBRID: both kinds of active seller inventory.

Public products also require an active category and marketplace. Variant display requires an active variant. Changing modes retains private catalog data but immediately changes public visibility and cart eligibility. Atomic cart additions consult the same SQL eligibility rule. Checkout cannot rely on a past cart: Phase 3 must recheck these invariants inside order/stock reservation transactions.

## Request and secret handling

The application uses only a public publishable/legacy anon key, even on the server; user-scoped clients preserve RLS. No service-role client exists. `.env.local` and other environment files are ignored, with only `.env.example` allowed. Public configuration rejects `sb_secret_` keys and legacy JWTs with non-anon roles.

Cookie-based JSON mutations require `Origin` to exactly match `APP_ORIGIN`; mobile bearer requests authenticate independently and do not depend on browser origin. Server actions use Next.js action-origin protections. JSON bodies have a 16 KiB bound, mutations use explicit field allowlists, UUIDs/pagination/amounts are validated, and database errors map to fixed public error envelopes. Responses carrying private data are not cacheable. Supabase Auth provides its own auth rate controls; broader application throttling, CAPTCHA policy, audit event storage, and abuse workflows remain deployment/Phase 3 work.

## Demo separation

Without Supabase, development builds can render the original labeled public demo and `/demo/...` workspaces. Production requires explicit `ALLOW_DEMO=true` to enable those fixture views. Real `/m/:tenant/seller`, `/m/:tenant/owner`, and `/admin` routes still require real authentication and never accept localStorage identities. JSON APIs never use mock records as an authentication or database fallback. If Supabase is configured but unreachable, the app returns an error, not demo data. `/demo` is disabled when Supabase is configured.

The legacy demo domain models use decimal display prices and browser-local state; they are not the production contracts and are never used to authorize or calculate real cart totals.
