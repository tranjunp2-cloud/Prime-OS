import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ProductOpeningStock({ name, locations, value, onChange, disabled }: {
  name: string; locations: Array<{ id: string; label: string }>;
  value: Record<string, string>; onChange: (value: Record<string, string>) => void; disabled: boolean;
}) {
  return <fieldset disabled={disabled} className="min-w-0 space-y-3" aria-label={'Opening stock for ' + name}>
    <div><p className="text-sm font-medium">Opening stock <span className="font-normal text-muted-foreground">· {name}</span></p><p className="mt-1 text-xs text-muted-foreground">Saved with this new SKU. A count of 0 is valid.</p></div>
    {Object.entries(value).map(([id, quantity]) => <div key={id} className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-end gap-2">
      <label className="grid min-w-0 gap-2 text-sm sm:flex sm:items-center sm:justify-between sm:gap-3"><span className="min-w-0 break-words">{locations.find(location => location.id === id)?.label ?? 'Unavailable warehouse'}</span><Input aria-label={'Opening stock for ' + name + ' at ' + (locations.find(location => location.id === id)?.label ?? id)} type="number" min="0" step="1" value={quantity} onChange={event => onChange({ ...value, [id]: event.target.value })} className="min-h-11 w-full min-w-0 shrink-0 text-right sm:w-28" /></label>
      <Button type="button" variant="ghost" className="size-11 shrink-0 p-0" aria-label={'Remove opening warehouse ' + (locations.find(location => location.id === id)?.label ?? id) + ' from ' + name} onClick={() => onChange(Object.fromEntries(Object.entries(value).filter(([key]) => key !== id)))}><Trash2 className="size-4" /></Button>
    </div>)}
    <select aria-label={'Add warehouse for ' + name} value="" className="min-h-11 w-full rounded-md border bg-background px-3 text-sm sm:max-w-80" onChange={event => { if (event.target.value) onChange({ ...value, [event.target.value]: '0' }); }}><option value="">Add warehouse</option>{locations.filter(location => !(location.id in value)).map(location => <option key={location.id} value={location.id}>{location.label}</option>)}</select>
    {!locations.length && <p className="text-xs text-muted-foreground">No editable active warehouse available.</p>}
  </fieldset>;
}
