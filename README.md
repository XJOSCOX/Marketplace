# GoXAvni Commerce

Multi-tenant commerce with a responsive frontend, Supabase Auth, PostgreSQL RLS, and versioned APIs.

## Run

Node.js 22.18+:

```sh
npm ci
npm run dev
```

Without Supabase configuration, [the storefront](http://localhost:3000) runs as a labeled browser-local demo. Use `/demo/m/goxavni/seller`, `/demo/m/goxavni/owner`, and `/demo/admin` for mock workspaces. Real private routes require authentication and do not trust demo state. Production demo fallback requires explicit `ALLOW_DEMO=true`.

## Connect Supabase

Copy `.env.example` to `.env.local`, configure the public project URL, publishable/anon key, and exact `APP_ORIGIN`, then apply the migrations. Never use a service-role key in this application.

```sh
supabase start
supabase migration up --local
```

For a disposable local database, `supabase db reset --local` applies migrations and the development seed **while deleting existing local data**. Hosted migrations are manual; see [DATABASE.md](docs/DATABASE.md). Seed users have no passwords or logins; create/confirm a real test account and provision roles using trusted SQL. Nothing automatically resets or changes a remote database.

The connected app supports real catalogs, accounts, role-checked workspaces, cart operations, seller listing edits, inventory reads, and owner branding/mode/commission updates. Payments and checkout submission remain deferred. Other management and messaging workflows retain clearly identified Phase 3 placeholders; the complete original UI remains in the isolated demo.

## Validation

```sh
npm run lint
npm test
npm run build
```

With an unconfigured development server running: `npm run test:smoke` checks 42 public/demo/auth routes, protected redirects, and safe API errors.

`npm run test:integration` runs only when explicitly configured with `RUN_SUPABASE_INTEGRATION=true` and a development Supabase project. Normal tests run migration and RLS assertions against embedded PostgreSQL without Docker or credentials. See the database guide for limitations and optional token setup.

- [Architecture](ARCHITECTURE.md)
- [Database and setup](docs/DATABASE.md)
- [Authorization and RLS](docs/AUTHORIZATION.md)

Phase 3 adds `/create`, a real owner launch checklist, category/product/branding management, seller applications and private Storage-backed images. Apply migrations 005 and 006 before using live mode. Preview the same onboarding UI without a backend at `/demo/create` and the read-only dashboard at `/demo/manage`.

See [Storage setup](docs/STORAGE.md) and the [Phase 3 manual test guide](docs/PHASE3-TESTING.md). Supabase Auth/Storage integration still requires a configured project; no payments or checkout are enabled.
