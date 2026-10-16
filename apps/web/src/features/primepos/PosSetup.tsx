import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Store } from 'lucide-react';
import { blankSetup, finishPosSetup, saveSetupDraft, selectStore, setupStore, usePos, validatePosConfiguration, type SetupDraft } from './store';
import { Action, Badge, Field, Heading } from './ui';
import { MasterPicker } from './PosCatalog';
import { PosConfigurationFields } from './PosConfigurationFields';

export default function PosSetup() {
  const s = usePos(), navigate = useNavigate();
  const [draft, setDraft] = useState<SetupDraft>(() => s.setupDraft || blankSetup());
  const [error, setError] = useState(''), [existing, setExisting] = useState(s.stores[0]?.id || '');
  const [register, setRegister] = useState(s.stores[0]?.registers[0] || '');
  const store = setupStore(draft);
  function update(changes: Partial<SetupDraft>) {
    const next = { ...draft, ...changes };
    try { saveSetupDraft(next); setDraft(next); setError(''); } catch (e) { setError((e as Error).message); }
  }
  function next() {
    try {
      if (draft.step === 1 && (!draft.name.trim() || !draft.address.trim() || !draft.register.trim())) throw new Error('Enter the store name, address and register.');
      if (draft.step === 2) validatePosConfiguration(store);
      update({ step: (draft.step + 1) as 2 | 3 });
    } catch (e) { setError((e as Error).message); }
  }
  function finish(skip = false) {
    try { finishPosSetup(draft, skip); navigate('/pos/register', { replace: true }); } catch (e) { setError((e as Error).message); }
  }
  return <div className="pos-ui"><div className="pos-page pos-setup">
    <Heading eyebrow="Prime POS / Getting started" title="Set up your point of sale" description="Connect a store, its stock and your Product Masters. Set up once; your team can then start selling." />
    {s.stores.length > 0 && <section className="pos-panel pos-panel-body pos-existing-store"><div><h2>Already have a store?</h2><p className="pos-muted">Use its saved setup. No duplicate store or product sync is needed.</p></div><div className="pos-two"><Field label="Existing store"><select value={existing} onChange={e => { setExisting(e.target.value); setRegister(s.stores.find(item => item.id === e.target.value)?.registers[0] || ''); }}>{s.stores.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Existing register"><select value={register} onChange={e => setRegister(e.target.value)}>{s.stores.find(item => item.id === existing)?.registers.map(name => <option key={name}>{name}</option>)}</select></Field></div><Action secondary onClick={() => { try { selectStore(existing, register); navigate('/pos/register'); } catch (e) { setError((e as Error).message); } }}>Use this register<ArrowRight size={16} /></Action></section>}
    {s.role === 'cashier' ? <div className="pos-panel pos-panel-body pos-stack"><LockKeyhole size={24} /><h2>A manager needs to set up this store</h2><p className="pos-muted">Cashiers use an existing store and register. Ask your manager to complete setup first.</p><Link className="pos-button secondary" to="/overview">Back to Main</Link></div> : <>
      <ol className="pos-setup-steps" aria-label="POS setup progress">{['Store & register', 'Stock & pricing', 'Products'].map((label, index) => <li key={label} aria-current={draft.step === index + 1 ? 'step' : undefined}><span>{draft.step > index + 1 ? <Check size={15} /> : index + 1}</span>{label}</li>)}</ol>
      <form className="pos-panel pos-panel-body pos-stack" onSubmit={e => { e.preventDefault(); if (draft.step < 3) next(); else finish(); }}>
        <div className="pos-row"><h2>{draft.step === 1 ? 'Your store and first register' : draft.step === 2 ? 'Where stock and prices come from' : 'Add from Product Master'}</h2><Badge>Step {draft.step} of 3</Badge></div>
        {draft.step === 1 && <><Field label="Store name"><input autoComplete="organization" required value={draft.name} onChange={e => update({ name: e.target.value })} placeholder="e.g. Central store" /></Field><Field label="Store address"><input autoComplete="street-address" required value={draft.address} onChange={e => update({ address: e.target.value })} /></Field><div className="pos-two"><Field label="Business type"><select value={draft.mode} onChange={e => update({ mode: e.target.value as SetupDraft['mode'] })}><option value="retail">Retail</option><option value="cafe">Restaurant / café</option></select></Field><Field label="Register name"><input required value={draft.register} onChange={e => update({ register: e.target.value })} /></Field></div><p className="pos-muted">Add more registers later in POS settings. Printer and scanner setup can wait.</p></>}
        {draft.step === 2 && <PosConfigurationFields store={store} onChange={changes => update({ warehouseId: changes.warehouseId ?? draft.warehouseId, currency: changes.currency ?? draft.currency, priceRuleId: 'priceRuleId' in changes ? changes.priceRuleId || '' : draft.priceRuleId })} />}
        {draft.step === 3 && <><p className="pos-muted">Select the SKUs to offer at {draft.name}. Values are proposed automatically; review only what needs attention.</p><MasterPicker store={store} selected={draft.selections} onChange={selections => update({ selections })} /></>}
        {error && <p role="alert" className="pos-error">{error}</p>}
        <div className="pos-setup-footer"><div>{draft.step > 1 ? <Action secondary onClick={() => update({ step: (draft.step - 1) as 1 | 2 })}><ArrowLeft size={16} />Back</Action> : <Link className="pos-button quiet" to="/overview">Back to Main</Link>}</div><div className="pos-actions">{draft.step === 3 && <Action secondary onClick={() => finish(true)}>Add products later</Action>}<Action type="submit" disabled={draft.step === 3 && !draft.selections.length}>{draft.step === 3 ? 'Save & open POS' : 'Continue'}<ArrowRight size={16} /></Action></div></div>
      </form><p className="pos-setup-saved"><Store size={14} />{s.setupDraft ? 'Progress saved on this browser. You can leave and continue later.' : 'Your setup stays with this store, not each cashier.'}</p>
    </>}
  </div></div>;
}
