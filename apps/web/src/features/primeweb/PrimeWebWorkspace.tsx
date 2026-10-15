import { WebsiteSettings } from './WebsiteSettings';
import { Domains } from './Domains';
import { Blogs } from './Blogs';
import { Websites } from './Websites';
import { PageDemoContext } from './page-demo-context';
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Globe, ArrowRight, Sparkles, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Action, Modal, Pill, Heading } from './ui';
import { Overview } from './Overview';
import { AIDiscoveryWizard } from './AIDiscoveryWizard';
import { AIWebsiteOnboarding } from './AIWebsiteOnboarding';
import { Editor } from './Editor';
import { SeoAnalytics } from './Management';
import { StorefrontPreview } from './StorefrontPreview';
import { hasChanges, publishWebsite, selectWebsite, usePrimeWeb, websiteHref } from './store';
import './primeweb.css';
import { useDemoDataMode } from '@/hooks/use-demo-data-mode';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { DemoDataModeToggle } from '@/components/shared/DemoDataModeToggle';

const sections: Record<string, string> = { sites: 'My websites', overview: 'Overview', theme: 'Website editor', pages: 'Blogs', domains: 'Domains & publishing', seo: 'SEO', settings: 'Website settings', preview: 'Website preview' };
export default function PrimeWebWorkspace() {
  const { noData } = useDemoDataMode();
  const state = usePrimeWeb(); const location = useLocation(); const navigate = useNavigate(); const [params, setParams] = useSearchParams();
  const rawSection = location.pathname.split('/')[2] || 'sites';
  const section = ({ navigation: 'theme', banners: 'theme', integrations: 'seo' } as Record<string, string>)[rawSection] ?? rawSection;
  const siteId = params.get('site') ?? state.activeId;
  const site = state.sites.find(s => s.id === siteId);
  const [publishOpen, setPublishOpen] = useState(false); const [publishing, setPublishing] = useState(false);
  useEffect(() => { if (site && state.selectedId !== site.id) selectWebsite(site.id); }, [site, state.selectedId]);
  useEffect(() => { setPublishOpen(false); }, [siteId]);
  if (section === 'storefront') return <Navigate to="/products/master-catalog" replace />;
  if (section === 'new') return <AIWebsiteOnboarding />;
  if (noData) return <section className="space-y-5 p-4 md:p-6" data-testid="primeweb-no-data"><WorkspacePageHeader title={sections[section] ?? 'PrimeWeb'} description="Create and manage your storefront website." icon={Globe} showDemoModeToggle={false} /><div className="pw-title-demo"><DemoDataModeToggle /></div><div className="pw-ai pw-ai-welcome pw-ai-empty"><div><h2>Build your first website with AI</h2><p>Tell us about your business. AI will help create your storefront, ready for you to preview and customize.</p><div className="pw-ai-divider"><Sparkles aria-hidden="true" /></div><button className="pw-ai-primary" onClick={() => navigate('/builder/new')}><Rocket size={20} />Create my store with AI<ArrowRight size={20} /></button><small>Your website starts as a draft. Publish when you’re ready.</small></div></div></section>;
  if (!sections[section] || (!site && section !== 'sites')) return <div className="pw-page"><h1>{!site ? 'Website not found' : 'Page not found'}</h1><Link className="pw-button" to="/builder/sites">Back to websites</Link></div>;
  const current = site ?? state.sites[0];
  const live = params.get('version') === 'live';
  const canPublish = current.draft.name.trim() && current.draft.pages.some(p => p.blocks.some(b => b.visible));
  const demoControls = <DemoDataModeToggle />;
  return <PageDemoContext.Provider value={demoControls}><div className="pw-workspace">
    {(section === 'theme' || section === 'preview') && <div className="pw-standalone-heading"><Heading title={sections[section]} description="" /></div>}
    {section === 'sites' && <Websites activeId={state.activeId} sites={state.sites} />}
    {section === 'overview' && <><Overview key={current.id} site={current} />{params.get('guide') === 'ai' && <AIDiscoveryWizard key={current.id} siteId={current.id} onClose={() => { const next = new URLSearchParams(params); next.delete('guide'); setParams(next, { replace: true }); }} />}</>}
    {section === 'theme' && <Editor key={current.id} site={current} onPublish={() => setPublishOpen(true)} />}
    {section === 'pages' && <Blogs key={current.id} site={current} />}
    {section === 'domains' && <Domains key={current.id} site={current} />}
    {section === 'seo' && <SeoAnalytics key={current.id} site={current} />}
    {section === 'settings' && <WebsiteSettings key={current.id} site={current} />}
    {section === 'preview' && <div className="pw-preview-page"><div className="pw-preview-toolbar"><Link className="pw-button" to={websiteHref('theme', current.id)}><ArrowLeft size={16} />Back to editor</Link><Pill>{live ? 'Published snapshot · demo' : 'Draft preview · demo'}</Pill><Link className="pw-button" to={live ? websiteHref('preview', current.id) : `${websiteHref('preview', current.id)}&version=live`}>{live ? 'View draft' : 'View published'}</Link></div>{live && (!current.published || current.status !== 'published') ? <div className="pw-empty"><Globe size={40} /><h1>This website is not published</h1><p>You can still preview your draft before publishing.</p></div> : <StorefrontPreview key={`${current.id}-${live}`} content={live ? current.published! : current.draft} interactive />}</div>}

    <Modal open={publishOpen} onClose={() => !publishing && setPublishOpen(false)} title={current.published ? 'Publish your changes' : 'Ready to go live?'} description="Review your draft, then create a published snapshot for the demo."><div className="pw-publish-summary"><Rocket size={32} /><h2>{current.draft.name}</h2><p>{current.draft.pages.length} pages · {current.draft.productIds.length} products · {current.draft.locale.toUpperCase()}</p><div className="pw-callout"><CheckCircle2 size={18} /><p>{hasChanges(current) ? 'Your current draft will replace the published demo snapshot.' : 'Your published snapshot is already up to date.'}</p></div><p className="pw-muted">This prototype does not deploy a public website or change real business data.</p>{!canPublish && <p className="pw-error" role="alert">Add a website name and at least one visible section.</p>}<div className="pw-actions"><Action onClick={() => setPublishOpen(false)} disabled={publishing}>Keep editing</Action><Action primary disabled={publishing || !canPublish} onClick={async () => { setPublishing(true); await new Promise(resolve => setTimeout(resolve, 650)); try { publishWebsite(current.id); setPublishOpen(false); toast.success('Website published in the demo.'); navigate(`${websiteHref('preview', current.id)}&version=live`); } catch { toast.error('Unable to publish. Please check browser storage.'); } finally { setPublishing(false); } }}>{publishing ? 'Publishing…' : 'Publish demo website'}</Action></div></div></Modal>
  </div></PageDemoContext.Provider>;
}
