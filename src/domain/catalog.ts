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
  id: string;
  slug: string;
  name: string;
  tagline: string;
  mode: "STORE" | "MARKETPLACE" | "HYBRID";
  accent: string;
  currency: string;
}
