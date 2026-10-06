import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Globe, Plus, RotateCcw, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Action, Modal, Pill } from './ui';
import { Editor } from './Editor';
import { CreateWebsite, Domains, Overview, PagesContent, SeoAnalytics, Storefront, Websites, WebsiteSettings } from './Management';
import { StorefrontPreview } from './StorefrontPreview';
import { hasChanges, publishWebsite, resetPrimeWeb, selectWebsite, usePrimeWeb, websiteHref } from './store';
import './primeweb.css';

const sections: Record<string, string> = { sites: 'My websites', overview: 'Overview', theme: 'Website editor', pages: 'Pages & blog', storefront: 'Storefront', domains: 'Domains & publishing', seo: 'SEO & analytics', settings: 'Website settings', preview: 'Website preview' };
export default function PrimeWebWorkspace() {
  const state = usePrimeWeb(); const location = useLocation(); const navigate = useNavigate(); const [params] = useSearchParams();
  const rawSection = location.pathname.split('/')[2] || 'sites';
  const section = ({ navigation: 'theme', banners: 'theme', integrations: 'seo' } as Record<string, string>)[rawSection] ?? rawSection;
  const siteId = params.get('site') ?? state.selectedId;
  const site = state.sites.find(s => s.id === siteId);
  const [createOpen, setCreateOpen] = useState(false); const [publishOpen, setPublishOpen] = useState(false); const [resetOpen, setResetOpen] = useState(false); const [publishing, setPublishing] = useState(false);
  useEffect(() => { if (site && state.selectedId !== site.id) selectWebsite(site.id); }, [site, state.selectedId]);
  useEffect(() => { setPublishOpen(false); }, [siteId]);
  if (!sections[section] || (!site && section !== 'sites')) return <div className="pw-page"><h1>{!site ? 'Website not found' : 'Page not found'}</h1><Link className="pw-button" to="/builder/sites">Back to websites</Link></div>;
  const current = site ?? state.sites[0];
  const live = params.get('version') === 'live';
  const canPublish = current.draft.name.trim() && current.draft.pages.some(p => p.blocks.some(b => b.visible));
  return <div className="pw-workspace"><div className="pw-context-bar"><div className="pw-actions"><Globe size={18} /><Link to="/builder/sites">PrimeWeb</Link><span className="pw-context-divider">/</span>{section === 'sites' ? <span>My websites</span> : <><select aria-label="Selected website" value={current.id} onChange={e => { selectWebsite(e.target.value); navigate(websiteHref(section, e.target.value)); }}>{state.sites.map(s => <option key={s.id} value={s.id}>{s.draft.name}</option>)}</select><span className="pw-context-divider">/</span><span className="pw-context-section">{sections[section]}</span></>}</div><div className="pw-actions"><Pill>Prototype</Pill><Action aria-label="Reset PrimeWeb demo" onClick={() => setResetOpen(true)}><RotateCcw size={15} /><span className="pw-desktop-label">Reset demo</span></Action></div></div>
    {section === 'sites' && <Websites sites={state.sites} onCreate={() => setCreateOpen(true)} />}
    {section === 'overview' && <Overview key={current.id} site={current} />}
    {section === 'theme' && <Editor key={current.id} site={current} onPublish={() => setPublishOpen(true)} />}
    {section === 'pages' && <PagesContent key={current.id} site={current} />}
    {section === 'storefront' && <Storefront key={current.id} site={current} />}
    {section === 'domains' && <Domains key={current.id} site={current} onPublish={() => setPublishOpen(true)} />}
    {section === 'seo' && <SeoAnalytics key={current.id} site={current} />}
    {section === 'settings' && <WebsiteSettings key={current.id} site={current} />}
    {section === 'preview' && <div className="pw-preview-page"><div className="pw-preview-toolbar"><Link className="pw-button" to={websiteHref('theme', current.id)}><ArrowLeft size={16} />Back to editor</Link><Pill>{live ? 'Published snapshot · demo' : 'Draft preview · demo'}</Pill><Link className="pw-button" to={live ? websiteHref('preview', current.id) : `${websiteHref('preview', current.id)}&version=live`}>{live ? 'View draft' : 'View published'}</Link></div>{live && (!current.published || current.status !== 'published') ? <div className="pw-empty"><Globe size={40} /><h1>This website is not published</h1><p>You can still preview your draft before publishing.</p></div> : <StorefrontPreview key={`${current.id}-${live}`} content={live ? current.published! : current.draft} interactive />}</div>}
    {createOpen && <CreateWebsite onClose={() => setCreateOpen(false)} onCreated={created => { setCreateOpen(false); navigate(websiteHref('theme', created.id)); toast.success('Your draft website is ready.'); }} />}
    <Modal open={publishOpen} onClose={() => !publishing && setPublishOpen(false)} title={current.published ? 'Publish your changes' : 'Ready to go live?'} description="Review your draft, then create a published snapshot for the demo."><div className="pw-publish-summary"><Rocket size={32} /><h2>{current.draft.name}</h2><p>{current.draft.pages.length} pages · {current.draft.productIds.length} products · {current.draft.locale.toUpperCase()}</p><div className="pw-callout"><CheckCircle2 size={18} /><p>{hasChanges(current) ? 'Your current draft will replace the published demo snapshot.' : 'Your published snapshot is already up to date.'}</p></div><p className="pw-muted">This prototype does not deploy a public website or change real business data.</p>{!canPublish && <p className="pw-error" role="alert">Add a website name and at least one visible section.</p>}<div className="pw-actions"><Action onClick={() => setPublishOpen(false)} disabled={publishing}>Keep editing</Action><Action primary disabled={publishing || !canPublish} onClick={async () => { setPublishing(true); await new Promise(resolve => setTimeout(resolve, 650)); try { publishWebsite(current.id); setPublishOpen(false); toast.success('Website published in the demo.'); navigate(`${websiteHref('preview', current.id)}&version=live`); } catch { toast.error('Unable to publish. Please check browser storage.'); } finally { setPublishing(false); } }}>{publishing ? 'Publishing…' : 'Publish demo website'}</Action></div></div></Modal>
    <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset PrimeWeb demo?" description="This removes your local website edits and restores the three example websites. Main data is not changed."><div className="pw-actions"><Action onClick={() => setResetOpen(false)}>Cancel</Action><Action primary onClick={() => { resetPrimeWeb(); setResetOpen(false); navigate('/builder/sites'); toast.success('PrimeWeb demo restored.'); }}>Reset demo</Action></div></Modal>
  </div>;
}
