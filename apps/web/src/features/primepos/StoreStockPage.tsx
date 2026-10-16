import { useState } from 'react';
import { attempt } from './feedback';
import { Plus, Truck } from 'lucide-react';
import { createReceipt, currentStore, stockKey, usePos } from './store';
import { Action, Badge, Field, Heading, Modal, Ownership } from './ui';
import { Receiving } from './PosWorkspace';
import { MainModulePage } from './MainModulePage';

function Stock() {
  const s=usePos(),store=currentStore(s),[create,setCreate]=useState(false),[supplier,setSupplier]=useState('Everyday Supply Co.'),[product,setProduct]=useState(store.assortment[0] ?? s.products[0].id),[qty,setQty]=useState('12');
  const needsInspection=s.sales.filter(sale=>sale.storeId===store.id).flatMap(sale=>sale.refunds.filter(r=>!r.restock).map(r=>({sale,r})));
  return <><Heading eyebrow="Main / Warehouses" title="Store stock & purchasing" description={`${store.warehouse} · Shared sellable quantities for ${store.name}.`} action={<Action disabled={s.role!=='manager'} onClick={()=>setCreate(true)}><Plus size={16}/>Create shipment</Action>}/><div className="pos-panel" style={{marginBottom:28}}><div className="pos-table-wrap"><table className="pos-table"><thead><tr><th>Product / SKU</th><th>Stock location</th><th className="number">Available</th><th className="number">Incoming</th><th>Status</th></tr></thead><tbody>{s.products.filter(p=>store.assortment.includes(p.id)).map(p=>{const stock=s.stock[stockKey(store.id,p.id)]??0;return <tr key={p.id}><td><strong>{p.name}</strong><small>{p.sku}</small></td><td>{store.warehouse}</td><td className="number">{stock}</td><td className="number">{s.receipts.filter(r=>r.storeId===store.id&&r.productId===p.id&&r.status==='in_transit').reduce((n,r)=>n+r.quantity,0)}</td><td><Badge tone={stock>5?'success':'amber'}>{stock===0?'Out of stock':stock<=5?'Low stock':'Available'}</Badge></td></tr>;})}</tbody></table></div></div><Receiving main/>{needsInspection.length>0&&<div className="pos-panel pos-panel-body pos-stack" style={{marginTop:24}}><h2>Returns awaiting inspection</h2>{needsInspection.map(({sale,r})=><div className="pos-row" key={r.id}><div><strong>{sale.number}</strong><p className="pos-muted">{r.reason} · {Object.values(r.quantities).reduce((n,q)=>n+q,0)} units</p></div><Badge tone="amber">Excluded from sellable stock</Badge></div>)}</div>}<Ownership to="/pos/receiving" label="Receive at the store">Stock is added only after the store confirms the actual received quantity.</Ownership><Modal open={create} title="Create an inbound shipment" description={`Send stock to ${store.name}. The store will confirm receipt in POS.`} onClose={()=>setCreate(false)}><form className="pos-stack" onSubmit={e=>{e.preventDefault();if(attempt(()=>createReceipt(store.id,product,Number(qty),supplier),'Shipment sent to the store'))setCreate(false);}}><Field label="Supplier"><input required value={supplier} onChange={e=>setSupplier(e.target.value)} list="pos-suppliers"/><datalist id="pos-suppliers"><option value="Everyday Supply Co."/><option value="Riverside Coffee Roasters"/></datalist></Field><Field label="Product"><select value={product} onChange={e=>setProduct(e.target.value)}>{s.products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select></Field><Field label="Expected quantity"><input required type="number" min="1" step="1" value={qty} onChange={e=>setQty(e.target.value)}/></Field><Action type="submit"><Truck size={16}/>Create shipment</Action></form></Modal></>;
}

export default function StoreStockPage() {
  const s = usePos();
  return <MainModulePage><Stock key={s.selectedStore} /></MainModulePage>;
}
