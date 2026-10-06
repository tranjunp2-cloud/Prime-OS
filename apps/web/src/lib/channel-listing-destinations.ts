import { Globe2, MessageSquare, MonitorSmartphone, ShoppingBag, Store } from 'lucide-react';

export type ListingDestinationKey = 'webstore' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'rakuten' | 'social';

export const LISTING_DESTINATIONS: Array<{
  key: ListingDestinationKey;
  label: string;
  description: string;
  account?: string;
  connectionStatus: 'connected' | 'attention' | 'not_connected';
  unavailableReason?: string;
  icon: typeof Globe2;
  iconClassName: string;
}> = [
  { key: 'webstore', label: 'PrimeWeb', description: 'Online storefront', account: 'primebeauty.vn', connectionStatus: 'connected' as const, icon: Globe2, iconClassName: 'bg-emerald-50 text-emerald-600' },
  { key: 'pos', label: 'PrimePOS', description: 'Retail outlets', account: 'District 1 Flagship', connectionStatus: 'connected' as const, icon: Store, iconClassName: 'bg-violet-50 text-violet-600' },
  { key: 'shopee', label: 'Shopee', description: 'Vietnam · vi-VN', account: 'Prime Beauty Official · VN', connectionStatus: 'connected' as const, icon: ShoppingBag, iconClassName: 'bg-orange-50 text-orange-600' },
  { key: 'lazada', label: 'Lazada', description: 'Malaysia · ms-MY', account: 'Prime Flagship Store · MY', connectionStatus: 'connected' as const, icon: ShoppingBag, iconClassName: 'bg-blue-50 text-blue-600' },
  { key: 'tiktok', label: 'TikTok Shop', description: 'Social commerce', account: 'Prime Live Store', connectionStatus: 'attention' as const, unavailableReason: 'Resolve the channel sync error before creating a listing.', icon: MonitorSmartphone, iconClassName: 'bg-slate-100 text-slate-700' },
  { key: 'amazon', label: 'Amazon', description: 'Japan · ja-JP', account: 'Prime Beauty Japan', connectionStatus: 'connected' as const, icon: ShoppingBag, iconClassName: 'bg-amber-50 text-amber-700' },
  { key: 'rakuten', label: 'Rakuten', description: 'Marketplace', account: 'Prime Beauty JP', connectionStatus: 'connected' as const, icon: ShoppingBag, iconClassName: 'bg-rose-50 text-rose-700' },
  { key: 'social', label: 'Social Inbox', description: 'Chat-assisted sales', connectionStatus: 'not_connected' as const, unavailableReason: 'Connect a Social Inbox workspace before creating a listing.', icon: MessageSquare, iconClassName: 'bg-sky-50 text-sky-600' },
];
