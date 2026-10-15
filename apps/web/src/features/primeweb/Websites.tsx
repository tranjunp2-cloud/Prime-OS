import { libraryCategories } from './library-demo';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, CheckCircle2, Eye, Layers, Pencil, Search, Sparkles, X } from 'lucide-react';
import { Action, Heading, Modal } from './ui';
import { websiteHref, type Website } from './store';
import './website-library.css';

// Gallery structure follows ech-prime-web-v2 EditorTemplateModal / TemplateCard.
export function Websites({ sites, activeId }: { sites: Website[]; activeId: string }) {
  const [search, setSearch] = useState(''); const [category, setCategory] = useState('All'); const [upgradeSite, setUpgradeSite] = useState<Website | null>(null);
  const categoryOf = (site: Website) => site.category ?? (site.template === 'studio' ? 'Creative' : 'E-commerce');
  const categories = ['All', ...libraryCategories];
  const filtered = sites.filter(site => (category === 'All' || categoryOf(site) === category) && `${site.draft.name} ${site.draft.seoDescription}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="pw-page pw-library-page"><Heading title="My websites" description="Your website library. Choose one website to use for your store." />
    <form className="pw-library-search-row" role="search" onSubmit={event => { event.preventDefault(); event.currentTarget.querySelector('input')?.focus(); }}><div className="pw-library-search"><input type="search" aria-label="Search websites" placeholder="Search templates..." value={search} onChange={event => setSearch(event.target.value)} />{search && <button type="button" aria-label="Clear search" onClick={event => { setSearch(''); event.currentTarget.parentElement?.querySelector('input')?.focus(); }}><X size={16} aria-hidden="true" /></button>}</div><button type="submit" className="pw-library-search-submit" aria-label="Search templates"><Search size={18} aria-hidden="true" /></button></form>
    <div className="pw-library-filters">{categories.map(label => <button key={label} aria-pressed={category === label} onClick={() => setCategory(label)}>{label}</button>)}</div>
    <p className="pw-muted">Showing {filtered.length} of {sites.length} websites</p>
    <div className="pw-library-grid">{filtered.map(site => <article key={site.id} className={`pw-library-card ${site.id === activeId ? 'is-active' : ''}`} aria-label={site.draft.name}>
      <div className="pw-library-thumbnail"><div className="pw-mini-browser"><span /><span /><span /><small>{site.draft.name}</small></div><div className="pw-thumbnail-content" style={{ '--site-color': site.draft.color } as React.CSSProperties}><span>{site.draft.name}</span><div><h2>{site.draft.pages[0].blocks.find(block => block.kind === 'hero')?.title ?? site.draft.name}</h2><div className="pw-thumbnail-object"><Layers size={48} strokeWidth={1} /></div></div><i /><i /><i /></div>{site.id !== activeId && <span className="pw-library-pro"><Crown size={12} aria-hidden="true" />Pro</span>}{site.id === activeId && <span className="pw-library-active"><CheckCircle2 size={14} />In use</span>}<div className="pw-library-hover"><Link className="pw-library-preview-action" aria-label={`Preview ${site.draft.name}`} to={websiteHref('preview', site.id)}><Eye size={15} />Preview</Link>{site.id === activeId ? <Link className="pw-library-use-action" aria-label={`Edit ${site.draft.name}`} to={websiteHref('theme', site.id)}><Pencil size={15} />Edit website</Link> : <button className="pw-library-use-action" onClick={() => setUpgradeSite(site)}><Sparkles size={15} />Use this template</button>}</div></div>
      <div className="pw-library-caption"><h2>{site.draft.name}</h2><small>{categoryOf(site)}</small></div>
    </article>)}</div>{filtered.length === 0 && <div className="pw-empty"><Search size={28} /><h2>No websites found</h2><p>Try another search or category.</p><Action onClick={() => { setSearch(''); setCategory('All'); }}>Clear filters</Action></div>}
    <Modal open={!!upgradeSite} onClose={() => setUpgradeSite(null)} title="Unlock Pro templates" description={`Upgrade your plan to use ${upgradeSite?.draft.name ?? 'this template'}. You can still preview it before upgrading.`}><div className="pw-pro-upgrade"><Crown size={32} /><p>Access the Pro template library and choose a new design for your website.</p><div className="pw-actions"><Action onClick={() => setUpgradeSite(null)}>Not now</Action><Link className="pw-button pw-primary" to="/billing?tab=plans"><Crown size={16} />View upgrade plans</Link></div></div></Modal>
  </div>;
}
