const legacySections: Record<string, string> = {
  stores: '/pos/settings',
  policies: '/pos/settings',
  catalog: '/pos/products',
  stock: '/warehouses/store-stock',
  transactions: '/orders',
  customers: '/customers',
  shifts: '/client-reports/pos-shifts',
};

/** Keep saved demo links usable without maintaining a second management hub. */
export function legacyStoreManagementTarget(search: string): string | undefined {
  const params = new URLSearchParams(search);
  if (!params.has('tab')) return undefined;
  const section = params.get('tab')!;
  params.delete('tab');
  if (section === 'transactions' && !params.has('status')) params.set('status', 'completed');
  return `${legacySections[section] ?? '/pos/settings'}${params.size ? `?${params}` : ''}`;
}
