import type { ButtonHTMLAttributes, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Action({ children, primary, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) { return <button type="button" {...props} className={`pw-button ${primary ? 'pw-primary' : ''} ${className}`}>{children}</button>; }
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`pw-panel ${className}`}>{children}</section>; }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="pw-field"><span>{label}</span>{children}</label>; }
export function Pill({ children, good }: { children: ReactNode; good?: boolean }) { return <span className={`pw-pill ${good ? 'pw-good' : ''}`}>{children}</span>; }
export function Heading({ title, description, children }: { title: string; description: string; children?: ReactNode }) { return <header className="pw-heading"><div><h1>{title}</h1><p>{description}</p></div><div className="pw-actions">{children}</div></header>; }
export function MainLink({ to, children }: { to: string; children: ReactNode }) { return <Link className="pw-text-link" to={to}>{children}<ArrowUpRight size={15} /></Link>; }
export function Modal({ title, description, open, onClose, children }: { title: string; description: string; open: boolean; onClose: () => void; children: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={value => !value && onClose()}><Dialog.Portal><Dialog.Overlay className="pw-modal-overlay" /><Dialog.Content className="pw-modal workspace-theme-primeweb"><div className="pw-heading"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div><Dialog.Close asChild><Action aria-label="Close dialog"><X size={18} /></Action></Dialog.Close></div>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
