export type MarketplaceMode = "STORE" | "MARKETPLACE" | "HYBRID";
export type Role =
  | "buyer"
  | "seller"
  | "marketplace_owner"
  | "marketplace_staff"
  | "platform_admin";
export interface User {
  id: string;
  name: string;
  email: string;
  platformRoles: Role[];
}
export interface Marketplace {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  mode: MarketplaceMode;
  ownerId: string;
  accent: string;
  commission: number;
  domain?: string;
}
export interface MarketplaceMembership {
  id: string;
  marketplaceId: string;
  userId: string;
  roles: Role[];
}
export interface Seller {
  id: string;
  marketplaceId: string;
  userId: string;
  name: string;
  description: string;
  location: string;
  isOwner: boolean;
  status: "active" | "pending";
}
export interface Store {
  id: string;
  marketplaceId: string;
  sellerId: string;
  name: string;
  slug: string;
}
export interface ProductVariant {
  id: string;
  marketplaceId: string;
  productId: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
}
export interface Product {
  id: string;
  marketplaceId: string;
  sellerId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  color: string;
  badge?: string;
  rating: number;
  reviewCount: number;
  variants: ProductVariant[];
  status: "active" | "draft";
}
export interface Category {
  id: string;
  marketplaceId: string;
  name: string;
  slug: string;
  icon: string;
}
export interface Cart {
  id: string;
  marketplaceId: string;
  userId: string;
  items: CartItem[];
}
export interface CartItem {
  marketplaceId: string;
  productId: string;
  variantId: string;
  quantity: number;
}
export interface Order {
  id: string;
  marketplaceId: string;
  userId: string;
  date: string;
  status: "Processing" | "Shipped" | "Delivered";
  items: OrderItem[];
  total: number;
}
export interface OrderItem {
  marketplaceId: string;
  productId: string;
  sellerId: string;
  name: string;
  quantity: number;
  price: number;
}
export interface Review {
  id: string;
  marketplaceId: string;
  productId: string;
  userId: string;
  rating: number;
  body: string;
}
export interface Conversation {
  id: string;
  marketplaceId: string;
  participantIds: string[];
  sellerId: string;
  subject: string;
}
export interface Message {
  id: string;
  marketplaceId: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}
