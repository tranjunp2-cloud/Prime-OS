import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const fieldClass = 'min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-2 text-sm font-medium">{label}{children}</label>; }
export function MainLink({ to, children }: { to: string; children: ReactNode }) { return <Button asChild variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal text-left"><Link to={to}>{children}<ArrowUpRight className="size-4" aria-hidden="true" /></Link></Button>; }
export function Blank({ title, children }: { title: string; children: ReactNode }) { return <div className="grid min-h-48 place-content-center gap-3 p-6 text-center"><h2 className="font-semibold">{title}</h2><div className="text-sm text-muted-foreground">{children}</div></div>; }
// eslint-disable-next-line react-refresh/only-export-components
export function downloadCsv(name: string, content: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
