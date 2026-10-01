"use client";
import Link from "next/link";
import { useState } from "react";
import type { Marketplace } from "@/domain/models";
import { conversations, orders } from "@/data/mock";
import { money } from "@/domain/commerce";
import { useCommerce } from "./commerce-provider";
import { Heading } from "./ui";

export function CustomerPage({ m, page }: { m: Marketplace; page: string }) {
  const { state, update, notify } = useCommerce();
  const [draft, setDraft] = useState("");
  const c = conversations.find((c) => c.marketplaceId === m.id)!;
  return (
    <div className="page section">
      <nav className="account-tabs">
        {["profile", "orders", "messages", "favorites"].map((s) => (
          <Link
            className={s === page ? "active" : ""}
            key={s}
            href={`/m/${m.slug}/${s}`}
          >
            {s}
          </Link>
        ))}
      </nav>
      <Heading
        eyebrow="YOUR CORNER"
        title={
          page === "profile"
            ? `Hello, ${state.profile.name.split(" ")[0]}.`
            : page === "orders"
              ? "Your orders"
              : "Your conversations"
        }
        text="Everything you need, all in one place."
      />
      {page === "profile" ? (
        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            update((s) => ({
              ...s,
              profile: {
                name: String(data.get("name")),
                email: String(data.get("email")),
              },
            }));
            notify("Your demo profile has been saved");
          }}
        >
          <h2>Personal details</h2>
          <label>
            Full name
            <input name="name" required defaultValue={state.profile.name} />
          </label>
          <label>
            Email
            <input
              type="email"
              name="email"
              required
              defaultValue={state.profile.email}
            />
          </label>
          <p className="muted">
            One account, multiple roles. Switch workspaces from the footer to
            explore selling or managing a marketplace.
          </p>
          <button className="button">Save profile</button>
        </form>
      ) : page === "orders" ? (
        <div className="order-list">
          {orders
            .filter((o) => o.marketplaceId === m.id && o.userId === "alex")
            .map((o) => (
              <article className="panel" key={o.id}>
                <div className="section-heading">
                  <div>
                    <h3>Order #{o.id.split("-").pop()}</h3>
                    <p className="muted">{o.date}</p>
                  </div>
                  <span className="status">{o.status}</span>
                </div>
                {o.items.map((i) => (
                  <p className="order-item" key={i.productId}>
                    <Link href={`/m/${m.slug}/product/${i.productId}`}>
                      {i.name} × {i.quantity}
                    </Link>
                    <b>{money(i.price)}</b>
                  </p>
                ))}
                <p className="order-item">
                  <span>Total</span>
                  <b>{money(o.total)}</b>
                </p>
              </article>
            ))}
        </div>
      ) : (
        <div className="messages-layout">
          <aside className="panel">
            <p className="eyebrow">FORM & FIELD</p>
            <h3>{c.subject}</h3>
            <p className="muted">Sample conversation</p>
          </aside>
          <div className="panel">
            <div className="chat-messages">
              {state.messages
                .filter(
                  (message) =>
                    message.marketplaceId === m.id &&
                    message.conversationId === c.id,
                )
                .map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.senderId === "alex" ? "mine" : ""}`}
                  >
                    <small>
                      {message.senderId === "alex" ? "You" : "Form & Field"}
                    </small>
                    <p>{message.body}</p>
                  </div>
                ))}
            </div>
            <form
              className="message-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                update((s) => ({
                  ...s,
                  messages: [
                    ...s.messages,
                    {
                      id: crypto.randomUUID(),
                      marketplaceId: m.id,
                      conversationId: c.id,
                      senderId: "alex",
                      body: draft.trim(),
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }));
                setDraft("");
                notify("Message saved locally — no message was sent");
              }}
            >
              <input
                aria-label="Message"
                placeholder="Write a demo message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                required
              />
              <button className="button">Save message</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
