import { useRef, useState, type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { CatalogAttribute } from '@/lib/product-catalog-settings-store';
import type { VariantGroup } from '@/lib/product-master-readiness';
import { axisKey, MAX_VARIANT_ATTRIBUTES, supportsVariantAttribute } from '@/lib/product-variant-plan';

export type SetupAttribute = CatalogAttribute & { required: boolean };
export type ProductAttributeSetup = { attributes: CatalogAttribute[]; excludedKeys: string[] };

/** Variant attributes are selected automatically; their role can still be adjusted explicitly. */
export function ProductSetupAttributes({ attributes, available, groups, withVariants, disabled, getValue, onValueChange, onGroupsChange, onAdd, onRemove, renderControl }: {
  attributes: SetupAttribute[]; available: CatalogAttribute[]; groups: VariantGroup[]; withVariants: boolean; disabled: boolean;
  getValue: (attribute: CatalogAttribute) => string;
  onValueChange: (attribute: CatalogAttribute, value: string) => void;
  onGroupsChange: (groups: VariantGroup[]) => void;
  onAdd: (attribute: CatalogAttribute) => void;
  onRemove: (attribute: CatalogAttribute) => void;
  renderControl: (attribute: SetupAttribute, value: string, onChange: (value: string) => void, variant: boolean) => ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Multi-select');
  const [error, setError] = useState('');
  const [removal, setRemoval] = useState<{ attribute: SetupAttribute; removeAttribute: boolean } | null>(null);
  const removalTriggerRef = useRef<HTMLElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const focusNewAttribute = useRef(false);
  const candidates = available.filter(attribute => !attributes.some(item => item.key === attribute.key));
  function requestRemoval(attribute: SetupAttribute, removeAttribute: boolean, trigger: HTMLElement) {
    removalTriggerRef.current = trigger;
    setRemoval({ attribute, removeAttribute });
  }
  function confirmRemoval() {
    if (!removal || disabled || (removal.removeAttribute && removal.attribute.required)) return;
    const group = groups.find(item => axisKey(item) === removal.attribute.key);
    if (group) {
      if (!removal.removeAttribute) onValueChange(removal.attribute, ['Single select', 'Enum'].includes(removal.attribute.type) && group.values.length > 1 ? '' : group.values.join(', '));
      onGroupsChange(groups.filter(item => item.id !== group.id));
    }
    if (removal.removeAttribute) onRemove(removal.attribute);
  }
  function closeCreation() {
    setCreating(false); setName(''); setError(''); setType('Multi-select');
    addButtonRef.current?.focus();
  }
  function addAttribute(attribute: CatalogAttribute) {
    onAdd(attribute);
    if (withVariants && supportsVariantAttribute(attribute) && groups.length < MAX_VARIANT_ATTRIBUTES && !groups.some(group => axisKey(group) === attribute.key)) {
      onGroupsChange([...groups, { id: crypto.randomUUID(), attributeKey: attribute.key, name: attribute.name, values: getValue(attribute).split(',').map(value => value.trim()).filter(Boolean) }]);
    }
  }
  function addCustom() {
    const label = name.trim().replace(/\s+/g, ' ');
    if (!label) { setError('Enter an attribute name.'); return; }
    const existing = available.find(attribute => attribute.name.toLowerCase() === label.toLowerCase());
    if (existing && attributes.some(attribute => attribute.key === existing.key)) { setError('This attribute is already on the product.'); return; }
    addAttribute(existing ?? { id: crypto.randomUUID(), key: 'product_' + crypto.randomUUID(), name: label, type, options: '', categories: 0, description: '', unit: '', validation: '', isLocalizable: type === 'Text', status: 'Active', source: 'internal' });
    setAdding(false); closeCreation();
  }
  return <section id="product-setup-attributes" tabIndex={-1} aria-labelledby="product-attributes-title" className="min-w-0 space-y-3 border-t pt-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 id="product-attributes-title" className="text-sm font-semibold">Attributes</h3><p className="mt-1 text-xs text-muted-foreground">{withVariants ? 'Your SKU matrix updates automatically as you select values.' : 'Describe this product. All values belong to its one SKU.'}</p></div>
      {!disabled && <DropdownMenu open={adding} onOpenChange={setAdding}>
        <DropdownMenuTrigger asChild><Button ref={addButtonRef} type="button" variant="outline" className="min-h-11"><Plus className="size-4" />Add attribute</Button></DropdownMenuTrigger>
        <DropdownMenuContent aria-label="Available attributes" aria-labelledby={undefined} align="end" sideOffset={6} collisionPadding={12}
          className="flex max-h-[var(--radix-dropdown-menu-content-available-height)] w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden motion-reduce:animate-none"
          onCloseAutoFocus={event => {
            if (focusNewAttribute.current) { event.preventDefault(); focusNewAttribute.current = false; nameInputRef.current?.focus(); }
          }}>
          <DropdownMenuLabel className="shrink-0 text-xs text-muted-foreground">Available attributes</DropdownMenuLabel>
          <div className="min-h-0 overflow-y-auto">
            {candidates.length ? candidates.map(attribute => <DropdownMenuItem key={attribute.key} className="min-h-11 cursor-pointer whitespace-normal break-words px-3"
              onSelect={() => { addAttribute(attribute); setCreating(false); setError(''); }}>{attribute.name}</DropdownMenuItem>)
              : <p className="px-3 py-3 text-xs text-muted-foreground">All available attributes are already added.</p>}
          </div>
          <DropdownMenuSeparator className="shrink-0" />
          <DropdownMenuItem className="min-h-11 shrink-0 cursor-pointer gap-2 px-3" onSelect={() => { focusNewAttribute.current = true; setCreating(true); setError(''); }}>
            <Plus className="size-4" />Create new attribute
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>}
    </div>
    {creating && !disabled && <div className="space-y-2 rounded-lg border bg-muted/20 p-3" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeCreation(); } }}>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="space-y-1 text-xs">Attribute name<Input ref={nameInputRef} autoFocus aria-label="Attribute name" aria-invalid={Boolean(error)} aria-describedby={error ? 'new-attribute-error' : undefined} maxLength={60} value={name} onChange={event => { setName(event.target.value); setError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } }} className="min-h-11" /></label>
        <label className="space-y-1 text-xs">Value type<select aria-label="Attribute value type" className="block min-h-11 w-full rounded-md border bg-background px-3 text-sm" value={type} onChange={event => setType(event.target.value)}><option>Multi-select</option><option>Single select</option><option>Text</option><option>Number</option></select></label>
        <div className="flex gap-2 self-end"><Button type="button" variant="ghost" className="min-h-11" onClick={closeCreation}>Cancel</Button><Button type="button" className="min-h-11" onClick={addCustom}>Add to product</Button></div>
      </div><p className="text-xs text-muted-foreground">For this product only. Category settings stay unchanged.</p>{error && <p id="new-attribute-error" role="alert" className="text-xs text-destructive">{error}</p>}
    </div>}
    {attributes.length ? <div className="divide-y rounded-lg border">{attributes.map(attribute => {
      const group = withVariants ? groups.find(item => axisKey(item) === attribute.key) : undefined;
      const value = group ? group.values.join(', ') : getValue(attribute);
      const toggleVariant = (checked: boolean, trigger: HTMLElement) => {
        if (checked) onGroupsChange([...groups, { id: crypto.randomUUID(), attributeKey: attribute.key, name: attribute.name, values: getValue(attribute).split(',').map(item => item.trim()).filter(Boolean) }]);
        else requestRemoval(attribute, false, trigger);
      };
      return <div key={attribute.key} id={'product-attribute-' + attribute.key} className="grid min-w-0 gap-3 p-3 sm:grid-cols-[minmax(120px,0.35fr)_minmax(0,1fr)] sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:block"><div><div className="text-sm font-medium">{attribute.name}{attribute.required && <span className="ml-1 text-destructive" aria-label="Required by category">*</span>}</div>
          {attribute.required && <p className="mt-1 text-xs text-muted-foreground">Required by category</p>}</div>
          {withVariants && supportsVariantAttribute(attribute) && <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" className="size-4 accent-primary" aria-label={'Create variants from ' + attribute.name} checked={Boolean(group)} disabled={disabled || (!group && groups.length >= MAX_VARIANT_ATTRIBUTES)} onChange={event => toggleVariant(event.target.checked, event.currentTarget)} />Create variants</label>}
        </div>
        <div className="flex min-w-0 items-start gap-2"><div className="min-w-0 flex-1">{renderControl(group ? { ...attribute, type: 'Multi-select' } : attribute, value, next => { if (group) onGroupsChange(groups.map(item => item.id === group.id ? { ...item, values: next.split(',').map(part => part.trim()).filter(Boolean) } : item)); else onValueChange(attribute, next); }, Boolean(group))}</div>
          {!attribute.required && !disabled && <Button type="button" variant="ghost" className="size-11 shrink-0 p-0 text-muted-foreground" aria-label={'Remove ' + attribute.name + ' attribute'} onClick={event => { if (group) requestRemoval(attribute, true, event.currentTarget); else { onRemove(attribute); addButtonRef.current?.focus(); } }}><Trash2 className="size-4" /></Button>}
        </div>
      </div>;
    })}</div> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Add an attribute such as Color or Size to get started.</p>}
    {withVariants && !groups.length && <p className="text-xs text-muted-foreground">Add a Color, Size or other choice attribute to create your SKU matrix.</p>}
    {withVariants && groups.length >= 2 && <p className="text-xs text-muted-foreground">Up to 2 attributes can create variants. Other attributes apply to all SKUs.</p>}
    <AlertDialog open={Boolean(removal)} onOpenChange={open => { if (!open) setRemoval(null); }}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl motion-reduce:animate-none sm:max-w-lg" onCloseAutoFocus={event => { event.preventDefault(); (removalTriggerRef.current?.isConnected ? removalTriggerRef.current : addButtonRef.current)?.focus(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{removal?.removeAttribute ? `Remove ${removal.attribute.name}?` : `Stop creating variants from ${removal?.attribute.name}?`}</AlertDialogTitle>
          <AlertDialogDescription>This changes the SKU matrix. Existing SKUs may need to be matched again before saving. Stock is never merged automatically.</AlertDialogDescription>
        </AlertDialogHeader>
        {groups.length === 1 && <p className="rounded-lg border bg-muted/30 p-3 text-sm">This is your only variant attribute. Add another one, or choose Single product before saving.</p>}
        {removal && !removal.removeAttribute && ['Single select', 'Enum'].includes(removal.attribute.type) && (groups.find(item => axisKey(item) === removal.attribute.key)?.values.length ?? 0) > 1 && <p className="text-sm text-muted-foreground">Choose one shared {removal.attribute.name.toLowerCase()} value after continuing.</p>}
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
          <AlertDialogAction className={removal?.removeAttribute ? 'min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'min-h-11'} disabled={disabled} onClick={confirmRemoval}>{removal?.removeAttribute ? 'Remove attribute' : 'Use as shared attribute'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
