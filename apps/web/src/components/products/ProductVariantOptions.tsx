import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductFieldHelp } from './ProductFieldHelp';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/product-store';
import type { VariantGroup, VariantItem } from '@/lib/product-master-readiness';
import { automaticVariantGroups, axisKey, MAX_VARIANT_ATTRIBUTES, MAX_VARIANT_COMBINATIONS, planVariants, variantArchiveBlock, variantCombinations } from '@/lib/product-variant-plan';

export interface VariantAttributeChoice { key: string; name: string; options: string[]; currentValues: string[] }
export interface VariantMatrixDraft {
  groups: VariantGroup[]; items: VariantItem[];
  onItemsChange: (items: VariantItem[]) => void;
  onToggleCombination: (key: string, selected: boolean) => void;
}
const editKey = (item: VariantItem) => item.id ? 'id:' + item.id : 'options:' + JSON.stringify(Object.entries(item.option_values ?? {}).sort());
type SkuEdit = Pick<VariantItem, 'sku_code' | 'price' | 'image_url' | 'stock' | 'stock_by_location'>;

export function ProductVariantOptions({ groups, items, attributes, parentSku, basePrice, product, disabled, autoInitialize = false, onApply, onGroupsChange, onEditingChange, renderMatrix, renderAttributes }: {
  groups: VariantGroup[]; items: VariantItem[]; attributes: VariantAttributeChoice[]; parentSku: string; basePrice: string;
  product?: Product | null; disabled: boolean; onApply: (groups: VariantGroup[], items: VariantItem[]) => void;
  autoInitialize?: boolean;
  onGroupsChange?: (groups: VariantGroup[]) => void;
  renderAttributes?: (groups: VariantGroup[], onChange: (groups: VariantGroup[]) => void) => ReactNode;
  onEditingChange: (pending: boolean) => void; renderMatrix: (draft: VariantMatrixDraft) => ReactNode;
}) {
  // Keep a stable identity baseline until Save. Editing options never deletes saved SKUs.
  const [baseline] = useState(() => ({ groups, items, attributes }));
  const [automatic] = useState(() => autoInitialize && !disabled && !groups.length);
  const [draft, setDraft] = useState(() => automatic ? automaticVariantGroups(attributes) : groups);
  const [expanded, setExpanded] = useState(groups.length === 0);
  const [touched, setTouched] = useState(automatic);
  const [excluded, setExcluded] = useState(() => variantCombinations(groups).rows.filter(row => !items.some(item => item.selected && item.key === row.key)).map(row => row.key));
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, SkuEdit>>({});
  const applyRef = useRef(onApply);
  applyRef.current = onApply;
  const groupsChangeRef = useRef(onGroupsChange);
  groupsChangeRef.current = onGroupsChange;
  const initialAutomaticGroups = useRef(automatic ? draft : null);
  useEffect(() => {
    if (initialAutomaticGroups.current) {
      groupsChangeRef.current?.(initialAutomaticGroups.current);
      initialAutomaticGroups.current = null;
    }
  }, []);
  const emitted = useRef('');
  const plan = useMemo(() => {
    const rows = variantCombinations(draft).rows;
    const currentAssignments = Object.fromEntries(Object.entries(assignments).filter(([, key]) => key === '__archive' || rows.some(row => row.key === key && !excluded.includes(key))));
    // A single SKU can be inferred only when every axis has one known common value.
    const original = baseline.items.filter(item => item.id && item.selected);
    if (!baseline.groups.length && original.length === 1 && !currentAssignments[original[0].id!]) {
      const known = draft.map(group => baseline.attributes.find(attribute => attribute.key === axisKey(group))?.currentValues ?? []);
      if (draft.length && known.every(values => values.length === 1)) {
        const match = rows.find(row => !excluded.includes(row.key) && draft.every((group, index) => row.values[axisKey(group)].toLowerCase() === known[index][0].toLowerCase()));
        if (match) currentAssignments[original[0].id!] = match.key;
      }
    }
    return planVariants({ groups: draft, previousGroups: baseline.groups, items: baseline.items, parentSku, basePrice, excluded, assignments: currentAssignments });
  }, [draft, baseline, parentSku, basePrice, excluded, assignments]);
  const plannedItems = useMemo(() => plan.items.map(item => ({ ...item, ...edits[editKey(item)] })), [plan.items, edits]);
  const blockedArchive = plan.newlyArchived.map(item => variantArchiveBlock(item, product)).find(Boolean);
  const remapped = baseline.groups.length > 0 && plannedItems.some(item => item.id && item.selected && baseline.items.some(previous => previous.id === item.id && JSON.stringify(previous.option_values) !== JSON.stringify(item.option_values)));
  const needsConfirmation = Boolean(plan.newlyArchived.length || remapped);
  const pending = !plannedItems.some(item => item.selected) || plan.count > MAX_VARIANT_COMBINATIONS || plan.unresolved.length > 0 || plan.duplicateAssignments || Boolean(blockedArchive) || (needsConfirmation && !acknowledged);
  useEffect(() => { onEditingChange(!disabled && pending); }, [pending, disabled, onEditingChange]);
  useEffect(() => () => onEditingChange(false), [onEditingChange]);
  useEffect(() => {
    if (!touched || disabled || pending) return;
    const signature = JSON.stringify([draft, plannedItems]);
    if (signature !== emitted.current) { emitted.current = signature; applyRef.current(draft, plannedItems); }
  }, [draft, plannedItems, touched, disabled, pending]);

  function updateGroups(next: VariantGroup[]) { setDraft(next); setTouched(true); setAcknowledged(false); onGroupsChange?.(next); }
  function addAttribute(key: string) {
    const attribute = attributes.find(item => item.key === key);
    if (!attribute || draft.length >= MAX_VARIANT_ATTRIBUTES) return;
    const common = baseline.attributes.find(item => item.key === key)?.currentValues ?? attribute.currentValues;
    updateGroups([...draft, { id: crypto.randomUUID(), attributeKey: attribute.key, name: attribute.name, values: common.length === 1 ? [...common] : [] }]);
  }
  function toggleValue(group: VariantGroup, value: string) {
    updateGroups(draft.map(item => item.id === group.id ? { ...item, values: item.values.includes(value) ? item.values.filter(current => current !== value) : [...item.values, value] } : item));
  }
  function addValue(group: VariantGroup) {
    const value = newValues[group.id]?.trim().replace(/\s+/g, ' ');
    if (!value || group.values.some(existing => existing.toLowerCase() === value.toLowerCase())) return;
    updateGroups(draft.map(item => item.id === group.id ? { ...item, values: [...item.values, value] } : item));
    setNewValues(current => ({ ...current, [group.id]: '' }));
  }
  const matrixItems = !draft.length ? [] : touched || expanded ? plan.rows.map(row => plannedItems.find(item => item.selected && item.key === row.key) ?? ({
    key: row.key, option_values: row.values, sku_code: '', price: '', image_url: '', stock: '', stock_by_location: {}, selected: false,
  } satisfies VariantItem)) : items.filter(item => item.selected);
  const mappingItems = baseline.items.filter(item => item.id && item.selected && (plan.unresolved.some(current => current.id === item.id) || assignments[item.id!]));
  return <section id="product-variant-options" tabIndex={-1} aria-label={renderAttributes ? "Attributes and SKU matrix" : "Variant options"} className={cn("min-w-0 space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", !renderAttributes && "border-t pt-4")}>
    {renderAttributes ? renderAttributes(draft, updateGroups) : <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 id="product-variant-options-title" className="w-36 shrink-0 text-sm font-semibold">Variant options</h3>
        {expanded && !disabled && draft.length < 2 && <select aria-label="Variant option type" value="" className="min-h-11 w-64 max-w-full rounded-md border bg-background px-3 text-sm" onChange={event => addAttribute(event.target.value)}><option value="">{draft.length ? 'Add another option type' : 'Select option type'}</option>{attributes.filter(attribute => !draft.some(group => axisKey(group) === attribute.key)).map(attribute => <option key={attribute.key} value={attribute.key}>{attribute.name}</option>)}</select>}
        {draft.length > 0 && !disabled && <Button type="button" variant="ghost" className="ml-auto min-h-11" aria-expanded={expanded} aria-controls="variant-option-fields" onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide options' : 'Edit variant options'}<ChevronDown className={cn('ml-2 size-4', expanded && 'rotate-180')} /></Button>}
      </div>
      {!expanded || disabled ? <div className="flex flex-wrap gap-2">{draft.map(group => <span key={group.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm"><strong>{group.name}:</strong> {group.values.join(', ')}</span>)}</div> : draft.length > 0 && <div id="variant-option-fields" className="space-y-3">
        {draft.map(group => {
          const attribute = attributes.find(item => item.key === axisKey(group));
          const options = [...new Set([...(attribute?.options ?? []), ...group.values])];
          return <fieldset key={group.id} className="min-w-0 rounded-lg border p-3 sm:p-4">
            <legend className="px-1 text-sm font-semibold">{group.name}</legend>
            <div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{group.values.length ? group.values.length + ' selected' : 'Select values you sell'}</span><Button type="button" variant="ghost" className="size-11 p-0" aria-label={'Remove ' + group.name + ' option'} onClick={() => updateGroups(draft.filter(item => item.id !== group.id))}><Trash2 className="size-4" /></Button></div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={group.name + ' variant values'}>{options.map(value => <button type="button" key={value} aria-pressed={group.values.includes(value)} onClick={() => toggleValue(group, value)} className={cn('inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', group.values.includes(value) ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>{value}{group.values.includes(value) && <Check className="size-3.5" aria-hidden="true" />}</button>)}</div>
            <div className="mt-3 flex flex-wrap gap-2"><Input className="min-h-11 min-w-0 flex-1 sm:max-w-64" aria-label={'New ' + group.name + ' value'} placeholder={'New ' + group.name.toLowerCase() + ' value'} value={newValues[group.id] ?? ''} maxLength={60} onChange={event => setNewValues(current => ({ ...current, [group.id]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addValue(group); } }} /><Button type="button" variant="outline" className="min-h-11" disabled={!newValues[group.id]?.trim()} onClick={() => addValue(group)}><Plus className="mr-2 size-4" />Add value</Button></div>
          </fieldset>;
        })}
      </div>}
    </div>}
    {plan.count > MAX_VARIANT_COMBINATIONS && <p role="alert" className="text-sm text-destructive">{plan.count} combinations exceed the {MAX_VARIANT_COMBINATIONS}-combination limit. Reduce the selected values.</p>}
    {touched && plan.count > 0 && plan.count <= MAX_VARIANT_COMBINATIONS && mappingItems.length > 0 && <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-1"><h4 className="text-sm font-semibold">{baseline.groups.length ? 'Review affected SKUs' : 'Which version is the current SKU?'}</h4><ProductFieldHelp label="About keeping existing SKUs">Match the original SKU to its version to retain its price, image, stock and listing links. New variants start without stock. Saved SKUs are never deleted.</ProductFieldHelp></div>
      {mappingItems.map(item => <label key={item.id} className="block space-y-2 text-sm"><span className="font-mono">{item.sku_code}</span><select aria-label={'Keep SKU ' + item.sku_code + ' as'} value={plan.items.find(next => next.id === item.id && next.selected)?.key ?? (assignments[item.id!] === '__archive' ? '__archive' : '')} className="min-h-11 w-full rounded-md border bg-background px-3 text-sm" onChange={event => { setAssignments(current => ({ ...current, [item.id!]: event.target.value })); setTouched(true); setAcknowledged(false); }}><option value="">Choose the matching version</option>{plan.rows.filter(row => !excluded.includes(row.key)).map(row => <option key={row.key} value={row.key}>{row.key}</option>)}<option value="__archive" disabled={Boolean(variantArchiveBlock(item, product))}>Make inactive · keep history</option></select>{variantArchiveBlock(item, product) && <span className="block text-xs text-muted-foreground">This SKU has stock or listing links and must be kept.</span>}</label>)}
      {plan.unresolved.length > 0 && <p className="text-xs text-muted-foreground">Match {plan.unresolved.length} existing SKU{plan.unresolved.length === 1 ? '' : 's'} before saving.</p>}
    </div>}
    {plan.duplicateAssignments && <p role="alert" className="text-sm text-destructive">Each existing SKU must match a different combination.</p>}
    {blockedArchive && <p role="alert" className="text-sm text-destructive">{blockedArchive}</p>}
    {touched && needsConfirmation && !plan.unresolved.length && <label className="flex min-h-11 items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><input type="checkbox" className="size-4 shrink-0 accent-primary" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /><span>I reviewed {plan.newlyArchived.length ? plan.newlyArchived.length + ' SKU(s) becoming inactive' : 'the existing SKU mappings'}. Stock and history will be retained.</span></label>}
    <div id="product-sku-pricing" tabIndex={-1}>
    {matrixItems.length > 0 && renderMatrix({
      groups: draft, items: matrixItems,
      onToggleCombination: (key, selected) => {
        setExcluded(current => selected ? current.filter(value => value !== key) : [...current, key]);
        if (selected) setAssignments(current => Object.fromEntries(Object.entries(current).filter(([id, value]) => value !== '__archive' || !baseline.items.some(item => item.id === id && item.key === key))));
        setTouched(true); setAcknowledged(false);
      },
      onItemsChange: next => { setEdits(current => ({ ...current, ...Object.fromEntries(next.filter(item => item.selected).map(item => [editKey(item), { price: item.price, sku_code: item.sku_code, image_url: item.image_url, stock: item.stock, stock_by_location: item.stock_by_location }])) })); setTouched(true); },
    })}
    {renderAttributes && matrixItems.length === 0 && <div className="rounded-lg border border-dashed p-4"><h3 className="text-sm font-semibold">SKU matrix</h3><p className="mt-1 text-xs text-muted-foreground">{plan.count > MAX_VARIANT_COMBINATIONS
      ? 'Reduce the selected values above to show your SKU matrix.'
      : draft.length ? `Select at least one value for ${draft.filter(group => !group.values.length).map(group => group.name).join(' and ')} to generate your SKUs.`
        : 'Add a choice attribute such as Color or Size to generate your SKUs.'}</p></div>}
    </div>
    {touched && plan.count > 0 && !plannedItems.some(item => item.selected) && <p className="text-sm text-amber-700 dark:text-amber-300">Select at least one combination to sell.</p>}
  </section>;
}
