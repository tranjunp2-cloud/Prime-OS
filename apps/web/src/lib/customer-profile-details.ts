import type { CustomerGroups, OrderCustomer } from './order-customers';

export interface CustomerProfileEdit { displayName: string; notes: string; revision: number; savedAt: string }
export const emptyProfileEdit: CustomerProfileEdit = { displayName: '', notes: '', revision: 0, savedAt: '' };

// A split gets its own identity. Never copy a shared profile's notes to another person.
export function customerProfileIdentity(customer: OrderCustomer, groups: CustomerGroups) {
  return groups[customer.orders[0]?.id] ? `group:${groups[customer.orders[0].id]}` : customer.id;
}
export const customerProfileKey = (scope: string, identity: string) => `prime.customer-profile.v1:${encodeURIComponent(scope)}:${encodeURIComponent(identity)}`;

export function readCustomerProfile(scope: string, identity: string): { value: CustomerProfileEdit; error?: string } {
  try {
    const raw = localStorage.getItem(customerProfileKey(scope, identity));
    if (!raw) return { value: { ...emptyProfileEdit } };
    const value = JSON.parse(raw);
    if (value.schema !== 1 || typeof value.displayName !== 'string' || value.displayName.length > 100 || typeof value.notes !== 'string' || value.notes.length > 2000 || !Number.isSafeInteger(value.revision) || value.revision < 1 || !Number.isFinite(Date.parse(value.savedAt))) throw new Error('Invalid profile');
    return { value: { displayName: value.displayName, notes: value.notes, revision: value.revision, savedAt: value.savedAt } };
  } catch { return { value: { ...emptyProfileEdit }, error: 'Saved profile edits could not be loaded. Editing is disabled to protect existing data. Allow browser storage and reload.' }; }
}

export function saveCustomerProfile(scope: string, identity: string, edit: Pick<CustomerProfileEdit, 'displayName' | 'notes'>, revision: number): CustomerProfileEdit {
  const current = readCustomerProfile(scope, identity);
  if (current.error) throw new Error(current.error);
  if (current.value.revision !== revision) throw new Error('This profile was updated in another tab. Reload saved details before editing again.');
  const displayName = edit.displayName.trim();
  if (!displayName || displayName.length > 100 || edit.notes.length > 2000) throw new Error('Enter a name of 1–100 characters and notes of at most 2,000 characters.');
  const value = { displayName, notes: edit.notes, revision: revision + 1, savedAt: new Date().toISOString() };
  try { localStorage.setItem(customerProfileKey(scope, identity), JSON.stringify({ schema: 1, ...value })); }
  catch { throw new Error('Could not save in this browser. Allow browser storage and try again. Nothing was changed.'); }
  return value;
}

// Keep drafts through SPA/back navigation, but never treat them as saved edits.
const drafts = new Map<string, { name: string; notes: string; revision: number }>();
const warnAboutDrafts = (event: BeforeUnloadEvent) => { if (drafts.size) { event.preventDefault(); event.returnValue = ''; } };
export const customerProfileDrafts = {
  read: (key: string) => drafts.get(key),
  set: (key: string, draft: { name: string; notes: string; revision: number }) => {
    drafts.set(key, draft);
    window.addEventListener('beforeunload', warnAboutDrafts);
  },
  clear: (key: string) => {
    drafts.delete(key);
    if (!drafts.size) window.removeEventListener('beforeunload', warnAboutDrafts);
  },
};

export function customerOrderStats(customer: OrderCustomer) {
  const count = customer.orders.length;
  const completed = customer.orders.filter(order => order.canonicalStatus === 'closed').length;
  const cancelled = customer.orders.filter(order => order.canonicalStatus === 'canceled').length;
  const validDates = (dates: string[]) => dates.filter(value => Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(a) - Date.parse(b));
  const ordered = validDates(customer.orders.map(order => order.orderedAt));
  const activity = validDates(customer.orders.flatMap(order => [order.orderedAt, ...(order.activity || []).map(item => item.at), ...(order.transitions || []).map(item => item.transitionedAt)]));
  return { count, completed, cancelled, completedRate: count ? Math.round(completed / count * 100) : 0, cancelledRate: count ? Math.round(cancelled / count * 100) : 0, oldest: ordered[0] || '', latest: ordered.at(-1) || '', lastActivity: activity.at(-1) || '' };
}

export function customerDateTime(value: string) {
  return Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not available';
}

export function customerUpdatedAt(...values: string[]) {
  return values.filter(value => Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(b) - Date.parse(a))[0] || '';
}

export function customerRelativeTime(value: string, now = Date.now()) {
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return 'Not available';
  const seconds = Math.floor((now - at) / 1000);
  // Show a real date for future timestamps instead of a misleading "ago".
  if (seconds < -60) return customerDateTime(value);
  if (seconds < 60) return 'just now';
  for (const [unit, duration] of [['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60]] as const) {
    if (seconds >= duration) return `${Math.floor(seconds / duration)}${unit} ago`;
  }
  return 'just now';
}
