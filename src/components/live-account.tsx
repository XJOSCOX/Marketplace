import Link from "next/link";
import { signOut } from "@/auth/actions";
import { readCart } from "@/services/cart";
import { formatAmount } from "@/domain/api";
import type { PublicMarketplace } from "@/domain/catalog";
import type { authContext } from "@/auth/server";
import { workspaceRecords } from "@/data-access/workspace";
import { LiveShell } from "./live-shell";
import { Heading, Empty } from "./ui";
import { DataTable } from "./data-table";
import { RemoveCartItem } from "./live-cart-remove";
export async function LiveAccount({
  m,
  page,
  auth,
}: {
  m: PublicMarketplace;
  page: string;
  auth: Awaited<ReturnType<typeof authContext>>;
}) {
  const user = await auth.requireUser();
  const records =
    page === "orders" || page === "messages"
      ? await workspaceRecords(auth.db, page, m.id, undefined, user.id)
      : null;
  const cart =
    page === "cart" || page === "checkout" ? await readCart(m.id) : null;
  return (
    <LiveShell m={m}>
      <section className="section">
        <nav className="account-tabs">
          {["profile", "orders", "messages", "cart"].map((p) => (
            <Link key={p} href={`/m/${m.slug}/${p}`}>
              {p}
            </Link>
          ))}
        </nav>
        <Heading
          eyebrow="YOUR CORNER"
          title={
            page === "profile"
              ? "Your account"
              : page === "cart"
                ? "Your shopping bag"
                : page
          }
        />
        {records && <DataTable {...records} />}
        {page === "profile" && (
          <div className="form-card">
            <p>{user.email}</p>
            <p className="muted">
              One authenticated identity across every marketplace. Roles come
              from your memberships.
            </p>
            <form action={signOut}>
              <button className="button">Sign out</button>
            </form>
          </div>
        )}
        {cart && (
          <>
            {!cart.items.length ? (
              <Empty
                title="Your bag is waiting"
                text="Discover something good."
                href={`/m/${m.slug}/products`}
              />
            ) : (
              <>
                <div className="panel">
                  {cart.items.map((i) => (
                    <div className="cart-row" key={i.id}>
                      <Link href={`/m/${m.slug}/product/${i.productId}`}>
                        {i.name} × {i.quantity}
                      </Link>
                      <strong>
                        {formatAmount(i.subtotalAmount, i.currency)}
                      </strong>
                      {!i.available && (
                        <span>Unavailable — remove this item</span>
                      )}
                      <RemoveCartItem tenant={m.id} id={i.id} />
                    </div>
                  ))}
                  <p className="summary-total">
                    Subtotal: {formatAmount(cart.totalAmount, cart.currency)}
                  </p>
                </div>
                <p className="info-banner" style={{ marginTop: 20 }}>
                  Checkout and payments remain unavailable. Amounts are
                  calculated from current database variants; no order is placed.
                </p>
              </>
            )}
          </>
        )}
        {page === "favorites" && (
          <Empty
            title="Your favorites"
            text="Database-backed favorites will arrive in Phase 3."
          />
        )}
      </section>
    </LiveShell>
  );
}
