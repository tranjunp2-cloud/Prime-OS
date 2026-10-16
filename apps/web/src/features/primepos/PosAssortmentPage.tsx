import { useState } from 'react';
import { attempt } from './feedback';
import { Search } from 'lucide-react';
import { currentStore, money, saveStore, stockKey, updateProduct, usePos } from './store';
import { Action, Badge, Field, Heading, Modal, Ownership } from './ui';
import { MainModulePage } from './MainModulePage';

function Catalog() {
  const s=usePos(),store=currentStore(s),[query,setQuery]=useState(''),[edit,setEdit]=useState(''),[price,setPrice]=useState('');
  const products=s.products.filter(p=>`${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()));
  return <><Heading eyebrow="Main / Products" title="POS assortment" description={`Choose what ${store.name} sells. Product prices are shared across stores in this demo.`} /><div className="pos-toolbar"><div className="pos-search"><Search size={18}/><input aria-label="Search assortment" placeholder="Search name or SKU…" value={query} onChange={e=>setQuery(e.target.value)}/></div><Badge>{store.assortment.length} enabled at this store</Badge></div><div className="pos-panel"><div className="pos-table-wrap"><table className="pos-table"><thead><tr><th>Available in POS</th><th>Product / SKU</th><th>Category</th><th className="number">Price · USD</th><th className="number">Store stock</th><th></th></tr></thead><tbody>{products.map(product=><tr key={product.id}><td><label className="pos-checkrow"><input type="checkbox" aria-label={`Sell ${product.name} at ${store.name}`} checked={store.assortment.includes(product.id)} disabled={s.role!=='manager'} onChange={e=>attempt(()=>saveStore({...store,assortment:e.target.checked?[...store.assortment,product.id]:store.assortment.filter(id=>id!==product.id)}),'Assortment updated')}/><span>{store.assortment.includes(product.id)?'Enabled':'Not offered'}</span></label></td><td><strong>{product.name}</strong><small>{product.sku}</small></td><td>{product.category}</td><td className="number">{money(product.price)}</td><td className="number">{s.stock[stockKey(store.id,product.id)] ?? 0}</td><td><Action secondary disabled={s.role!=='manager'} onClick={()=>{setEdit(product.id);setPrice(String(product.price));}}>Edit price</Action></td></tr>)}</tbody></table></div></div><Ownership to="/pos/register" label="Preview at the counter">Updates apply to new sales. Existing receipts retain their original prices.</Ownership><Modal open={!!edit} title="Update shared price" description={s.products.find(p=>p.id===edit)?.name ?? ''} onClose={()=>setEdit('')}><form className="pos-stack" onSubmit={e=>{e.preventDefault();if(attempt(()=>updateProduct(edit,Number(price)),'Price updated across stores'))setEdit('');}}><Field label="Retail price (USD)"><input required type="number" min="0.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></Field><div className="pos-modal-actions"><Action secondary onClick={()=>setEdit('')}>Cancel</Action><Action type="submit">Save price</Action></div></form></Modal></>;
}

export default function PosAssortmentPage() {
  return <MainModulePage backTo="/products/master-catalog" backLabel="Products"><Catalog /></MainModulePage>;
}
