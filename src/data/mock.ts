import type {
  Category,
  Conversation,
  Marketplace,
  MarketplaceMembership,
  Message,
  Order,
  Product,
  Review,
  Seller,
  Store,
  User,
} from "@/domain/models";

export const users: User[] = [
  {
    id: "alex",
    name: "Alex Morgan",
    email: "alex@example.com",
    platformRoles: ["platform_admin"],
  },
  {
    id: "maya",
    name: "Maya Chen",
    email: "maya@example.com",
    platformRoles: [],
  },
  {
    id: "noah",
    name: "Noah Williams",
    email: "noah@example.com",
    platformRoles: [],
  },
];
export const marketplaces: Marketplace[] = [
  {
    id: "goxavni",
    slug: "goxavni",
    name: "GoXAvni",
    tagline: "Good finds. Great possibilities.",
    mode: "HYBRID",
    ownerId: "alex",
    accent: "#27624c",
    commission: 8,
  },
  {
    id: "atelier",
    slug: "atelier",
    name: "Atelier Living",
    tagline: "Objects for a considered home.",
    mode: "STORE",
    ownerId: "maya",
    accent: "#855941",
    commission: 0,
  },
  {
    id: "makers",
    slug: "makers",
    name: "Makers Collective",
    tagline: "Independent by design.",
    mode: "MARKETPLACE",
    ownerId: "noah",
    accent: "#475b83",
    commission: 10,
  },
];
export const memberships: MarketplaceMembership[] = marketplaces.flatMap((m) =>
  users.map((u) => ({
    id: `${m.id}-${u.id}`,
    marketplaceId: m.id,
    userId: u.id,
    roles:
      u.id === m.ownerId
        ? ["buyer", "seller", "marketplace_owner"]
        : u.id === "alex"
          ? ["buyer", "seller", "marketplace_staff"]
          : ["buyer", "seller"],
  })),
);
const categorySeed = [
  ["home", "Home & living", "⌂"],
  ["tech", "Tech & accessories", "⌘"],
  ["style", "Style & essentials", "✧"],
  ["outdoors", "Outdoors & travel", "↗"],
  ["wellness", "Wellness", "♡"],
  ["creative", "Art & stationery", "✎"],
];
export const categories: Category[] = marketplaces.flatMap((m) =>
  categorySeed.map(([slug, name, icon]) => ({
    id: `${m.id}-${slug}`,
    marketplaceId: m.id,
    slug,
    name,
    icon,
  })),
);
export const sellers: Seller[] = marketplaces.flatMap((m) => [
  {
    id: `${m.id}-studio`,
    marketplaceId: m.id,
    userId: m.ownerId,
    name: m.id === "goxavni" ? "Avni Studio" : m.name,
    description:
      "Thoughtful essentials, made for your everyday. We believe the things you surround yourself with should be as useful as they are beautiful.",
    location: "Austin, Texas",
    isOwner: true,
    status: "active" as const,
  },
  {
    id: `${m.id}-form`,
    marketplaceId: m.id,
    userId: m.ownerId === "maya" ? "noah" : "maya",
    name: "Form & Field",
    description:
      "Small-batch pieces for slower mornings and bigger adventures. Designed with care, shipped from our independent studio.",
    location: "Portland, Oregon",
    isOwner: false,
    status: "active" as const,
  },
]);
export const stores: Store[] = sellers.map((s) => ({
  id: `store-${s.id}`,
  marketplaceId: s.marketplaceId,
  sellerId: s.id,
  name: s.name,
  slug: s.id,
}));
const seed = [
  [
    "Everyday wireless headphones",
    "tech",
    129,
    "photo-1546435770-a3e426bf472b",
    "#e8ece9",
    "Bestseller",
  ],
  [
    "The weekender tote",
    "style",
    68,
    "photo-1553062407-98eeb64c6a62",
    "#ede8df",
    "Small-batch",
  ],
  [
    "Arc ceramic table lamp",
    "home",
    89,
    "photo-1507473885765-e6ed057f782c",
    "#efe7dc",
    "New arrival",
  ],
  [
    "Stoneware morning mug",
    "home",
    28,
    "photo-1514228742587-6b1558fcca3d",
    "#e9e6df",
    "Handcrafted",
  ],
  [
    "Pocket analog camera",
    "tech",
    149,
    "photo-1516035069371-29a1b244cc32",
    "#e4e8e7",
    "Staff pick",
  ],
  [
    "Trail companion backpack",
    "outdoors",
    94,
    "photo-1622260614153-03223fb72052",
    "#e8e9df",
    "Adventure ready",
  ],
  [
    "Everyday movement sneakers",
    "wellness",
    110,
    "photo-1542291026-7eec264c27ff",
    "#eee4dc",
    "Trending",
  ],
  [
    "Ideas hardcover journal",
    "creative",
    24,
    "photo-1531346878377-a5be20888e57",
    "#e7e7de",
    "Made to inspire",
  ],
] as const;
export const products: Product[] = marketplaces.flatMap((m) =>
  seed.map(([name, cat, price, photo, color, badge], i) => {
    const id = `${m.id}-p${i + 1}`;
    return {
      id,
      marketplaceId: m.id,
      sellerId: `${m.id}-${m.mode === "STORE" ? "studio" : m.mode === "MARKETPLACE" ? "form" : i % 2 ? "form" : "studio"}`,
      categoryId: `${m.id}-${cat}`,
      name,
      description: `${name}, thoughtfully designed to bring a little more joy to the everyday. Quality materials, considered details, and a timeless feel. Packed with care by an independent team.`,
      price,
      image: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=800&q=85`,
      color,
      badge,
      rating: 4.7 + (i % 3) / 10,
      reviewCount: 24 + i * 17,
      status: "active",
      variants: ["Original", "Limited edition"].map((v, j) => ({
        id: `${id}-v${j}`,
        marketplaceId: m.id,
        productId: id,
        name: v,
        sku: `AV-${i + 1}0${j}`,
        stock: 12 + i * 3 - j * 4,
        price: price + j * 10,
      })),
    };
  }),
);
export const orders: Order[] = marketplaces.flatMap((m) =>
  [0, 1, 2].map((i) => {
    const p = products.filter((p) => p.marketplaceId === m.id)[i];
    return {
      id: `${m.id}-104${i}`,
      marketplaceId: m.id,
      userId: "alex",
      date: `2026-09-${28 - i * 3}`,
      status: (["Processing", "Shipped", "Delivered"] as const)[i],
      items: [
        {
          marketplaceId: m.id,
          productId: p.id,
          sellerId: p.sellerId,
          name: p.name,
          quantity: 1,
          price: p.price,
        },
      ],
      total: p.price,
    };
  }),
);
export const reviews: Review[] = products.map((p) => ({
  id: `review-${p.id}`,
  marketplaceId: p.marketplaceId,
  productId: p.id,
  userId: "noah",
  rating: 5,
  body: "Beautiful quality and even better in person. Arrived carefully packaged — already part of my daily routine.",
}));
export const conversations: Conversation[] = marketplaces.map((m) => ({
  id: `${m.id}-conversation`,
  marketplaceId: m.id,
  participantIds: ["alex", "maya"],
  sellerId: `${m.id}-form`,
  subject: "A question about my order",
}));
export const messages: Message[] = conversations.map((c) => ({
  id: `${c.id}-1`,
  marketplaceId: c.marketplaceId,
  conversationId: c.id,
  senderId: "maya",
  body: "Hi Alex! Your order is packed and ready to go. Let me know if there’s anything else I can help with.",
  createdAt: "2026-09-29T10:30:00Z",
}));
