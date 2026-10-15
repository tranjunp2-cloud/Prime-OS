import { libraryDemos, type LibraryCategory } from './library-demo';
import { useSyncExternalStore } from 'react';
import { getProducts } from '@/lib/product-store';

export type BlockKind = 'announcement' | 'hero' | 'products' | 'image-text' | 'contact' | 'footer';
export type Block = { id: string; kind: BlockKind; sourceType?: string; sourceVariant?: string; title: string; text: string; image: string; visible: boolean; button: string };
export type WebPage = { id: string; title: string; slug: string; blocks: Block[] };
export type BlogPost = { id: string; title: string; category: string; content: string; status: 'draft' | 'published'; thumbnail?: string; author?: string; updatedAt?: string };
export type WebsiteBusiness = {
  phone?: string; address?: string; state?: string; city?: string; postcode?: string;
  mapsLink?: string; latitude?: string; longitude?: string; category?: string; subtype?: string;
  priceRange?: string; serviceArea?: string; socials?: Record<string, string>;
  hours?: { day: string; closed: boolean; opens: string; closes: string }[];
};
export type WebsiteContent = {
  name: string; color: string; font: string; logo: string; favicon: string; locale: string; email: string;
  pages: WebPage[]; posts: BlogPost[]; productIds: string[]; collection: string;
  business?: WebsiteBusiness; seoTitle: string; seoDescription: string; searchVerification?: string; socialImage?: string; blogCategories?: string[];
};
export type Website = {
  id: string; template: string; category?: LibraryCategory; draft: WebsiteContent; published: WebsiteContent | null;
  status: 'draft' | 'published'; savedAt: string; publishedAt?: string; domain: string;
  domainStatus: 'none' | 'pending' | 'verified'; activity: string[];
  subdomain?: string; primaryDomain?: string; customDomains?: { domain: string; status: 'pending' | 'verified' }[];
};
type State = { version: 1; sites: Website[]; selectedId: string; activeId: string };
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
  return { version: 1, sites: completeLibraryDemo([first, second, third]), selectedId: first.id, activeId: first.id };
}
// Add missing demo cases without replacing user websites, edits or the active selection.
export function completeLibraryDemo(sites: Website[]): Website[] {
  const next = [...sites];
  libraryDemos.forEach((demo, index) => {
    const id = `library-demo-${index + 1}`;
    if (next.some(site => site.id === id)) return;
    const site = createWebsite(demo.name);
    site.id = id; site.category = demo.category;
    site.draft.color = demo.color; site.draft.seoDescription = demo.description;
    site.draft.pages[0].blocks[1].title = demo.headline;
    site.draft.pages[0].blocks[1].text = demo.description;
    site.draft.pages[0].blocks[1].button = demo.category === 'E-commerce' ? 'Shop collection' : 'Discover more';
    site.draft.pages.forEach(page => page.blocks.forEach(block => {
      if (block.kind === 'image-text') { block.title = `Welcome to ${demo.name}`; block.text = demo.description; }
      if (block.kind === 'products') block.visible = demo.category === 'E-commerce';
    }));
    if (index % 3 !== 0) {
      site.published = structuredClone(site.draft); site.status = 'published'; site.publishedAt = site.savedAt;
      if (index % 3 === 2) site.draft.pages[0].blocks[1].text += ' Explore what’s new this season.';
    }
    next.push(site);
  });
  return next;
}
function read(): State {
  try { const raw = localStorage.getItem(KEY); if (raw) { const parsed = JSON.parse(raw); if (parsed.version === 1 && Array.isArray(parsed.sites) && parsed.sites.length && parsed.sites.every((s: Website) => s.id && s.draft?.pages?.length && Array.isArray(s.draft.posts) && Array.isArray(s.draft.productIds))) return { ...parsed, sites: completeLibraryDemo(parsed.sites), activeId: parsed.sites.some((s: Website) => s.id === parsed.activeId) ? parsed.activeId : (parsed.sites.find((s: Website) => s.status === 'published')?.id ?? parsed.sites[0].id) }; } } catch { /* Recover invalid or unavailable local prototype data. */ }
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

// Active storefront is independent of the website being viewed or edited.
export function activateWebsite(id: string) {
  if (!state.sites.some(site => site.id === id)) throw new Error('Website not found');
  commit({ ...state, activeId: id, selectedId: id });
}
