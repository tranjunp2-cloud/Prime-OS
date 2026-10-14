import type { OrderRecord } from '@/lib/orders-api';
import { isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';

export type CustomerGroups = Record<string, string>;
type PhoneIssue = 'missing' | 'masked' | 'country_unknown' | 'invalid';

/** Only explicit buyer phone country is used, never the delivery country. */
export function normalizeBuyerPhone(raw: string, country?: string): { number: string; issue?: PhoneIssue } {
  const value = raw.trim();
  if (!value) return { number: '', issue: 'missing' };
  if (/^[+\d\s().xX*•…●-]+$/.test(value) && /[*xX•…●]/.test(value)) return { number: '', issue: 'masked' };
  if (!/^\+?[\d\s().-]+$/.test(value)) return { number: '', issue: 'invalid' };
  const region = country?.trim().toUpperCase();
  const defaultCountry = region && isSupportedCountry(region) ? region as CountryCode : undefined;
  if (!value.startsWith('+') && !defaultCountry) return { number: '', issue: 'country_unknown' };
  const phone = parsePhoneNumberFromString(value, { defaultCountry, extract: false });
  return phone?.isValid() ? { number: phone.number } : { number: '', issue: 'invalid' };
}

function phoneFor(order: OrderRecord) {
  return normalizeBuyerPhone(order.buyerSnapshot.phone, order.buyerSnapshot.phoneCountry);
}

const normalizedText = (value: string) => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ');

export interface OrderCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneIssue?: PhoneIssue;
  buyerNames: string[];
  separated: boolean;
  channels: string[];
  orders: OrderRecord[];
  lastOrderAt: string;
  address: OrderRecord['shippingAddressSnapshot'] | undefined;
  spent: { currency: string; amount: number }[];
}

export const customerSpendDescription = 'Paid order totals, excluding cancelled and refunded orders. Different currencies are shown separately.';

function timestamp(date: string) {
  const value = Date.parse(date);
  return Number.isFinite(value) ? value : 0;
}

/** Pass only orders authorized for the current workspace. Never mutate order snapshots. */
export function buildOrderCustomers(records: OrderRecord[], separatedGroups: CustomerGroups = {}): OrderCustomer[] {
  const groups = new Map<string, OrderRecord[]>();
  const uniqueOrders = new Map(records.map(order => [order.id, order]));
  const separatedPhones = new Set(records.filter(order => separatedGroups[order.id]).map(order => phoneFor(order).number).filter(Boolean));
  for (const order of uniqueOrders.values()) {
    if (order.canonicalStatus === 'draft') continue;
    const phone = phoneFor(order).number;
    // A manual separation freezes existing membership. New orders sharing this
    // phone stay independent rather than being attributed to the wrong person.
    const key = !phone ? `order:${order.id}` : JSON.stringify([phone, separatedPhones.has(phone) ? separatedGroups[order.id] || `new:${order.id}` : 'auto']);
    const group = groups.get(key);
    if (group) group.push(order); else groups.set(key, [order]);
  }
  return [...groups.values()].map(group => {
    const orders = [...group].sort((a, b) => timestamp(b.orderedAt) - timestamp(a.orderedAt) || a.id.localeCompare(b.id));
    const latest = orders[0];
    const phone = phoneFor(latest);
    const names = new Map<string, string>();
    for (const order of orders) {
      const name = order.buyerSnapshot.name.trim();
      if (name && !names.has(normalizedText(name))) names.set(normalizedText(name), name);
    }
    const totals = new Map<string, number>();
    for (const order of orders) {
      const currency = order.currencyCode || 'VND';
      const paid = order.payment.state.trim().toLowerCase() === 'paid' && order.canonicalStatus !== 'canceled';
      const amount = paid && Number.isFinite(order.totals.grandTotal) ? Math.max(0, order.totals.grandTotal) : 0;
      totals.set(currency, (totals.get(currency) || 0) + amount);
    }
    return {
      // Use an order ID for deep links instead of putting contact information in URLs.
      id: `customer-${[...group].sort((a, b) => timestamp(a.orderedAt) - timestamp(b.orderedAt) || a.id.localeCompare(b.id))[0].id}`,
      name: orders.find(order => order.buyerSnapshot.name.trim())?.buyerSnapshot.name.trim() || 'Unnamed customer',
      email: orders.find(order => order.buyerSnapshot.email.trim())?.buyerSnapshot.email.trim() || '',
      phone: phone.number || latest.buyerSnapshot.phone.trim(),
      phoneIssue: phone.issue,
      buyerNames: [...names.values()],
      separated: Boolean(phone.number && separatedPhones.has(phone.number)),
      channels: [...new Set(orders.map(order => order.metadata.store.trim() || 'Unknown channel'))],
      orders,
      lastOrderAt: latest.orderedAt,
      address: Object.values(latest.shippingAddressSnapshot).some(value => value?.trim()) ? latest.shippingAddressSnapshot : undefined,
      spent: [...totals].map(([currency, amount]) => ({ currency, amount })),
    };
  }).sort((a, b) => timestamp(b.lastOrderAt) - timestamp(a.lastOrderAt) || a.name.localeCompare(b.name));
}

/** Split just the selected orders; all other order fields remain untouched. */
export function separateCustomerOrders(customer: OrderCustomer, selectedIds: string[], groups: CustomerGroups): CustomerGroups {
  const selected = new Set(selectedIds);
  if (customer.phoneIssue || !selected.size || selected.size >= customer.orders.length || selectedIds.some(id => !customer.orders.some(order => order.id === id))) throw new Error('Select at least one order and leave at least one in the original profile.');
  const splitId = crypto.randomUUID();
  const remainingId = crypto.randomUUID();
  return { ...groups, ...Object.fromEntries(customer.orders.map(order => [order.id, selected.has(order.id) ? splitId : remainingId])) };
}

export function undoCustomerSeparation(customer: OrderCustomer, records: OrderRecord[], groups: CustomerGroups): CustomerGroups {
  if (customer.phoneIssue) return groups;
  const next = { ...groups };
  for (const order of records) if (phoneFor(order).number === customer.phone) delete next[order.id];
  return next;
}

export function customerMoney(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount); }
  catch { return `${amount.toLocaleString('en-US')} ${currency}`; }
}

export function customerDate(value: string) {
  return timestamp(value) ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable';
}

export function customerMatchesSearch(customer: OrderCustomer, search: string) {
  const query = normalizedText(search);
  const text = normalizedText([customer.name, customer.email, customer.phone, ...customer.orders.flatMap(order => [order.orderKey, order.buyerSnapshot.name, order.buyerSnapshot.email, order.buyerSnapshot.phone])].join(' '));
  const phoneQuery = query.replace(/\D/g, '');
  const phones = [customer.phone, ...customer.orders.flatMap(order => [order.buyerSnapshot.phone, phoneFor(order).number])];
  return text.includes(query) || (phoneQuery.length > 0 && /^[\d\s()+.-]+$/.test(query) && phones.some(phone => phone.replace(/\D/g, '').includes(phoneQuery)));
}
