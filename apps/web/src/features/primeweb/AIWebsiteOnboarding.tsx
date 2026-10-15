import { libraryCategories } from './library-demo';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, PartyPopper, X, ArrowRight, CheckCircle2, Clock, ExternalLink, LayoutGrid, LoaderCircle, Monitor, Rocket, Smartphone, Sparkles } from 'lucide-react';
import { readDemoDataMode, writeDemoDataMode } from '@/lib/demo-data-mode';
import { activateWebsite, addWebsite, createWebsite, publishWebsite, usePrimeWeb, websiteHref } from './store';
import { StorefrontPreview } from './StorefrontPreview';
import { Modal } from './ui';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import './onboarding.css';

// Industry options and visual structure follow ech-prime-web-v2's BusinessInfoForm.
const industries = ['🍽️ Restaurant / cafe / F&B', '🛍️ Shop / fashion / e-commerce', '💄 Beauty / spa / wellness', '💻 Tech / IT / SaaS', '🏥 Health / dental / clinic', '📚 Education / training', '🏠 Real estate / property', '💪 Gym / fitness / yoga', '🎨 Portfolio / freelancer / agency', '🏢 Business / corporate', '🍜 F&B / cafe / bakery', '🎉 Events / wedding', '📝 Blog / media / magazine', '✈️ Travel / tourism'];
const stages = ['Reviewing your business info', 'Creating content & design', 'Preparing preview'];
function Brand({ form = false }: { form?: boolean }) {
  return <header className="pw-ai-brand"><div><h1>{form ? "What's your business about?" : 'Create website with AI'}</h1><p>{form ? 'Tell us about your business so we can build the right website.' : 'Website generation'}</p></div></header>;
}
export function AIWebsiteOnboarding() {
  const navigate = useNavigate(); const [params, setParams] = useSearchParams(); const state = usePrimeWeb();
  const site = state.sites.find(s => s.id === params.get('site'));
  const [step, setStep] = useState<'info' | 'generating'>('info');
  const [name, setName] = useState(''); const [industry, setIndustry] = useState(''); const [products, setProducts] = useState(''); const [description, setDescription] = useState('');
  const [elapsed, setElapsed] = useState(0); const [error, setError] = useState(''); const [mobile, setMobile] = useState(false); const [full, setFull] = useState(false); const [publish, setPublish] = useState(false); const [copied, setCopied] = useState(false);
  const valid = name.trim().length >= 3 && industry && products.trim().length >= 3 && description.trim().length >= 3;
  useEffect(() => {
    if (step !== 'generating' || site) return;
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    const finish = window.setTimeout(() => {
      try {
        const created = createWebsite(name.trim(), industry === industries[0] || industry === industries[10] ? 'artisan' : 'essential');
        created.category = libraryCategories[industries.indexOf(industry)];
        created.draft.seoDescription = description.trim(); created.draft.email = ''; created.draft.posts = [];
        created.draft.pages.forEach(page => { page.blocks.forEach(block => {
          if (block.kind === 'hero') { block.title = `Discover ${name.trim()}`; block.text = description.trim(); block.button = 'Explore our story'; }
          if (block.kind === 'announcement') block.visible = false;
          if (block.kind === 'products') block.visible = false;
          if (block.kind === 'image-text') { block.title = products.trim(); block.text = description.trim(); }
          if (block.kind === 'footer') block.title = description.trim();
        }); });
        created.activity = [`AI draft created · ${industry} · prototype`];
        addWebsite(created);
        if (readDemoDataMode() === 'no-data') activateWebsite(created.id);
        writeDemoDataMode('with-data');
        setParams({ site: created.id }, { replace: true });
      } catch { setError('Unable to save your website. Check browser storage and try again.'); setStep('info'); }
    }, 4200);
    return () => { window.clearInterval(timer); window.clearTimeout(finish); };
  }, [step, site, name, industry, products, description, setParams]);
  const livePath = site ? `${websiteHref('preview', site.id)}&version=live` : '';
  const liveUrl = new URL(window.location.hash.startsWith('#/') ? `${window.location.pathname}#${livePath}` : livePath, window.location.origin).href;
  const dashboard = () => navigate(site ? `${websiteHref('overview', site.id)}&guide=ai` : '/builder/sites');
  const preview = site && <div className={`pw-ai-preview ${mobile ? 'is-mobile' : ''}`}><StorefrontPreview content={site.draft} interactive /></div>;
  return <main className={`pw-ai pw-ai-shell ${site ? 'pw-ai-done' : ''}`}>
    <section className="pw-ai-left"><Brand form={!site && step === 'info'} />
      {!site && step === 'info' ? <form className="pw-ai-form" onSubmit={event => { event.preventDefault(); if (valid) { setError(''); setElapsed(0); setStep('generating'); } }}>
        <div className="pw-ai-fields">
          <label>Business name <b>*</b><input required minLength={3} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The Cookie House, Beauty Spa Hana..." /></label>
          <fieldset><legend>Industry or sector <b>*</b></legend><div className="pw-ai-industries">{industries.map(item => <label key={item} className={industry === item ? 'selected' : ''}><input type="radio" name="industry" required value={item} checked={industry === item} onChange={() => setIndustry(item)} /><span>{item}</span></label>)}</div></fieldset>
          <label>Products or services <b>*</b><textarea required minLength={3} value={products} onChange={e => setProducts(e.target.value)} placeholder="e.g. Specialty coffee, milk tea, pastries..." /><small>What products or services do you offer?</small></label>
          <label>Short description <b>*</b><textarea required minLength={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell us what makes your business special..." /><small>Describe your business, audience and what makes you different.</small></label>
        </div><footer>{error && <p role="alert">{error}</p>}<button className="pw-ai-primary" disabled={!valid}>Generate website<ArrowRight size={18} /></button><button type="button" className="pw-ai-link" onClick={dashboard}>Go to dashboard</button></footer>
      </form> : <><div className="pw-ai-messages" aria-live="polite"><div><Rocket className="pw-ai-bubble-icon" /><p>Starting to build your website...{!site && <small role="status">{stages[Math.min(2, Math.floor(elapsed / 1.5))]} · {elapsed}s</small>}</p></div>{site && <div><CheckCircle2 className="pw-ai-bubble-icon success" /><div className="pw-ai-message"><strong>“{site.draft.name}” is ready!</strong><p><LayoutGrid size={16} />{site.draft.pages.reduce((n, p) => n + p.blocks.filter(b => b.visible).length, 0)} sections generated</p><p><Clock size={16} />{elapsed || 4}s generation time</p><p>See the preview on the right, open the editor to make changes, or publish now.</p></div></div>}</div><footer className="pw-ai-result-actions">{site ? <><div><button className="pw-ai-primary" onClick={() => navigate(websiteHref('theme', site.id))}><ExternalLink size={16} />Open editor</button><button onClick={() => { try { publishWebsite(site.id); setCopied(false); setPublish(true); } catch { toast.error('Unable to publish. Check browser storage and try again.'); } }}><Rocket size={16} />Publish website</button></div><button className="pw-ai-link" onClick={dashboard}>Go to dashboard</button></> : <button className="pw-ai-link" onClick={() => setStep('info')}>Cancel generation</button>}</footer></>}
    </section>
    <section className="pw-ai-right">{site ? <><div className="pw-ai-preview-toolbar"><div><h2>Website preview</h2><p>Your AI-generated website · prototype</p></div><div className="pw-ai-device"><button aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor size={16} />Desktop</button><button aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone size={16} />Mobile</button></div><button className="pw-ai-primary" onClick={() => setFull(true)}><ExternalLink size={16} />View full preview</button></div>{preview}</> : <div className="pw-ai-promo"><div className="pw-ai-spark">{step === 'generating' ? <LoaderCircle className="pw-ai-spin" size={38} /> : <Sparkles size={32} />}</div><h2>{step === 'generating' ? 'Creating your website...' : 'AI website builder'}</h2><p>{step === 'generating' ? 'AI is reviewing your business and building your design.' : 'Just 3 simple steps and AI builds a professional website in minutes.'}</p><ol>{(step === 'generating' ? stages : ['Enter your business details', 'AI creates content and design', 'Preview and publish']).map((text, i) => <li key={text} className={i <= (step === 'generating' ? Math.min(2, Math.floor(elapsed / 1.5)) : 0) ? 'active' : ''}><span>{i + 1}</span>{text}</li>)}</ol>{step === 'generating' && <><progress aria-label="Website generation progress" max={100} value={Math.min(95, 12 + elapsed * 23)} /><small role="status">Elapsed: {elapsed}s · Prototype generation</small></>}</div>}</section>
    <Modal open={full} onClose={() => setFull(false)} title="Full website preview" description="Explore your draft before publishing."><div className="pw-ai-full-preview">{preview}</div></Modal>
    <Dialog.Root open={publish} onOpenChange={setPublish}><Dialog.Portal><Dialog.Overlay className="pw-modal-overlay" /><Dialog.Content className="pw-publish-success"><Dialog.Close className="pw-publish-close" aria-label="Close publish popup"><X size={18} /></Dialog.Close><div className="pw-publish-celebration"><PartyPopper size={32} /></div><Dialog.Title>Congratulations!</Dialog.Title><Dialog.Description>Your website <strong>{site?.draft.name}</strong> is published in the demo.</Dialog.Description><div className="pw-publish-url"><a href={liveUrl} target="_blank" rel="noreferrer" title={liveUrl}>{liveUrl}</a><button onClick={async () => { try { await navigator.clipboard.writeText(liveUrl); setCopied(true); } catch { toast.error('Could not copy the link. You can select and copy it manually.'); } }}>{copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}{copied ? 'Copied!' : 'Copy link'}</button></div><span className="sr-only" role="status">{copied ? 'Link copied to clipboard' : ''}</span><button className="pw-publish-editor" onClick={() => site && navigate(websiteHref('theme', site.id))}><ExternalLink size={16} />Open editor</button><button className="pw-publish-dashboard" onClick={dashboard}><LayoutGrid size={16} />Go to dashboard</button></Dialog.Content></Dialog.Portal></Dialog.Root>
  </main>;
}
