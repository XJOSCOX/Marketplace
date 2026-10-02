export interface CatalogVariant {
  id: string;
  name: string;
  sku: string;
  stock: number;
  priceAmount: string;
  currency: string;
}
export interface CatalogProduct {
  id: string;
  marketplaceId: string;
  sellerId: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  priceAmount: string;
  currency: string;
  variants: CatalogVariant[];
}
export interface PublicMarketplace {
  owner_user_id?: string;
  status?: string;
  description?: string;
  location?: string;
  hero_heading?: string;
  hero_description?: string;
  logo_path?: string | null;
  branding_completed_at?: string | null;
  store_completed_at?: string | null;
  previewed_at?: string | null;
  id: string;
  slug: string;
  name: string;
  tagline: string;
  mode: "STORE" | "MARKETPLACE" | "HYBRID";
  accent: string;
  currency: string;
}
