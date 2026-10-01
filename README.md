# GoXAvni Commerce

A multi-tenant commerce frontend with a curated storefront and seller, marketplace-owner, and platform workspaces.

## Run locally

Use Node.js 22.18+ and npm:

```sh
npm ci
npm run dev
```

Open [the marketplace](http://localhost:3000). No environment variables or accounts are required.

## Explore

- `/m/goxavni` — HYBRID marketplace
- `/m/atelier` — single-owner STORE
- `/m/makers` — third-party MARKETPLACE
- `/m/goxavni/seller` — seller studio (with demo seller selector)
- `/m/goxavni/owner` — marketplace management
- `/admin` — platform administration
- `/api/v1/marketplaces/goxavni/products` — read-only mock catalog API

The footer links the workspaces and tenants. Changes to listings, cart, favorites, messages, profile, and settings persist in this browser. Clear the `commerce-demo-v1` localStorage key to reset. The API returns seed fixtures; it does not reflect browser-local changes.

Authentication, Supabase, payments, production storage, message delivery, domain provisioning, and checkout submission are intentionally not implemented. Product photographs are remote sample images from Unsplash.

## Checks

```sh
npm run lint
npm test
npm run build
```

With the local server running, `npm run test:smoke` also checks all 40 main page routes, negative routes, and catalog API scoping/search.

See [ARCHITECTURE.md](ARCHITECTURE.md) for domain models, tenant rules, roles, route coverage, and the proposed shared backend for web, Android, iOS, and public API clients.
