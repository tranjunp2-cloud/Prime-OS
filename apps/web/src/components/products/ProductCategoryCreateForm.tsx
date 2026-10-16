import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { categoryCreateErrors, categoryCreationParents, type CategoryCreateInput } from '@/lib/catalog-category-create';
import type { CatalogCategory } from '@/lib/product-catalog-settings-store';

export function ProductCategoryCreateForm({ categories, initialName, initialParentId, canCreate, onCreate, onBack }: {
  categories: CatalogCategory[]; initialName: string; initialParentId: string | null; canCreate: boolean;
  onCreate: (input: CategoryCreateInput) => void; onBack: () => void;
}) {
  const [draft, setDraft] = useState<CategoryCreateInput>({ name: initialName, parentId: initialParentId, description: '' });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLSelectElement>(null);
  const errors = categoryCreateErrors(draft, categories);
  const parents = categoryCreationParents(categories);
  useEffect(() => { nameRef.current?.focus(); }, []);

  return <>
    <form id="product-category-create" className="min-h-0 space-y-5 overflow-y-auto p-5" onSubmit={event => {
      event.preventDefault();
      if (saving || !canCreate) return;
      setTouched(true); setError('');
      if (Object.keys(errors).length) { (errors.name ? nameRef : parentRef).current?.focus(); return; }
      setSaving(true);
      try { onCreate(draft); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Category could not be saved. Try again.'); setSaving(false); }
    }}>
      <div className="space-y-2">
        <Label htmlFor="new-product-category-name">Category name <span aria-hidden="true" className="text-destructive">*</span></Label>
        <Input ref={nameRef} id="new-product-category-name" value={draft.name} required maxLength={120} autoComplete="off" className="min-h-11" placeholder="e.g. Sketchbooks"
          aria-invalid={touched && Boolean(errors.name)} aria-describedby={touched && errors.name ? 'category-create-name-error' : undefined}
          onBlur={() => setTouched(true)} onChange={event => { setDraft({ ...draft, name: event.target.value }); setError(''); }} />
        {touched && errors.name ? <p id="category-create-name-error" role="alert" className="text-sm text-destructive">{errors.name}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-product-category-parent">Parent category <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <select ref={parentRef} id="new-product-category-parent" value={draft.parentId ?? ''} className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-describedby="category-create-parent-help" aria-invalid={Boolean(errors.parentId)} onChange={event => { setDraft({ ...draft, parentId: event.target.value || null }); setError(''); }}>
          <option value="">None — create at root level</option>
          {parents.map(parent => <option key={parent.id} value={parent.id}>{parent.label}</option>)}
          {draft.parentId && !parents.some(parent => parent.id === draft.parentId) ? <option value={draft.parentId} disabled>Parent no longer available</option> : null}
        </select>
        <p id="category-create-parent-help" className="text-xs leading-5 text-muted-foreground">Choose where this category belongs. The catalog supports up to 3 levels.</p>
        {errors.parentId ? <p role="alert" className="text-sm text-destructive">{errors.parentId}</p> : null}
      </div>
      <details className="group rounded-lg border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Add description <span className="ml-auto font-normal text-muted-foreground">Optional</span><ChevronDown className="size-4 group-open:rotate-180" /></summary>
        <div className="border-t p-3"><Label htmlFor="new-product-category-description" className="sr-only">Description</Label><Textarea id="new-product-category-description" rows={3} maxLength={2000} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="Which products belong in this category?" /></div>
      </details>
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm leading-6"><Info aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" /><div><p className="font-medium">Added to your shared catalog</p><p className="mt-1 text-muted-foreground">The category is saved immediately, even if you cancel product selection later. Your product stays unchanged until you confirm and save it.</p><p className="mt-2 text-muted-foreground">Configure attributes and channel mappings later in Categories &amp; Attributes.</p></div></div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {!canCreate ? <p role="alert" className="text-sm text-muted-foreground">Only an Admin with write access can create a category.</p> : null}
    </form>
    <div className="flex shrink-0 justify-end gap-3 border-t p-5"><Button type="button" variant="outline" className="min-h-11" onClick={onBack} disabled={saving}>Back</Button><Button type="submit" form="product-category-create" className="min-h-11" disabled={!canCreate || saving || !draft.name.trim() || Boolean(errors.name || errors.parentId || errors.description)}>{saving ? 'Creating…' : 'Create & select'}</Button></div>
  </>;
}
