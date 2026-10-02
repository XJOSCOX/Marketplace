# Phase 3 manual verification

Start with the environment and migrations in DATABASE.md. No passwords or real credentials are seeded. Create and confirm real users through Supabase Auth.

1. Sign up/sign in with `next=/create`; complete the five-step wizard for STORE, MARKETPLACE and HYBRID. Duplicate/invalid slugs should fail without partial tenant provisioning.
2. Confirm a new tenant is a draft. Open its public URL signed out: it must not expose branding/catalog. Open owner dashboard as the creator; a different unrelated user must be denied.
3. Save branding/store information. Upload a PNG/JPEG/WebP logo. Try malformed files, SVG, oversized content and another tenant UUID; each must fail appropriately.
4. Add/edit/reorder/archive categories. Duplicate slugs inside the tenant must fail; the same slug in another tenant is allowed. Archived categories hide their products publicly.
5. For STORE/HYBRID add a product, choose a category, enter USD price, stock and SKU. Save draft, upload a primary image, publish the product, edit and archive it. Confirm exact displayed amount and correct variant stock.
6. Open owner preview (including product details), acknowledge it, then publish. Check public branding/catalog/images and copy the share link. Return to draft and confirm public pages/images are inaccessible again.
7. For MARKETPLACE, publish after branding/category/store/preview setup, without owner inventory. Use another user to apply. Review pending → approved/rejected/suspended in owner/staff UI. A seller cannot self-approve or review a different tenant. STORE must not offer an application.
8. As an approved seller, create products and confirm another seller's editing/upload URLs fail. Public seller pages should show business description/products but no private application state.
9. Test `/create`, owner dashboard/categories/listing/branding, preview and public storefront at 375px, 430px, 768px and desktop. Navigation should scroll within its container and form fields should fit.
10. Use a bearer token with management/category/listing/branding/setup/upload APIs to verify Android-style requests without Origin. Browser cookie mutations with a mismatched Origin must fail.

Without Supabase, `/demo/create` shows the same wizard with no writes; `/demo/manage` is a read-only owner dashboard fixture. They are explicitly labeled DEMO DATA, not authenticated workspaces. Original `/demo/m/...` pages remain available. Real `/create` and owner/seller routes still require authentication.

Locally executed checks include lint, build, unit/image tests, embedded PostgreSQL/RLS tests and unconfigured HTTP smoke checks. Supabase Auth/Storage/PostgREST lifecycle verification requires a running configured project; skipped tests do not establish hosted correctness.

Responsive QA in this implementation session checked the five-step wizard, shared owner dashboard fixture and preserved public demo at 375, 430, 768 and 1280 pixels; measured document widths did not exceed viewport widths. Live Supabase screens still require the authenticated manual checks above.
