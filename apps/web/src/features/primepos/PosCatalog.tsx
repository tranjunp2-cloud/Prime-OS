import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, Plus, Search, X } from 'lucide-react';
import { masterCatalog, masterPosId, resolveStoreCatalog, type MasterSelection } from './catalog';
import { currentStore, money, saveMasterSelection, saveStore, usePos, type Store } from './store';
import { Action, Badge, Empty, Heading, Modal } from './ui';
import { attempt } from './feedback';
import { isDemoProduct } from '@/lib/product-store';
import { useDemoDataMode } from '@/hooks/use-demo-data-mode';

export function MasterPicker({ store, selected, onChange }: { store: Store; selected: MasterSelection[]; onChange: (value: MasterSelection[]) => void }) {
  const [query, setQuery] = useState('');
  const { noData } = useDemoDataMode();
  const items = masterCatalog(store).filter(item => !noData || !isDemoProduct(item.master.productId) || selected.some(ref => masterPosId(ref) === item.id));
  const visible = items.filter(item => `${item.name} ${item.sku}`.toLowerCase().includes(query.toLowerCase()));
  const ids = new Set(selected.map(masterPosId));
  const toggle = (ref: MasterSelection, checked: boolean) => onChange(checked ? [...selected.filter(item => masterPosId(item) !== masterPosId(ref)), ref] : selected.filter(item => masterPosId(item) !== masterPosId(ref)));
  const allVisible = visible.length > 0 && visible.every(item => ids.has(item.id));
  return <div className="pos-stack">
    <div className="pos-toolbar"><div className="pos-search"><Search size={18} /><input aria-label="Search Product Master" placeholder="Search product, variant or SKU…" value={query} onChange={e => setQuery(e.target.value)} /></div><Badge>{selected.length} SKUs selected</Badge></div>
    {!items.length ? <Empty title="No Product Masters yet" action={<Link className="pos-button secondary" to="/products/master-catalog">Open Product Master<ArrowRight size={16} /></Link>}>Create or import a Product Master first. Your POS setup is saved; return here to continue.</Empty> : <>
      <label className="pos-select-all"><input type="checkbox" checked={allVisible} disabled={!visible.length} onChange={e => onChange(e.target.checked ? [...selected.filter(ref => !visible.some(item => item.id === masterPosId(ref))), ...visible.map(item => item.master)] : selected.filter(ref => !visible.some(item => item.id === masterPosId(ref))))} />Select all visible SKUs</label>
      <div className="pos-master-list">{visible.map(item => <label className={`pos-master-option ${ids.has(item.id) ? 'selected' : ''}`} key={item.id}>
        <input type="checkbox" aria-label={`Select ${item.sku}`} checked={ids.has(item.id)} onChange={e => toggle(item.master, e.target.checked)} />
        <span className="pos-master-image">{item.image ? <img src={item.image} alt="" /> : <Package size={22} />}</span>
        <span className="pos-master-identity"><strong>{item.masterName}</strong><small>{item.variant ? `${item.variant} · ` : ''}{item.sku}</small>{item.issue && <span className="pos-catalog-warning">{item.issue}</span>}</span>
        <span className="pos-master-values"><strong>{item.price > 0 ? money(item.price, item.currency) : 'Price not ready'}</strong><small>{item.available === null ? 'Stock not verified' : `${item.available} available`}</small></span>
      </label>)}</div>
      {!visible.length && <p className="pos-muted">No matching SKUs. Try another name or code.</p>}
      <p className="pos-muted">Names, images, SKU codes and prices are filled from Product Master. Stock comes from the selected warehouse. Items needing attention can be saved and completed later.</p>
    </>}
  </div>;
}

