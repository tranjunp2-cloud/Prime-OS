// Listing Store — singleton in-memory for local mockup
// Replaces Supabase queries for marketplace listings

export type Channel = 'rakuten' | 'shopee' | 'amazon' | 'website' | 'tiktok';
export type ListingStatus = 'draft' | 'published' | 'paused' | 'error';

export interface Listing {
  id: string;
  sku_id: string;
  channel: Channel;
  channel_product_id: string | null;
  channel_sku: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string;
  category_id: string | null;
  attributes: Record<string, string>;
  images: string[];
  status: ListingStatus;
  error_message: string | null;
  published_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

let _listings: Listing[] = [];

export function getListings(): Listing[] {
  return _listings;
}

export function getListingById(id: string): Listing | undefined {
  return _listings.find(l => l.id === id);
}

export function getListingsBySku(skuId: string): Listing[] {
  return _listings.filter(l => l.sku_id === skuId);
}

export function getListingsByChannel(channel: Channel): Listing[] {
  return _listings.filter(l => l.channel === channel);
}

export function addListing(l: Listing): void {
  _listings = [l, ..._listings];
}

export function clearListingStore(): void {
  _listings = [];
}

export function updateListing(id: string, updates: Partial<Listing>): void {
  _listings = _listings.map(l => l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l);
}

export function deleteListing(id: string): void {
  _listings = _listings.filter(l => l.id !== id);
}
