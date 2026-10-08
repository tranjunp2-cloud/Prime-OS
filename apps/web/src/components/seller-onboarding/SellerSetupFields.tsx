import { useId, type ReactNode } from 'react';
import { Check, ChevronDown, Globe2, Layers3, Package, PenLine, ShieldCheck, Store, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SellerDemo } from './demo-state';

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: (id: string, hintId?: string) => ReactNode }) {
  const id = useId();
  return <div className="seller-field">
    <label htmlFor={id}>{label}{required && <span aria-hidden="true" className="seller-required">*</span>}</label>
    {children(id, hint ? `${id}-hint` : undefined)}
    {hint && <p id={`${id}-hint`} className="seller-field-hint">{hint}</p>}
  </div>;
}

const channels = [
  { name: 'Shopee', description: 'Marketplace', initial: 'S' },
  { name: 'Lazada', description: 'Marketplace', initial: 'L' },
  { name: 'TikTok Shop', description: 'Social commerce', initial: 'T' },
  { name: 'Shopify', description: 'Online storefront', initial: 'S' },
  { name: 'Amazon', description: 'Global marketplace', initial: 'a' },
  { name: 'WooCommerce', description: 'Online storefront', initial: 'W' },
];

interface Props {
  data: SellerDemo;
  update: (patch: Partial<SellerDemo>) => void;
  toggleChannel: (channel: string) => void;
}

export function SellerSetupFields({ data, update, toggleChannel }: Props) {
  const input = (key: 'name' | 'business' | 'email' | 'warehouse' | 'address', label: string, placeholder: string, hint?: string) => (
    <Field label={label} hint={hint} required>{(id, hintId) => <Input id={id} aria-describedby={hintId} required className="seller-input" value={data[key]} type={key === 'email' ? 'email' : 'text'} autoComplete={key === 'email' ? 'email' : key === 'business' ? 'organization' : key === 'address' ? 'street-address' : 'off'} placeholder={placeholder} onChange={event => update({ [key]: event.target.value })} />}</Field>
  );
  const select = (key: 'language' | 'currency' | 'theme' | 'timezone' | 'market' | 'sellerType', label: string, options: string[], hint?: string) => (
    <Field label={label} hint={hint}>{(id, hintId) => <div className="seller-select-wrap"><select id={id} aria-describedby={hintId} className="seller-input" value={data[key]} onChange={event => update({ [key]: event.target.value })}>{options.map(option => <option key={option}>{option}</option>)}</select><ChevronDown aria-hidden="true" /></div>}</Field>
  );

  if (data.step === 0) return <>
    <section className="seller-field-section" aria-labelledby="workspace-details">
      <h2 id="workspace-details" className="seller-section-title"><Store />Workspace details</h2>
      {input('name', 'Workspace name', 'e.g. Prime Commerce Osaka', 'The name your team will see when they sign in.')}
    </section>
    <section className="seller-field-section" aria-labelledby="workspace-preferences">
      <h2 id="workspace-preferences" className="seller-section-title"><Globe2 />Regional preferences</h2>
      <div className="seller-fields-grid">
        {select('language', 'System language', ['Tiếng Việt', 'English', '日本語'], 'Your preferred language for this workspace.')}
        {select('currency', 'Default currency', ['VND', 'USD', 'JPY', 'SGD'], 'Used for reports and workspace totals.')}
        {select('theme', 'Theme', ['System', 'Light', 'Dark'])}
      </div>
      <details className="seller-advanced"><summary><ChevronDown />Advanced defaults<span>Timezone</span></summary><div>{select('timezone', 'Timezone', ['Asia/Ho_Chi_Minh', 'Asia/Tokyo', 'Asia/Singapore', 'UTC'])}</div></details>
    </section>
  </>;

  if (data.step === 1) return <>
    {select('market', 'Primary market', ['Vietnam', 'Japan', 'Singapore', 'United States'], 'Start with your main market. You can expand to more markets later.')}
    <fieldset className="seller-field-section"><legend className="seller-section-title">Choose your sales channels <span className="seller-optional">Optional</span></legend>
      <p className="seller-field-hint">Select the places where you already sell, or continue without a channel.</p>
      <div className="seller-channel-grid">{channels.map(channel => {
        const selected = data.channels.includes(channel.name);
        const connected = data.connected.includes(channel.name);
        return <div key={channel.name} className="seller-channel" data-selected={selected}>
          <label><span className="seller-channel-avatar" aria-hidden="true">{channel.initial}</span><span className="seller-channel-copy"><strong>{channel.name}</strong><span>{channel.description}</span></span><input aria-label={channel.name} type="checkbox" checked={selected} onChange={() => toggleChannel(channel.name)} /></label>
          {selected && <Button type="button" variant="outline" className="seller-channel-connect" disabled={connected} onClick={() => update({ connected: [...data.connected, channel.name] })}>{connected ? <><Check />Demo connected</> : 'Connect demo store'}</Button>}
        </div>;
      })}</div>
      <p className="seller-field-hint">Preview connections only. No store authorization or data sync takes place.</p>
    </fieldset>
  </>;

  if (data.step === 2) return <>
    <section className="seller-field-section"><h2 className="seller-section-title"><Store />Business identity</h2>
      {input('business', 'Selling name', 'Your business or store name', 'Use the name your customers recognize.')}
      {select('sellerType', 'Seller type', ['Business', 'Individual'])}
    </section>
    <section className="seller-field-section"><h2 className="seller-section-title"><ShieldCheck />Contact details</h2>
      {input('email', 'Contact email', 'seller@example.com', 'The contact email for your selling profile.')}
      <div className="seller-inline-note"><ShieldCheck /><p>One selling profile for all your stores. You can add legal and tax details later in Settings.</p></div>
    </section>
  </>;

  if (data.step === 3) return <>
    <section className="seller-field-section"><h2 className="seller-section-title"><Warehouse />Fulfillment location</h2>
      {input('warehouse', 'Stock location name', 'e.g. Main warehouse', 'A warehouse, retail store, or your own fulfillment space.')}
      {input('address', 'Address', 'Street, city, province and postal code')}
    </section>
    <div className="seller-location-preview"><span className="seller-preview-icon"><Warehouse /></span><div><strong>{data.warehouse || 'Your first stock location'}</strong><p>{data.address || 'Add an address to complete this location.'}</p><span className="seller-tag">Default fulfillment location</span></div></div>
    <p className="seller-field-hint">{data.connected.length ? `Mapped to ${data.connected.join(', ')} in this demo.` : 'Connect a channel later to map this location to a store.'} No stock is created automatically.</p>
  </>;

  return <fieldset className="seller-catalog-options"><legend className="sr-only">Catalog starting point</legend>{[
    { id: 'later', title: 'Start with an empty catalog', text: 'Explore your workspace first. Add your products whenever you are ready.', icon: Package, badge: 'A fresh start' },
    { id: 'manual', title: 'Add products manually', text: 'Create your first products one at a time after setup.', icon: PenLine, badge: '' },
    { id: 'channel', title: 'Import from a connected channel', text: 'Plan an import from your existing store. Products are not fetched in this preview.', icon: Layers3, badge: '' },
  ].map(option => <label key={option.id} className="seller-catalog-option" data-selected={data.catalog === option.id}>
    <span className="seller-preview-icon"><option.icon /></span>
    <span className="seller-catalog-copy"><strong>{option.title}</strong><span>{option.text}</span>{option.badge && <small>{option.badge}</small>}</span>
    <input type="radio" name="catalog" value={option.id} checked={data.catalog === option.id} onChange={() => update({ catalog: option.id })} />
  </label>)}</fieldset>;
}
