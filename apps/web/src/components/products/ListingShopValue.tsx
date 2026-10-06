import type { ListingShopData } from '@/lib/listing-shop-data';
import { formatPrice } from '@/lib/pricing-rules';

export function ListingShopValue({ data, field }: { data: ListingShopData; field: 'price' | 'stock' }) {
  const available = field === 'price' ? Boolean(data.price) : data.stock != null;
  const value = field === 'price' ? data.price && formatPrice(data.price.amount, data.price.currency) : `${data.stock} units`;
  return <p className="text-sm font-medium tabular-nums">{available ? value : <><span aria-hidden="true">—</span><span className="sr-only">{field === 'price' ? 'Listing price unavailable' : 'Shop stock unavailable'}</span></>}</p>;
}
