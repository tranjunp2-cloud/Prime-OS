export function validateManualOrder(input: unknown): {
  orderKey: string;
  canonicalStatus: 'draft' | 'created';
  currencyCode: string;
  buyerSnapshot: { name: string; phone: string; email: string };
  shippingAddressSnapshot: { address: string; city: string; country: string; postalCode: string };
  lines: { id: string; lineKey: string; sku: string; name: string; quantity: number; unitPrice: number; lineTotal: number; status: string }[];
  totals: { subtotal: number; discount: number; shipping: number; tax: number; grandTotal: number };
  payment: { state: string; method: string; reference: string };
  metadata: { handlingType: 'self' | 'marketplace'; shippingMode: 'seller' | 'platform'; store: string; warehouse: string; assignee: string; notes: string; tags: string[] };
};
