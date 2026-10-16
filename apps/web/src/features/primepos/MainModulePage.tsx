import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ContextBar } from './ui';
import { usePos } from './store';

export function ModuleSectionNav({ label, items }: { label: string; items: [string, string][] }) {
  const { pathname } = useLocation();
  return <nav className="pos-module-nav" aria-label={label}>
    {items.map(([text, href]) => <Link key={href} to={href} aria-current={pathname === href ? 'page' : undefined}>{text}</Link>)}
  </nav>;
}

export function MainModulePage({ children, allStores = false, backTo, backLabel }: {
  children: ReactNode;
  allStores?: boolean;
  backTo?: string;
  backLabel?: string;
}) {
  const s = usePos();
  if (!s.stores.length) return <div className="pos-ui pos-page"><h1>Set up your first POS store</h1><p className="pos-muted">Store stock and sales records appear after you set up a store in Prime POS.</p><Link className="pos-button primary" to="/pos/setup">Set up POS<ArrowRight size={16} /></Link></div>;
  return <div className="pos-ui">
    <ContextBar main allStores={allStores} />
    <div className="pos-page">
      {backTo && <Link className="pos-module-back" to={backTo}><ArrowLeft size={15} />{backLabel}</Link>}
      {s.role === 'cashier' && <div className="pos-info" style={{ marginBottom: 20 }}>Cashier preview · Shared configuration is read-only. Switch to Store manager to review editing.</div>}
      {children}
      <footer className="pos-bottom-nav"><span>Interactive demo · USD · saved on this browser</span><Link to="/pos/register">Open Prime POS<ArrowRight size={15} /></Link></footer>
    </div>
  </div>;
}
