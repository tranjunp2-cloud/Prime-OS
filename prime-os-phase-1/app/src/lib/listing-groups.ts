// Listing groups — referenced by listing group components

export interface ListingGroup {
  id: string;
  name: string;
  channel: string;
  fields: ListingField[];
}

export interface ListingField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'image' | 'boolean';
  required?: boolean;
  options?: string[];
  maxLength?: number;
}

// Channel-specific group types
export interface MediaGroup {
  images: MediaImage[];
  videos?: MediaVideo[];
}

export interface MediaImage {
  url: string;
  index: number;
  alt?: string;
}

export interface MediaVideo {
  url: string;
}

export interface ProductDetailsGroup {
  title: string;
  description: string;
  bullets: string[];
  features: Array<{ text: string; index: number }>;
}

export interface ProductIdentityGroup {
  product_id: string;
  sku: string;
  upc?: string;
  ean?: string;
  isbn?: string;
}

export interface SafetyComplianceGroup {
  certifications: string[];
  documents: SafetyDocument[];
}

export interface SafetyDocument {
  name: string;
  url: string;
}

export interface VariationRelationshipsGroup {
  parentSku: string;
  variations: Array<{
    sku: string;
    attributes: Record<string, string>;
  }>;
}

export interface SkuOfferInfo {
  sku: string;
  price?: number;
  salePrice?: number;
  currency?: string;
}

export interface SkuShippingInfo {
  sku: string;
  weight_g?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
}

export interface SkuForListing {
  id: string;
  sku_code: string;
  variation_name?: string;
  product?: {
    title: string;
  };
}

export const RAKUTEN_GROUPS: ListingGroup[] = [];
export const SHOPEE_GROUPS: ListingGroup[] = [];
export const AMAZON_GROUPS: ListingGroup[] = [];
