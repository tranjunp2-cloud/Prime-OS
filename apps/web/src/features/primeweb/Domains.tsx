import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, Globe, Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Action, Field, Heading, Modal, Panel, Pill } from './ui';
import { updateWebsite, usePrimeWeb, type Website } from './store';
import './domains.css';

type Entry = { domain: string; status: 'pending' | 'verified' };
export function Domains({ site }: { site: Website }) {
  const state = usePrimeWeb();
  const domains: Entry[] = site.customDomains ?? (site.domain ? [{ domain: site.domain, status: site.domainStatus === 'verified' ? 'verified' : 'pending' }] : []);
  const primary = site.primaryDomain ?? (site.domainStatus === 'verified' ? site.domain : '');
  const slug = site.subdomain ?? site.id.slice(0, 8);
  const platform = `${slug}.primeweb.demo`;
  const [modal, setModal] = useState<'add' | 'slug' | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [remove, setRemove] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [selected, setSelected] = useState(primary);
  const [busy, setBusy] = useState('');
  function save(entries: Entry[], chosen = primary) {
    const active = entries.find(d => d.domain === chosen && d.status === 'verified');
    updateWebsite(site.id, current => ({ ...current, customDomains: entries, primaryDomain: active?.domain ?? '', domain: active?.domain ?? entries[0]?.domain ?? '', domainStatus: active?.status ?? entries[0]?.status ?? 'none' }));
  }
  function submit() {
    const value = input.trim().toLowerCase();
    if (modal === 'slug') {
      if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(value)) { setError('Use 3–63 lowercase letters, numbers or hyphens, without leading or trailing hyphens.'); return; }
      if (['www', 'admin', 'api', 'mail', 'app'].includes(value) || state.sites.some(s => s.id !== site.id && (s.subdomain ?? s.id.slice(0, 8)) === value)) { setError('This subdomain is unavailable in the demo.'); return; }
      updateWebsite(site.id, current => ({ ...current, subdomain: value }));
    } else {
      if (value.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)) { setError('Enter a domain such as shop.example.com, without a protocol or path.'); return; }
      if (value.endsWith('.primeweb.demo') || state.sites.some(s => s.domain === value || s.customDomains?.some(d => d.domain === value))) { setError('This domain is already connected or reserved.'); return; }
      save([...domains, { domain: value, status: 'pending' }]);
    }
    setModal(null);
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); toast.success('Copied.'); } catch { toast.error('Unable to copy.'); }
  }
  async function verify(domain: string) {
    setBusy(domain);
    try { await new Promise(resolve => setTimeout(resolve, 600)); save(domains.map(d => d.domain === domain ? { ...d, status: 'verified' } : d)); toast.success('Connection verified in the demo. No DNS or SSL changes were made.'); }
    catch { toast.error('Unable to save verification.'); }
    finally { setBusy(''); }
  }
  return <div className="pw-page pw-domains">
    <Heading title="Domain Management" description="Manage custom domains for your webstore" />
    <Panel><div className="pw-domain-row"><div><h2>Add a Domain to your store</h2><p>Connect your custom domain to make your store accessible.</p></div><div className="pw-actions"><Action onClick={() => { setSelected(primary); setDrawer(true); }}>Select primary domain</Action><Action primary onClick={() => { setInput(''); setError(''); setModal('add'); }}><Plus size={16} />Add Custom Domain</Action></div></div></Panel>
    <Panel><div className="pw-domain-row"><div><h2><Globe size={20} />{platform}</h2><div className="pw-actions"><Pill good>Platform subdomain · demo</Pill>{!primary && <Pill>Current Primary Domain</Pill>}</div></div><Action onClick={() => { setInput(slug); setError(''); setModal('slug'); }}><Pencil size={15} />Change subdomain</Action></div></Panel>
    {!domains.length && <Panel><div className="pw-empty"><Globe size={28} /><h3>No custom domains yet</h3><p>Add a domain you own to get started.</p></div></Panel>}
    {domains.map(entry => <Panel key={entry.domain}><div className="pw-domain-row"><div><h2>{entry.domain}</h2><div className="pw-actions"><Pill good={entry.status === 'verified'}>{entry.status === 'verified' ? 'Connected & Secured · demo' : 'Pending Verification'}</Pill>{primary === entry.domain && <Pill>Current Primary Domain</Pill>}</div></div><Action className="pw-danger" disabled={primary === entry.domain || !!busy} title={primary === entry.domain ? 'Select another primary domain before removing this one.' : 'Remove domain'} onClick={() => setRemove(entry.domain)}>Remove Domain</Action></div>
      {entry.status === 'pending' && <div className="pw-domain-dns"><h3>Configure DNS records</h3><p>Example records for this prototype. Live DNS instructions will come from your hosting provider.</p><div className="pw-domain-records">{[{ type: 'A', name: '@', value: '192.0.2.1' }, { type: 'CNAME', name: 'www', value: 'cname.primeweb.example' }].map(record => <div key={record.type}><strong>{record.type} record <small>· {record.name}</small></strong><div><code>{record.value}</code><Action aria-label={`Copy ${record.type} record`} onClick={() => void copy(record.value)}><Copy size={16} /></Action></div></div>)}</div><Action primary disabled={!!busy} onClick={() => void verify(entry.domain)}>{busy === entry.domain ? 'Verifying…' : 'Verify Connection · demo'}</Action></div>}
    </Panel>)}
    <p className="pw-muted">Local prototype: domain availability, DNS verification and SSL are simulated. Publish your website from the website editor.</p>
    <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'slug' ? 'Change subdomain' : 'Enter the domain name you own'} description={modal === 'slug' ? 'Changing the subdomain changes your demo website address.' : 'Make sure you have access to your domain registrar.'}><form className="pw-form-stack" onSubmit={event => { event.preventDefault(); submit(); }}><Field label={modal === 'slug' ? 'Subdomain' : 'Domain name'}><input autoFocus required value={input} onChange={event => { setInput(event.target.value); setError(''); }} placeholder={modal === 'slug' ? 'my-store' : 'example.com'} />{modal === 'slug' && <small>{input || 'my-store'}.primeweb.demo</small>}</Field>{error && <p role="alert" className="pw-error">{error}</p>}<div className="pw-actions"><Action onClick={() => setModal(null)}>Cancel</Action><Action primary type="submit">{modal === 'slug' ? 'Save subdomain' : 'Add Domain'}</Action></div></form></Modal>
    <Modal open={!!remove} onClose={() => setRemove('')} title="Remove domain" description={`Remove ${remove} from this website? You can add it again later.`}><div className="pw-actions"><Action onClick={() => setRemove('')}>Cancel</Action><Action className="pw-danger" onClick={() => { save(domains.filter(d => d.domain !== remove)); setRemove(''); }}>Remove Domain</Action></div></Modal>
    <Dialog.Root open={drawer} onOpenChange={setDrawer}><Dialog.Portal><Dialog.Overlay className="pw-modal-overlay" /><Dialog.Content className="pw-domain-drawer workspace-theme-primeweb"><div className="pw-domain-row"><Dialog.Title>Select primary domain</Dialog.Title><Dialog.Close asChild><Action aria-label="Close primary domain panel"><X size={18} /></Action></Dialog.Close></div><Dialog.Description>Choose the main address for your website. Only verified domains can be selected.</Dialog.Description><div className="pw-domain-options">{[{ domain: '', label: platform }, ...domains.filter(d => d.status === 'verified').map(d => ({ domain: d.domain, label: d.domain }))].map(option => <label key={option.domain}><input type="radio" name="primary-domain" value={option.domain} checked={selected === option.domain} onChange={() => setSelected(option.domain)} /><span>{option.label}</span></label>)}</div><div className="pw-actions"><Action onClick={() => setDrawer(false)}>Cancel</Action><Action primary onClick={() => { save(domains, selected); setDrawer(false); }}>Save</Action></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
