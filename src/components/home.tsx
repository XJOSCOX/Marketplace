"use client";
import Image from "next/image";
import Link from "next/link";
import type { Marketplace, Product } from "@/domain/models";
import { categories } from "@/data/mock";
import { ProductCard } from "./product-card";
import { Icon } from "./ui";

export function Home({ m, products }: { m: Marketplace; products: Product[] }) {
  const base = `/m/${m.slug}`;
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="tiny-dot" /> THE EVERYDAY, REIMAGINED
          </p>
          <h1>
            {m.tagline.split(" ").slice(0, 2).join(" ")}
            <br />
            <em>{m.tagline.split(" ").slice(2).join(" ")}</em>
          </h1>
          <p>
            Discover thoughtfully chosen products from independent
            <br className="desktop" /> brands and people with a different point
            of view.
          </p>
          <Link className="button" href={`${base}/products`}>
            Find your next favorite <Icon name="arrow" size={18} />
          </Link>
          <div className="hero-proof">
            <span className="avatar-stack">
              <i>MC</i>
              <i>JL</i>
              <i>AK</i>
            </span>
            <span>
              <b>Small brands. Big ideas.</b>
              <br />
              Discover something a little less ordinary.
            </span>
          </div>
        </div>
        <div className="hero-image">
          <Image
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=90"
            alt="Sunlit living room with natural textures, sculptural furniture, and considered everyday objects"
            fill
            sizes="(max-width: 700px) 100vw, 55vw"
            priority
          />
          <span className="image-note">
            THE CONSIDERED COLLECTION <span>↗</span>
          </span>
          <Link className="hero-tag" href={`${base}/category/home`}>
            <span className="tag-icon">✧</span>
            <span>
              <small>A little more you.</small>
              <b>Make room for good things</b>
            </span>
            <Icon name="arrow" />
          </Link>
        </div>
      </section>
      <div className="benefits">
        <span>
          <Icon name="check" />
          Independent brands, thoughtfully selected
        </span>
        <span>
          <Icon name="box" />
          Good things, delivered to your door
        </span>
        <span>
          <Icon name="heart" />
          Find it. Love it. Make it yours.
        </span>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FOLLOW YOUR CURIOSITY</p>
            <h2>A world to discover</h2>
          </div>
          <Link className="text-link" href={`${base}/products`}>
            Explore everything <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="category-grid">
          {categories
            .filter((c) => c.marketplaceId === m.id)
            .map((c, i) => (
              <Link
                href={`${base}/category/${c.slug}`}
                className={`category-tile tone-${i}`}
                key={c.id}
              >
                <span>{c.icon}</span>
                <strong>{c.name}</strong>
                <small>Find your everyday ↗</small>
              </Link>
            ))}
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE GOOD STUFF</p>
            <h2>Your next favorite is here</h2>
            <p className="muted">
              Well-made. Well-loved. Ready for your everyday.
            </p>
          </div>
          <Link className="text-link" href={`${base}/products`}>
            Shop all products <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="product-grid">
          {products.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} base={base} />
          ))}
        </div>
      </section>
      <section className="editorial">
        <div>
          <p className="eyebrow">INDEPENDENT SPIRIT. EVERYDAY IMPACT.</p>
          <h2>
            Behind every good find,
            <br />
            there’s a great story.
          </h2>
          <p>
            Meet the makers, dreamers, and small businesses
            <br />
            bringing something different to your doorstep.
          </p>
          <Link
            className="button light"
            href={`${base}/store/${products[0]?.sellerId}`}
          >
            Meet a brand <Icon name="arrow" />
          </Link>
        </div>
        <div className="editorial-art">
          Made with
          <br />
          <em>intention.</em>
          <span>✳</span>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A FRESH PERSPECTIVE</p>
            <h2>More to fall in love with</h2>
          </div>
        </div>
        <div className="product-grid">
          {products.slice(4, 8).map((p) => (
            <ProductCard key={p.id} product={p} base={base} />
          ))}
        </div>
      </section>
    </>
  );
}
