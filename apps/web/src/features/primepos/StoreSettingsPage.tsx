import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { attempt } from './feedback';
import { ArrowRight, Building2, Plus, Store as StoreIcon, UserRound } from 'lucide-react';
import { currentStore, saveStore, selectStore, usePos, type Store } from './store';
import { Action, Badge, Field, Heading, Modal } from './ui';
import { MainModulePage, ModuleSectionNav } from './MainModulePage';
import { legacyStoreManagementTarget } from './navigation';

function StoreEditor({ store, onClose }: { store?: Store; onClose: () => void }) {
  const s = usePos(), [name,setName] = useState(store?.name ?? ''), [address,setAddress] = useState(store?.address ?? ''), [warehouse,setWarehouse] = useState(store?.warehouse ?? ''), [mode,setMode] = useState<'retail'|'cafe'>(store?.mode ?? 'retail'), [registers,setRegisters] = useState(store?.registers.join(', ') ?? 'Register 01');
  return <Modal open title={store ? 'Edit store' : 'Add a store'} description="Keep the store, its stock location and its registers connected." onClose={onClose}><form className="pos-stack" onSubmit={e => { e.preventDefault(); const input: Store = {id:store?.id ?? crypto.randomUUID(),name:name.trim(),address:address.trim(),warehouse:warehouse.trim(),mode,registers:registers.split(',').map(r=>r.trim()).filter(Boolean),assortment:store?.mode === mode ? store.assortment : s.products.filter(p=>p.kind === mode).map(p=>p.id),discountLimit:store?.discountLimit ?? 10,returnDays:store?.returnDays ?? 30}; if(attempt(()=>saveStore(input),'Store configuration saved')) onClose(); }}><Field label="Store name"><input autoFocus required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Central Flagship" /></Field><Field label="Store address"><input required value={address} onChange={e=>setAddress(e.target.value)} /></Field><div className="pos-two"><Field label="Business type"><select value={mode} onChange={e=>setMode(e.target.value as 'retail'|'cafe')}><option value="retail">Retail</option><option value="cafe">Restaurant / café</option></select></Field><Field label="Stock location"><input required value={warehouse} onChange={e=>setWarehouse(e.target.value)} placeholder="Store stockroom" /></Field></div><Field label="Registers" hint="Separate register names with commas."><input required value={registers} onChange={e=>setRegisters(e.target.value)} /></Field><div className="pos-info">New stores start with zero stock. Create an inbound shipment, then receive it at the store before selling.</div><div className="pos-modal-actions"><Action secondary onClick={onClose}>Cancel</Action><Action type="submit">Save store</Action></div></form></Modal>;
}
function Stores() {
  const s = usePos();
  const [editor, setEditor] = useState<Store | 'new'>();
  return <>
    <Heading eyebrow="Main / Settings" title="Stores & registers" description="Manage your physical stores, stock locations and checkout registers." action={<Action disabled={s.role !== 'manager'} onClick={() => setEditor('new')}><Plus size={16} />Add store</Action>} />
    <div className="pos-toolbar"><p className="pos-muted">{s.stores.length} stores · {s.stores.reduce((n, store) => n + store.registers.length, 0)} registers</p></div>
    <div className="pos-store-grid">{s.stores.map(store => <article key={store.id} className="pos-panel pos-store-card">
      <div className="pos-row"><div className="pos-device-icon"><StoreIcon size={23} /></div><Badge tone={store.mode === 'cafe' ? 'purple' : ''}>{store.mode === 'cafe' ? 'Restaurant / café' : 'Retail'}</Badge></div>
      <div><h2>{store.name}</h2><p>{store.address}</p></div>
      <div><p>Stock location</p><strong>{store.warehouse}</strong><p style={{ marginTop: 9 }}>{store.registers.join(' · ')}</p></div>
      <div className="pos-actions"><Action secondary disabled={s.role !== 'manager'} onClick={() => setEditor(store)}>Configure store</Action><Link to="/pos/register" className="pos-button quiet" onClick={() => selectStore(store.id)}>Open POS<ArrowRight size={15} /></Link></div>
    </article>)}</div>
    <p className="pos-settings-hint">Manage the products sold at each store in <Link to="/products/pos-assortment">Products</Link> and its inventory in <Link to="/warehouses/store-stock">Warehouses</Link>.</p>
    {editor && <StoreEditor store={editor === 'new' ? undefined : editor} onClose={() => setEditor(undefined)} />}
  </>;
}

function Policies() {
  const s=usePos(),store=currentStore(s),[discount,setDiscount]=useState(String(store.discountLimit)),[days,setDays]=useState(String(store.returnDays));
  return <><Heading eyebrow="Main / Settings" title="Sales & return policies" description={`Set the boundaries for ${store.name}. Cashiers apply them at the counter.`}/><div className="pos-two"><form className="pos-panel pos-panel-body pos-stack" onSubmit={e=>{e.preventDefault();attempt(()=>saveStore({...store,discountLimit:Number(discount),returnDays:Number(days)}),'Store policies saved');}}><h2>Sales & returns</h2><Field label="Maximum cashier discount (%)" hint="POS validates discounts against this limit before payment."><input required type="number" min="0" max="100" value={discount} onChange={e=>setDiscount(e.target.value)} disabled={s.role!=='manager'}/></Field><Field label="Return window (days)"><input required type="number" min="0" max="365" step="1" value={days} onChange={e=>setDays(e.target.value)} disabled={s.role!=='manager'}/></Field><div className="pos-info">Refund to the original payment method. Returned stock becomes sellable only when the cashier marks it as sellable.</div><Action type="submit" disabled={s.role!=='manager'}>Save policies</Action></form><div className="pos-stack"><div className="pos-panel pos-panel-body pos-stack"><h2>Who manages what?</h2><div className="pos-summary-strip"><Building2 size={20}/><div><h3>Main · Store manager</h3><p>Stores, registers, assortment, prices, purchasing and policies.</p></div></div><div className="pos-summary-strip"><UserRound size={20}/><div><h3>Prime POS · Cashier</h3><p>Sales, customers, returns, cash movements and receiving.</p></div></div><p className="pos-muted">Use the demo role selector above to review cashier restrictions.</p></div><div className="pos-panel pos-panel-body"><h2>Other shared settings</h2><div className="pos-aside-links"><Link to="/settings/team-access">Team & access<ArrowRight size={16}/></Link><Link to="/settings/payments">Payment methods<ArrowRight size={16}/></Link><Link to="/settings/templates-notifications">Receipt templates<ArrowRight size={16}/></Link></div></div></div></div></>;
}


export default function StoreSettingsPage() {
  const { pathname, search } = useLocation();
  const s = usePos();
  const target = legacyStoreManagementTarget(search);
  if (target) return <Navigate to={target} replace />;
  const policies = pathname === '/settings/stores/policies';
  return <>
    <ModuleSectionNav label="Store settings" items={[
      ['Stores & registers', '/settings/stores'],
      ['Sales & return policies', '/settings/stores/policies'],
    ]} />
    <MainModulePage allStores={!policies}>
      {policies ? <Policies key={s.selectedStore} /> : <Stores />}
    </MainModulePage>
  </>;
}
