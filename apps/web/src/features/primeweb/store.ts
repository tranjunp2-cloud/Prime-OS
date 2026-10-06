import { useSyncExternalStore } from 'react';
import { getProducts } from '@/lib/product-store';

export type BlockKind = 'announcement' | 'hero' | 'products' | 'image-text' | 'contact' | 'footer';
export type Block = { id: string; kind: BlockKind; title: string; text: string; image: string; visible: boolean; button: string };
export type WebPage = { id: string; title: string; slug: string; blocks: Block[] };
export type BlogPost = { id: string; title: string; category: string; content: string; status: 'draft' | 'published' };
export type WebsiteContent = {
  name: string; color: string; font: string; logo: string; favicon: string; locale: string; email: string;
  pages: WebPage[]; posts: BlogPost[]; productIds: string[]; collection: string;
  seoTitle: string; seoDescription: string;
};
export type Website = {
  id: string; template: string; draft: WebsiteContent; published: WebsiteContent | null;
  status: 'draft' | 'published'; savedAt: string; publishedAt?: string; domain: string;
  domainStatus: 'none' | 'pending' | 'verified'; activity: string[];
};
type State = { version: 1; sites: Website[]; selectedId: string };
const KEY = 'primeweb.prototype.v1';
export const templates = [
  { id: 'essential', name: 'Essential Store', category: 'Commerce', color: '#16635b', title: 'Good things. Everyday.', description: 'Thoughtful essentials for the way you live.' },
  { id: 'studio', name: 'Creative Studio', category: 'Brand & services', color: '#6947a0', title: 'Make room for possibility.', description: 'A fresh perspective on the things that matter.' },
  { id: 'artisan', name: 'Artisan Collection', category: 'Lifestyle', color: '#995330', title: 'Made slowly. Chosen well.', description: 'Discover considered objects with a story to tell.' },
];
export function makeBlock(kind: BlockKind): Block {
  const titles: Record<BlockKind, string> = { announcement: 'A little something for your everyday', hero: 'Good things. Everyday.', products: 'The considered collection', 'image-text': 'A story worth sharing', contact: 'Let’s stay in touch', footer: 'Thoughtfully selected. Made for you.' };
  return { id: crypto.randomUUID(), kind, title: titles[kind], text: kind === 'hero' ? 'Thoughtful essentials for the way you live. Explore our latest collection.' : kind === 'contact' ? 'Leave a message and our team will get back to you.' : 'Discover the details that make a difference.', image: '', visible: true, button: 'Explore collection' };
}
export function createWebsite(name: string, templateId = 'essential', productIds: string[] = [], locale = 'en'): Website {
  const template = templates.find(t => t.id === templateId) ?? templates[0];
  const blocks = (['announcement', 'hero', 'products', 'image-text', 'contact', 'footer'] as BlockKind[]).map(makeBlock);
  blocks[1].title = template.title; blocks[1].text = template.description;
  return { id: crypto.randomUUID(), template: template.id, status: 'draft', savedAt: new Date().toISOString(), domain: '', domainStatus: 'none', published: null, activity: ['Website draft created'], draft: { name, color: template.color, font: 'Inter', logo: '', favicon: '', locale, email: 'hello@example.com', pages: [{ id: 'home', title: 'Home', slug: '', blocks }, { id: 'about', title: 'Our story', slug: 'about', blocks: [makeBlock('image-text'), makeBlock('contact'), makeBlock('footer')] }], posts: [{ id: 'welcome', title: 'Welcome to our world', category: 'Stories', content: 'A closer look at the people, ideas and details behind our collection.', status: 'draft' }], productIds, collection: 'Featured collection', seoTitle: name, seoDescription: template.description } };
}
export function seedState(): State {
  const ids = getProducts().filter(p => p.status !== 'archived').slice(0, 4).map(p => p.id);
  const first = createWebsite('Everyday Living', 'essential', ids); first.id = 'everyday'; first.published = structuredClone(first.draft); first.status = 'published'; first.publishedAt = first.savedAt; first.domain = 'everyday.example.com'; first.domainStatus = 'verified';
  const second = createWebsite('Studio Objects', 'studio', ids.slice(0, 3)); second.id = 'studio'; second.published = structuredClone(second.draft); second.status = 'published'; second.publishedAt = second.savedAt; second.draft.pages[0].blocks[1].title = 'A new season of possibility.';
  const third = createWebsite('The Artisan Edit', 'artisan'); third.id = 'artisan';
  return { version: 1, sites: [first, second, third], selectedId: first.id };
}
function read(): State {
  try { const raw = localStorage.getItem(KEY); if (raw) { const parsed = JSON.parse(raw); if (parsed.version === 1 && Array.isArray(parsed.sites) && parsed.sites.length && parsed.sites.every((s: Website) => s.id && s.draft?.pages?.length && Array.isArray(s.draft.posts) && Array.isArray(s.draft.productIds))) return parsed; } } catch { /* Recover invalid or unavailable local prototype data. */ }
  return seedState();
}
let state = read();
const listeners = new Set<() => void>();
function commit(next: State) {
  // Persist before notifying: a quota error must not look like a successful save.
  localStorage.setItem(KEY, JSON.stringify(next)); state = next; listeners.forEach(fn => fn());
}
export function usePrimeWeb() { return useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => state); }
export function selectWebsite(id: string) { if (state.sites.some(s => s.id === id)) commit({ ...state, selectedId: id }); }
export function updateWebsite(id: string, change: (site: Website) => Website) { commit({ ...state, sites: state.sites.map(s => s.id === id ? change(structuredClone(s)) : s) }); }
export function updateDraft(id: string, change: (draft: WebsiteContent) => WebsiteContent) { updateWebsite(id, site => ({ ...site, draft: change(site.draft) })); }
export function addWebsite(site: Website) { commit({ ...state, sites: [...state.sites, site], selectedId: site.id }); }
export function hasChanges(site: Website) { return JSON.stringify(site.draft) !== JSON.stringify(site.published); }
export function publishSnapshot(site: Website): Website { return { ...site, published: structuredClone(site.draft), status: 'published', publishedAt: new Date().toISOString(), savedAt: new Date().toISOString(), activity: ['Website published · demo', ...site.activity].slice(0, 8) }; }
export function publishWebsite(id: string) { updateWebsite(id, publishSnapshot); }
export function resetPrimeWeb() { commit(seedState()); }
export function websiteHref(section: string, id: string) { return `/builder/${section}?site=${encodeURIComponent(id)}`; }
