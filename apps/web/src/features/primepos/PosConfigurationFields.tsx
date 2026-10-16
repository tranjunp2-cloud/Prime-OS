import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PRICING_CURRENCIES, readPricing } from '@/lib/pricing-rules';
import { createManagedWarehouse, savedWarehouses } from '@/lib/warehouse-store';
import { useDemoDataMode } from '@/hooks/use-demo-data-mode';
import { posWarehouses } from './catalog';
import { Action, Field, Modal } from './ui';
import type { Store } from './store';

export function PosConfigurationFields({ store, onChange }: { store: Store; onChange: (changes: Partial<Store>) => void }) {
  const [creating, setCreating] = useState(false), [name, setName] = useState(''), [code, setCode] = useState(''), [country, setCountry] = useState('VN'), [error, setError] = useState('');
  const { noData } = useDemoDataMode();
  const warehouses = posWarehouses().filter(w => !noData || w.id === store.warehouseId || savedWarehouses().some(saved => saved.id === w.id)), rules = readPricing().rules.filter(rule => rule.enabled && rule.targetCurrency === store.currency);
  return <div className="pos-stack">
    <Field label="Stock location" hint="POS reads available stock here. Selecting a warehouse does not move or copy stock."><select required value={store.warehouseId || ''} onChange={e => onChange({ warehouseId: e.target.value })}><option value="">Choose a stock location</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name} · {w.code}</option>)}</select></Field>
    <div><Action quiet onClick={() => { setName(`${store.name} stockroom`); setCreating(true); }}><Plus size={15} />Create stock location</Action></div>
    <div className="pos-two"><Field label="Selling currency"><select value={store.currency || 'USD'} onChange={e => onChange({ currency: e.target.value, priceRuleId: undefined })}>{PRICING_CURRENCIES.map(value => <option key={value}>{value}</option>)}</select></Field>
      <Field label="Pricing source" hint="Currency mismatches stay pending; amounts are never relabeled or converted without a rule."><select value={store.priceRuleId || ''} onChange={e => onChange({ priceRuleId: e.target.value || undefined })}><option value="">Master prices · same currency</option>{rules.map(rule => <option key={rule.id} value={rule.id}>{rule.name} · {rule.baseCurrency} → {rule.targetCurrency}</option>)}</select></Field></div>
    <p className="pos-muted">Need a different calculation? <Link to="/settings/pricing-rules">Manage shared pricing rules</Link>. Your setup progress is kept.</p>
    <Modal open={creating} title="Create a stock location" description="This creates a shared warehouse in Prime OS. Record actual stock separately; no opening quantity is assumed." onClose={() => setCreating(false)}>
      <div className="pos-stack"><Field label="Warehouse name"><input value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Warehouse code"><input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. STORE-01" /></Field><Field label="Country"><select value={country} onChange={e => setCountry(e.target.value)}>{['VN','JP','SG','MY','US','TH','ID','PH','AU','GB'].map(value => <option key={value}>{value}</option>)}</select></Field><p className="pos-muted">Address: {store.address || 'Enter the store address in step 1.'}</p>{error && <p role="alert" className="pos-error">{error}</p>}<div className="pos-modal-actions"><Action secondary onClick={() => setCreating(false)}>Cancel</Action><Action onClick={() => { try { const warehouse = createManagedWarehouse({ name, code, country, address: store.address }); onChange({ warehouseId: warehouse.id }); setCreating(false); setError(''); } catch (e) { setError((e as Error).message); } }}>Create location</Action></div></div>
    </Modal>
  </div>;
}
