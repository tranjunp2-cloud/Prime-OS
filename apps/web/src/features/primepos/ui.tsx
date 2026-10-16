import { Children, cloneElement, isValidElement, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CircleHelp, Package, Printer, Store as StoreIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { activeShift, changePos, currentStore, dateTime, money, selectStore, usePos, type Sale } from './store';
import { attempt } from './feedback';
import './pos.css';

export function Action({ children, secondary, quiet, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean; quiet?: boolean }) { return <button type="button" className={`pos-button ${secondary ? 'secondary' : quiet ? 'quiet' : 'primary'} ${className}`} {...props}>{children}</button>; }
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) { const id = useId(); return <div className="pos-field"><label htmlFor={id}>{label}</label>{Children.map(children, child => isValidElement<{id?: string; 'aria-describedby'?: string}>(child) && ['input','select','textarea'].includes(String(child.type)) ? cloneElement(child, {id, 'aria-describedby': hint ? `${id}-hint` : undefined}) : child)}{hint && <small id={`${id}-hint`}>{hint}</small>}</div>; }
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) { return <span className={`pos-badge ${tone}`}>{children}</span>; }
export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) { return <div className="pos-empty"><Package size={30} /><h3>{title}</h3><p>{children}</p>{action}</div>; }
export function Heading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) { return <header className="pos-heading"><div>{eyebrow && <p className="pos-eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{action}</header>; }
export function Modal({ title, description, open, onClose, children, wide = false }: { title: string; description: string; open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) { return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}><DialogContent className={`pos-ui pos-modal ${wide ? 'wide' : ''}`}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>; }
export function ContextBar({ main = false, allStores = false }: { main?: boolean; allStores?: boolean }) {
  const s = usePos(), store = currentStore(s), shift = activeShift(s);
  return <div className="pos-context"><div className="pos-context-selection"><StoreIcon size={18} />{allStores ? <span>All stores</span> : <label><span className="sr-only">Current store</span><select aria-label="Current store" value={s.selectedStore} onChange={e => attempt(() => selectStore(e.target.value))}>{s.stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>}{!main && <label><span className="sr-only">Current register</span><select aria-label="Current register" value={s.register} onChange={e => attempt(() => selectStore(store.id, e.target.value))}>{store.registers.map(register => <option key={register}>{register}</option>)}</select></label>}{!main && <Badge tone={shift ? 'success' : ''}>{shift ? 'Shift open' : 'Shift closed'}</Badge>}</div><div className="pos-demo-label"><span title="Demo data is shared between Main and POS and saved on this browser. Payments, devices and kitchen updates are simulated."><CircleHelp size={14} /> Interactive demo</span><select aria-label="Demo role" value={s.role} onChange={e => attempt(() => changePos(draft => { draft.role = e.target.value as 'manager' | 'cashier'; }))}><option value="manager">Store manager</option><option value="cashier">Cashier</option></select></div></div>;
}
export function Ownership({ children, to, label }: { children: ReactNode; to: string; label: string }) { return <div className="pos-ownership"><div><Check size={15} /><span>{children}</span></div><Link to={to}>{label}<ArrowRight size={14} /></Link></div>; }
export function ReceiptView({ sale, onClose }: { sale: Sale | undefined; onClose: () => void }) {
  const s = usePos(); if (!sale) return null;
  const store = s.stores.find(store => store.id === sale.storeId)!;
  const receiptMoney = (n: number) => money(n, sale.currency || 'USD');
  const refunded = sale.refunds.reduce((sum, r) => sum + r.amount, 0);
  return <Modal open title="Sale receipt" description="Demo transaction · no real payment has been collected." onClose={onClose}>
    <div className="pos-receipt" id="pos-print-receipt"><span className="pos-receipt-logo">prime<span>POS</span></span><h3>{store.name}</h3><p>{store.address}</p><div className="pos-receipt-meta"><span>{sale.number}</span><span>{dateTime(sale.at)}</span></div><p>{sale.register} · {s.customers.find(c => c.id === sale.customerId)?.name ?? 'Walk-in customer'}{sale.table ? ` · Table ${sale.table}` : ''}</p>
      <div className="pos-receipt-lines">{sale.lines.map(line => <div key={line.productId}><span>{line.quantity} × {line.name}</span><strong>{receiptMoney(line.quantity * line.price)}</strong></div>)}</div>
      <div className="pos-totals"><div><span>Subtotal</span><span>{receiptMoney(sale.subtotal)}</span></div>{sale.discount > 0 && <div><span>Discount</span><span>−{receiptMoney(sale.discount)}</span></div>}<div className="total"><span>Total paid</span><strong>{receiptMoney(sale.total)}</strong></div><div><span>Payment</span><span>{sale.method === 'cash' ? 'Cash' : 'Card (simulated)'}</span></div>{sale.method === 'cash' && <><div><span>Cash received</span><span>{receiptMoney(sale.tendered)}</span></div><div><span>Change</span><span>{receiptMoney(sale.tendered - sale.total)}</span></div></>}{refunded > 0 && <div><span>Refunded</span><span>−{receiptMoney(refunded)}</span></div>}</div><p className="pos-receipt-thanks">Thank you for shopping with us.<br />Demo receipt · {sale.currency || 'USD'}</p>
    </div><div className="pos-modal-actions"><Action secondary onClick={() => window.print()}><Printer size={16} />Print receipt</Action><Action onClick={onClose}>Done</Action></div>
  </Modal>;
}
export function PosOrderReceipt({ id, onClose }: { id: string; onClose: () => void }) {
  const state = usePos();
  return <ReceiptView sale={state.sales.find(sale => sale.id === id)} onClose={onClose} />;
}
