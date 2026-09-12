import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
export function CopyValue({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  return <span className="inline-flex items-center gap-1"><button type="button" aria-label={`Copy ${label}`} title={`Copy ${label}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-primary" onClick={async () => { try { await navigator.clipboard.writeText(value); setState('copied'); } catch { setState('error'); } }}>{state === 'copied' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button><span role="status" className="text-xs text-muted-foreground">{state === 'copied' ? 'Copied' : state === 'error' ? 'Copy failed' : ''}</span></span>;
}