export default function PosCatalog() {
  const s = usePos(), store = currentStore(s);
  const [adding, setAdding] = useState(false), [selected, setSelected] = useState<MasterSelection[]>([]);
  const [remove, setRemove] = useState<MasterSelection>();
  const items = resolveStoreCatalog(store);
  const legacy = s.products.filter(item => !item.master && store.assortment.includes(item.id));
  return <>
    <Heading eyebrow="Prime POS / Products" title="Products at this store" description={`Choose what ${store.name} sells. Linked Master data updates automatically; new SKUs are added only when you select them.`}
      action={<Action disabled={s.role !== 'manager'} onClick={() => { setSelected(store.masterSelections ?? []); setAdding(true); }}><Plus size={16} />Add from Product Master</Action>} />
    <div className="pos-toolbar"><div className="pos-actions"><Badge>{items.length + legacy.length} SKUs</Badge><span className="pos-muted">{items.filter(item => item.issue).length} need attention</span></div><Link className="pos-button quiet" to="/pos/settings">{store.warehouse || 'Choose warehouse'} · {store.currency || 'USD'}<ArrowRight size={14} /></Link></div>
    {!items.length && !legacy.length ? <Empty title="Choose your first products">Add existing Master SKUs to this store. No duplicate products or stock are created.</Empty> : <div className="pos-panel pos-catalog-rows">{items.map(item => <article className="pos-catalog-row" key={item.id}>
      <span className="pos-master-image">{item.image ? <img src={item.image} alt="" /> : <Package size={22} />}</span>
      <div className="pos-master-identity"><strong>{item.name}</strong><small>{item.sku} · Linked to Product Master</small><span className={item.issue ? 'pos-catalog-warning' : 'pos-muted'}>{item.issue || (item.available === 0 ? 'Out of stock' : 'Available at this store')}</span></div>
      <div className="pos-master-values"><strong>{item.price > 0 ? money(item.price, item.currency) : 'Price not ready'}</strong><small>{item.available === null ? 'Stock not verified' : `${item.available} available`}</small></div>
      <div className="pos-actions"><Link className="pos-button quiet" to={`/products/${item.master.productId}/edit`}>View Master</Link><Action quiet disabled={s.role !== 'manager'} aria-label={`Remove ${item.sku} from this store`} onClick={() => setRemove(item.master)}><X size={16} /></Action></div>
    </article>)}</div>}
    {legacy.length > 0 && <section className="pos-panel pos-panel-body pos-stack pos-legacy-catalog"><h2>Existing demo products</h2><p className="pos-muted">Preserved for earlier receipts and demo sales. These are not linked to Product Master.</p>{legacy.map(item => <div className="pos-row" key={item.id}><div><strong>{item.name}</strong><p className="pos-muted">{item.sku}</p></div><Action secondary disabled={s.role !== 'manager'} onClick={() => attempt(() => saveStore({ ...store, assortment: store.assortment.filter(id => id !== item.id) }), 'Removed from this store')}>Stop offering</Action></div>)}</section>}
    <Modal open={adding} wide title="Add from Product Master" description={`Review the SKUs to sell at ${store.name}. Existing selections are checked.`} onClose={() => setAdding(false)}><MasterPicker store={store} selected={selected} onChange={setSelected} /><div className="pos-modal-actions"><Action secondary onClick={() => setAdding(false)}>Cancel</Action><Action onClick={() => { if (attempt(() => saveMasterSelection(store.id, selected), 'Product selection saved')) setAdding(false); }}>Save selection ({selected.length})</Action></div></Modal>
    <Modal open={!!remove} title="Remove from this store?" description="The Product Master, warehouse stock and past receipts stay unchanged. This SKU will no longer be available for new sales here." onClose={() => setRemove(undefined)}><div className="pos-modal-actions"><Action secondary onClick={() => setRemove(undefined)}>Cancel</Action><Action onClick={() => { if (remove && attempt(() => saveMasterSelection(store.id, (store.masterSelections ?? []).filter(ref => masterPosId(ref) !== masterPosId(remove))), 'Removed from this store')) setRemove(undefined); }}>Remove from store</Action></div></Modal>
  </>;
}
