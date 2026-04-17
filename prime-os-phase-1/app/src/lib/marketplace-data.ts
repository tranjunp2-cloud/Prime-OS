// Marketplace data utilities — stub for marketplace API integration

export interface MarketplaceListing {
  marketplace_id: string;
  channel: string;
  external_id: string;
  status: string;
  last_synced_at: string;
}

export interface MarketplaceData {
  marketplaces: MarketplaceListing[];
  syncStatus: Record<string, 'synced' | 'error' | 'pending'>;
}

export function getMarketplaceData(_userId: string): MarketplaceData {
  return { marketplaces: [], syncStatus: {} };
}
