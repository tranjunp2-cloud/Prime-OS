import { useId, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { CatalogAttribute } from '@/lib/product-catalog-settings-store';

/** Catalog values are suggestions here; additional values belong to this product, not the shared catalog. */
export function ProductAttributeChoice({ attribute, value, onChange, disabled, id }: {
  attribute: CatalogAttribute & { required: boolean }; value: string;
  onChange: (value: string) => void; disabled: boolean; id?: string;
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const addTrigger = useRef<HTMLButtonElement>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const multiple = attribute.type === 'Multi-select' || attribute.type === 'Array';
  const selected = multiple ? value.split(',').map(item => item.trim()).filter(Boolean) : value ? [value] : [];
  // Include saved/imported values so a custom selection never renders as an empty field after reload.
  const options = [...new Set([...attribute.options.split(',').map(item => item.trim()).filter(Boolean), ...selected, ...added])];
  const normalized = draft.trim().replace(/\s+/g, ' ');
  const error = !normalized ? 'Enter a value.' : normalized.includes(',') ? 'Add one value at a time, without commas.' : normalized.length > 60 ? 'Use 60 characters or fewer.' : '';
  function close() {
    setAdding(false); setDraft(''); setSubmitted(false);
    requestAnimationFrame(() => addTrigger.current?.focus());
  }
  function addValue() {
    if (disabled) return;
    setSubmitted(true);
    if (error) return;
    const next = options.find(option => option.toLocaleLowerCase() === normalized.toLocaleLowerCase()) ?? normalized;
    setAdded(current => current.includes(next) ? current : [...current, next]);
    onChange(multiple ? [...new Set([...selected, next])].join(', ') : next);
    close();
  }
  const addButton = !disabled && <Button ref={addTrigger} type="button" variant="ghost" className="min-h-11 shrink-0 px-3 text-xs" aria-label={'Add ' + attribute.name + ' value'} aria-expanded={adding} aria-controls={adding ? controlId + '-add' : undefined} onClick={() => { setAdding(true); setSubmitted(false); }}><Plus className="mr-1 size-4" aria-hidden="true" />Add value</Button>;

  return <div className="min-w-0 space-y-2">
    {multiple ? <div id={controlId} role="group" aria-label={attribute.name} aria-invalid={attribute.required && !selected.length} className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-input p-2">
      {options.map(option => <button key={option} type="button" disabled={disabled} aria-pressed={selected.includes(option)} onClick={() => onChange(selected.includes(option) ? selected.filter(item => item !== option).join(', ') : [...selected, option].join(', '))} className={cn('inline-flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60', selected.includes(option) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}><span className="break-words [overflow-wrap:anywhere]">{option}</span>{selected.includes(option) && <Check className="size-3.5 shrink-0" aria-hidden="true" />}</button>)}
      {addButton}
    </div> : <div className="flex flex-wrap items-center gap-2">
      <select id={controlId} aria-label={attribute.name} aria-required={attribute.required} aria-invalid={attribute.required && !value.trim()} disabled={disabled} value={value} onChange={event => onChange(event.target.value)} className="h-11 min-w-0 flex-[1_1_12rem] rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60">
        <option value="">Select {attribute.name.toLowerCase()}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>{addButton}
    </div>}
    {adding && !disabled && <div id={controlId + '-add'} className="space-y-2 rounded-md border bg-muted/20 p-3" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
      <Label htmlFor={controlId + '-new'} className="text-xs">New {attribute.name.toLowerCase()} value</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input id={controlId + '-new'} autoFocus value={draft} className="min-h-11 min-w-0 flex-[1_1_12rem]" maxLength={60} aria-invalid={submitted && Boolean(error)} aria-describedby={controlId + (submitted && error ? '-error' : '-hint')} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addValue(); }
        }} />
        <Button type="button" variant="secondary" className="min-h-11" onClick={addValue}>Add</Button>
        <Button type="button" variant="ghost" className="min-h-11" onClick={close}>Cancel</Button>
      </div>
      {submitted && error ? <p id={controlId + '-error'} role="alert" className="text-xs text-destructive">{error}</p> : <p id={controlId + '-hint'} className="text-xs text-muted-foreground">This product only. Saved with the product.</p>}
    </div>}
  </div>;
}
