import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { configurePosStore, currentStore, saveStore, usePos, type Store } from './store';
import { Action, Field, Heading } from './ui';
import { PosConfigurationFields } from './PosConfigurationFields';

function StoreForm({ initial, editable }: { initial: Store; editable: boolean }) {
  const [store, setStore] = useState<Store>({ ...initial, currency: initial.currency || 'USD' });
  const [error, setError] = useState(''), [saved, setSaved] = useState(false);
  function update(changes: Partial<Store>) { setStore(current => ({ ...current, ...changes })); setSaved(false); }
  return <form className="pos-panel pos-panel-body pos-stack" onSubmit={e => { e.preventDefault(); try { configurePosStore(store); setSaved(true); setError(''); } catch (e) { setError((e as Error).message); } }}>
    <h2>Store & registers</h2><fieldset disabled={!editable} className="pos-stack">
      <Field label="Store name"><input required value={store.name} onChange={e => update({ name: e.target.value })} /></Field><Field label="Store address"><input required value={store.address} onChange={e => update({ address: e.target.value })} /></Field>
      <div className="pos-two"><Field label="Business type"><select value={store.mode} onChange={e => update({ mode: e.target.value as Store['mode'] })}><option value="retail">Retail</option><option value="cafe">Restaurant / café</option></select></Field><Field label="Registers" hint="Separate register names with commas."><input required value={store.registers.join(',')} onChange={e => update({ registers: e.target.value.split(',') })} /></Field></div>
      <PosConfigurationFields store={store} onChange={update} />
      <p className="pos-muted">These settings are shared by this store's registers. Close open shifts before changing stock location or registers.</p>
      {error && <p role="alert" className="pos-error">{error}</p>}{saved && <p role="status">Store configuration saved.</p>}<div><Action type="submit">Save store settings</Action></div>
    </fieldset>
  </form>;
}

export default function PosSettings() {
  const s = usePos(), store = currentStore(s);
  const [discount, setDiscount] = useState(String(store.discountLimit)), [days, setDays] = useState(String(store.returnDays)), [message, setMessage] = useState('');
  return <>
    <Heading eyebrow="Prime POS / Settings" title="Store settings" description={`Manage ${store.name}, its stock source, prices and registers. Product identity stays in Product Master.`}
      action={s.role === 'manager' && <Link className="pos-button secondary" to="/pos/setup"><Plus size={16} />Add store</Link>} />
    {s.role === 'cashier' && <p className="pos-info">Only a store manager can change shared configuration. Your selling tools remain available.</p>}
    <div className="pos-settings-layout"><StoreForm initial={store} editable={s.role === 'manager'} />
      <div className="pos-stack"><form className="pos-panel pos-panel-body pos-stack" onSubmit={e => { e.preventDefault(); try { saveStore({ ...store, discountLimit: Number(discount), returnDays: Number(days) }); setMessage('Policies saved.'); } catch (e) { setMessage((e as Error).message); } }}><h2>Sales & return policies</h2><fieldset className="pos-stack" disabled={s.role !== 'manager'}><Field label="Maximum cashier discount (%)"><input type="number" min="0" max="100" required value={discount} onChange={e => setDiscount(e.target.value)} /></Field><Field label="Return window (days)"><input type="number" min="0" max="365" step="1" required value={days} onChange={e => setDays(e.target.value)} /></Field><Action type="submit">Save policies</Action></fieldset>{message && <p role="status">{message}</p>}</form>
      <section className="pos-panel pos-panel-body pos-stack"><h2>This register</h2><p className="pos-muted">Printers, scanners and the cash drawer are configured separately for each register.</p><Link className="pos-button secondary" to="/pos/hardware">Manage equipment</Link></section></div>
    </div>
  </>;
}
