import { useState } from 'react';
import { Globe, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Action, Field, Panel } from './ui';
import { updateDraft, type Website } from './store';

export function SeoSettings({ site }: { site: Website }) {
  const [busy, setBusy] = useState(false);
  const content = site.draft;
  const address = `https://${site.primaryDomain || (site.primaryDomain === undefined && site.domainStatus === 'verified' ? site.domain : '') || `${site.subdomain ?? site.id.slice(0, 8)}.primeweb.demo`}/`;
  async function upload(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast.error('Choose a JPG, PNG or WebP image under 2 MB.'); return;
    }
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      updateDraft(site.id, draft => ({ ...draft, socialImage: image }));
    } catch { toast.error('Unable to save image. Please try a smaller file.'); }
  }
  async function optimize() {
    setBusy(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 550));
      updateDraft(site.id, draft => ({ ...draft,
        seoTitle: `${draft.name} | Discover our collection`.slice(0, 60),
        seoDescription: `Explore ${draft.name}. Discover our latest collection, find your everyday favorites and shop with confidence.`.slice(0, 160),
      }));
      toast.success('Sample SEO suggestions saved to your draft.');
    } catch { toast.error('Unable to save SEO suggestions.'); }
    finally { setBusy(false); }
  }
  return <div className="pw-two-columns">
    <Panel>
      <h2>SEO & social</h2>
      <div className="pw-seo-verification">
        <Field label="Search verification">
          <small>Paste the Google Search Console verification token for this website.</small>
          <input value={content.searchVerification ?? ''} placeholder="google-site-verification token" onChange={event => updateDraft(site.id, draft => ({ ...draft, searchVerification: event.target.value.trim() }))} />
        </Field>
        <p className="pw-muted">Token saved to draft. Google verification is not connected in this demo.</p>
      </div>
      <Field label="URL slug"><input value="/" readOnly /><small>Homepage URL. Manage other page URLs in the website editor.</small></Field>
      <Field label="Meta title"><input maxLength={60} value={content.seoTitle} onChange={event => updateDraft(site.id, draft => ({ ...draft, seoTitle: event.target.value }))} /><small>{content.seoTitle.length}/60 characters</small></Field>
      <Field label="Meta description"><textarea rows={5} maxLength={160} value={content.seoDescription} onChange={event => updateDraft(site.id, draft => ({ ...draft, seoDescription: event.target.value }))} /><small>{content.seoDescription.length}/160 characters</small></Field>
    </Panel>
    <Panel>
      <h2>Google preview</h2>
      <div className="pw-seo-google" aria-label="Google search result preview">
        <div><Globe size={16} />{content.name}</div><span>{address}</span>
        <h3>{content.seoTitle || content.name}</h3><p>{content.seoDescription || 'Add a meta description to preview your search result.'}</p>
      </div>
      <Field label="Social share image">
        <span className="pw-seo-upload">
          {content.socialImage ? <img src={content.socialImage} alt="Social share preview" /> : <><Upload size={22} /><span>Click to upload social image</span></>}
          <input type="file" aria-label="Upload social share image" accept="image/jpeg,image/png,image/webp" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
        </span>
        <small>Recommended size: 1200 × 630 px (JPG, PNG or WebP, up to 2 MB)</small>
      </Field>
      {content.socialImage && <Action onClick={() => updateDraft(site.id, draft => ({ ...draft, socialImage: '' }))}>Remove image</Action>}
      <Action primary disabled={busy} onClick={() => void optimize()}><Sparkles size={16} />{busy ? 'Optimizing…' : 'Automatic SEO optimization · demo'}</Action>
      <p className="pw-muted">Changes are saved to your website draft. Publish to update the demo snapshot.</p>
    </Panel>
  </div>;
}
