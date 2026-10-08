import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Award, Check, ChevronDown, ChevronRight, CircleAlert, Info, FolderTree, Globe2, Layers3, Lock, MessageSquare, MonitorSmartphone, MoreHorizontal, Pencil, Plus, Search, ShoppingBag, Store, Trash2, X,
  Sparkles,
} from 'lucide-react';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProducts } from '@/lib/product-store';
import { categoryConfigurationImpact } from '@/lib/category-schema';
import { CategorySchemaChanges } from '@/components/products/CategorySchemaChanges';
import { BrandChannelMappings } from '@/components/products/BrandChannelMappings';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  getProductCatalogSettings, saveProductCatalogSettings, resolveCatalogCategory,
  type CatalogAttribute as AttributeDefinition,
  type CatalogAttributeGroup,
  type CatalogBrand as BrandDefinition,
  type CatalogCategory,
  type CatalogChannel,
  type CategoryChannelMapping,
  type ReviewStatus as MappingStatus,
} from '@/lib/product-catalog-settings-store';

type ViewTab = 'categories' | 'attributes' | 'brands';
type DrawerTab = 'general' | 'attributes' | 'mapping';
type UsageFilter = 'all' | 'with_products' | 'no_products';
type AttributeFilter = 'all' | 'assigned' | 'unassigned';
type BrandDrawerTab = 'details' | 'usage' | 'mapping';
interface CategoryRow {
  id: string;
  category: string;
  parentId: string | null;
  path: string;
  level: number;
  hasChildren: boolean;
  productCount: number;
  directProductCount: number;
  linkedProducts: Array<{ id: string; name: string; sku: string }>;
  attributes: string[];
  status: 'Active' | 'Inactive';
  source: 'internal' | 'imported';
  mappings: Record<CatalogChannel, MappingStatus>;
  mappedChannelCount: number;
  applicableChannelCount: number;
}

interface AttributeUsageItem {
  id: string;
  name: string;
  path: string;
  required: boolean;
}

const channelLabels: Array<[CatalogChannel, string]> = [
  ['webstore', 'PrimeWeb'], ['pos', 'PrimePOS'], ['shopee', 'Shopee'], ['lazada', 'Lazada'],
  ['tiktok', 'TikTok Shop'], ['amazon', 'Amazon'], ['rakuten', 'Rakuten'], ['social', 'Social Inbox'],
] as const;

const channelVisuals: Record<CatalogChannel, { icon: typeof Globe2; className: string }> = {
  webstore: { icon: Globe2, className: 'bg-emerald-500/10 text-emerald-600' },
  pos: { icon: Store, className: 'bg-violet-500/10 text-violet-600' },
  shopee: { icon: ShoppingBag, className: 'bg-orange-500/10 text-orange-600' },
  lazada: { icon: ShoppingBag, className: 'bg-blue-500/10 text-blue-600' },
  tiktok: { icon: MonitorSmartphone, className: 'bg-slate-500/10 text-slate-600' },
  amazon: { icon: ShoppingBag, className: 'bg-amber-500/10 text-amber-700' },
  rakuten: { icon: ShoppingBag, className: 'bg-rose-500/10 text-rose-600' },
  social: { icon: MessageSquare, className: 'bg-sky-500/10 text-sky-600' },
};

const channelMarkets: Partial<Record<CatalogChannel, { market: string; account: string }>> = {
  webstore: { market: 'Global', account: 'PrimeWeb' }, shopee: { market: 'VN', account: 'Prime Beauty Official' },
  lazada: { market: 'SG', account: 'Prime Official Store' }, tiktok: { market: 'VN', account: 'Prime Beauty VN' },
  amazon: { market: 'JP', account: 'Prime Beauty Japan' }, rakuten: { market: 'JP', account: 'Prime Official' },
};

function suggestedChannelCategories(channel: CatalogChannel, categoryName: string): CategoryChannelMapping[] {
  const meta = channelMarkets[channel] ?? { market: 'Global', account: channel };
  const roots: Partial<Record<CatalogChannel, string[]>> = {
    webstore: ['Catalog', 'Office & Creative'], shopee: ['Home & Living', 'Stationery & School Supplies'],
    lazada: ['Stationery & Craft', 'School & Office Supplies'], tiktok: ['Home Supplies', 'Stationery'],
    amazon: ['Office Products', 'Office & School Supplies'], rakuten: ['Daily Goods', 'Stationery'],
  };
  return [categoryName, `${categoryName} & Accessories`, `Other ${categoryName}`].map((name, index) => ({
    externalCategoryId: `${channel.toUpperCase()}-${Math.abs(categoryName.split('').reduce((total, char) => total + char.charCodeAt(0), 0))}${index + 1}`,
    externalCategoryName: name,
    externalCategoryPath: [...(roots[channel] ?? ['Catalog']), name],
    market: meta.market,
    account: meta.account,
    lastSyncedAt: new Date().toISOString(),
    confidence: [94, 82, 68][index],
    matchMethod: 'automatic' as const,
  }));
}

function autoMappingSuggestion(channel: CatalogChannel, categoryName: string) {
  if (channel === 'rakuten' && /bamboo|emerging/i.test(categoryName)) return null;
  const suggestion = suggestedChannelCategories(channel, categoryName)[0];
  if ((channel === 'lazada' || channel === 'tiktok') && /bamboo|emerging/i.test(categoryName)) return { ...suggestion, confidence: 76 };
  if (channel === 'tiktok' && /painting/i.test(categoryName)) return { ...suggestion, confidence: 81 };
  return suggestion;
}

function applyHighConfidenceCategoryMappings(category: CatalogCategory): CatalogCategory {
  const mappings = { ...category.mappings };
  const channelMappings = { ...category.channelMappings };
  channelLabels.forEach(([channel]) => {
    if (mappings[channel] !== 'needs_review') return;
    const suggestion = autoMappingSuggestion(channel, category.name);
    if (!suggestion || (suggestion.confidence ?? 0) < 85) return;
    mappings[channel] = 'mapped';
    channelMappings[channel] = { ...suggestion, matchMethod: 'automatic', lastSyncedAt: new Date().toISOString() };
  });
  return { ...category, mappings, channelMappings };
}

function LinkedProductsSummary({ row }: { row: CategoryRow }) {
  if (!row.linkedProducts.length) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"><span className="size-1.5 rounded-full bg-slate-400" />No products</span>;
  }

  return <Tooltip><TooltipTrigger asChild><button type="button" onClick={event => event.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20" aria-label={`${row.productCount} Product Masters linked. Show linked products.`}><span className="size-1.5 rounded-full bg-emerald-500" />{row.productCount} linked</button></TooltipTrigger><TooltipContent side="top" align="start" className="w-80 p-0">
    <div className="border-b px-3 py-2.5"><p className="text-xs font-semibold">Linked Product Masters</p><p className="mt-0.5 text-[11px] opacity-70">{row.path}</p></div>
    <div className="max-h-64 overflow-y-auto p-2">{row.linkedProducts.map(product => <div key={product.id} className="rounded-md px-2 py-2"><p className="truncate text-xs font-semibold">{product.name}</p><p className="mt-0.5 font-mono text-[10px] opacity-65">{product.sku}</p></div>)}</div>
  </TooltipContent></Tooltip>;
}

function AttributeUsageSummary({ attribute, usage }: { attribute: AttributeDefinition; usage: AttributeUsageItem[] }) {
  if (!usage.length) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"><span className="size-1.5 rounded-full bg-slate-400" />Not used</span>;
  }

  return <Popover><PopoverTrigger asChild><button type="button" onClick={event => event.stopPropagation()} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`${attribute.name} is used in ${usage.length} categories. Show categories.`}><span className="size-1.5 rounded-full bg-primary" />Used by {usage.length} {usage.length === 1 ? 'category' : 'categories'}<ChevronDown className="size-3.5" /></button></PopoverTrigger><PopoverContent align="start" className="w-80 p-0" onClick={event => event.stopPropagation()}>
    <div className="border-b px-4 py-3"><p className="text-sm font-semibold">Used in categories</p><p className="mt-1 text-xs text-muted-foreground">Required or optional is managed inside each category.</p></div>
    <div className="max-h-72 overflow-y-auto p-2">{usage.map(item => <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60"><div className="min-w-0"><p className="truncate text-xs font-semibold">{item.name}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.path}</p></div><Badge variant="outline" className={cn('shrink-0 text-[10px]', item.required && 'border-primary/30 bg-primary/5 text-primary')}>{item.required ? 'Required' : 'Optional'}</Badge></div>)}</div>
  </PopoverContent></Popover>;
}

function resolvedAttributePurpose(attribute: AttributeDefinition): NonNullable<AttributeDefinition['purpose']> {
  if (attribute.purpose) return attribute.purpose;
  if (/(^|\s)(color|colour|size|capacity|storage|style|version|variant|paper size|binding type)(\s|$)/i.test(attribute.name)) return 'variant';
  return 'specification';
}

function defaultGroupId(groups: CatalogAttributeGroup[], purpose: NonNullable<AttributeDefinition['purpose']>) {
  return groups.find(group => group.purpose === purpose)?.id ?? '';
}

function humanAttributeType(type: string) {
  const labels: Record<string, string> = {
    'Single select': 'Choose one value', 'Multi-select': 'Choose multiple values', 'Single-line text': 'Short text', 'Rich text': 'Long-form content', Number: 'Number', Measurement: 'Measurement', 'Measurement set': 'Dimensions', 'Country selector': 'Country list',
  };
  return labels[type] ?? type;
}

const colorSwatches: Record<string, string> = { black: '#111827', white: '#ffffff', red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308', orange: '#f97316', purple: '#a855f7', pink: '#ec4899', gray: '#9ca3af', grey: '#9ca3af', brown: '#92400e' };

function attributeHasConfiguredValue(attribute: AttributeDefinition) {
  if (attribute.type === 'Single select' || attribute.type === 'Multi-select') return Boolean(attribute.options.trim());
  if (attribute.type === 'Measurement' || attribute.type === 'Measurement set') return Boolean(attribute.unit.trim() || attribute.validation.trim());
  if (attribute.type === 'Number' || attribute.type === 'Single-line text' || attribute.type === 'Rich text') return Boolean(attribute.validation.trim());
  return true;
}

function AttributeValuePreview({ attribute, options, onEdit }: { attribute: AttributeDefinition; options: string[]; onEdit: () => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const visibleOptions = options.filter(option => option.toLowerCase().includes(query.trim().toLowerCase()));
  const swatchFor = (option: string) => attribute.name.toLowerCase().includes('color') ? colorSwatches[option.toLowerCase().replace(/^(midnight|cloud)\s+/, '')] : null;

  if (!options.length) return null;

  return <div className="flex min-w-0 flex-wrap items-center gap-1.5">
    {options.slice(0, 3).map(option => { const swatch = swatchFor(option); return <span key={option} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[11px] font-medium">{swatch ? <span className="size-2.5 rounded-full border border-border" style={{ backgroundColor: swatch }} /> : null}{option}</span>; })}
    {options.length > 3 ? <Popover open={open} onOpenChange={nextOpen => { setOpen(nextOpen); if (!nextOpen) setQuery(''); }}><PopoverTrigger asChild><button type="button" className="min-h-8 rounded-md px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Show all ${options.length} values for ${attribute.name}`}>+{options.length - 3} more</button></PopoverTrigger><PopoverContent align="start" className="w-80 p-0"><div className="border-b px-4 py-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{attribute.name} values</p><span className="text-xs text-muted-foreground">{options.length} available</span></div>{options.length > 10 ? <div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search values…" className="h-9 pl-9" /></div> : null}</div><div className="max-h-64 overflow-y-auto p-2">{visibleOptions.map(option => { const swatch = swatchFor(option); return <div key={option} className="flex min-h-9 items-center gap-2 rounded-md px-2.5 text-sm hover:bg-muted/60">{swatch ? <span className="size-3 rounded-full border border-border" style={{ backgroundColor: swatch }} /> : null}<span className="truncate">{option}</span></div>; })}{visibleOptions.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground">No values found.</p> : null}</div><div className="flex justify-end border-t p-2"><Button type="button" size="sm" variant="ghost" onClick={() => { setOpen(false); onEdit(); }}>Edit values</Button></div></PopoverContent></Popover> : null}
  </div>;
}

function AttributeLibraryTree({ attributes, attributeGroups, usageByKey, onEdit, onDelete }: { attributes: AttributeDefinition[]; attributeGroups: CatalogAttributeGroup[]; usageByKey: Map<string, AttributeUsageItem[]>; onEdit: (attribute: AttributeDefinition) => void; onDelete: (attribute: AttributeDefinition) => void }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(attributeGroups.map(group => group.id)));
  const groups = attributeGroups.map(group => ({ ...group, label: group.name, attributes: attributes.filter(attribute => attribute.groupId === group.id || (!attribute.groupId && group.id === defaultGroupId(attributeGroups, resolvedAttributePurpose(attribute)))) }));

  const toggleGroup = (id: string) => setExpandedGroups(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });

  return <div className="divide-y divide-border">{groups.filter(group => group.attributes.length).map(group => {
    const expanded = expandedGroups.has(group.id);
    const missingCount = group.attributes.filter(attribute => !attributeHasConfiguredValue(attribute)).length;
    const valueCount = group.attributes.reduce((total, attribute) => total + attribute.options.split(',').filter(option => option.trim()).length, 0);
    return <section key={group.id}>
      <button type="button" onClick={() => toggleGroup(group.id)} aria-expanded={expanded} className="flex w-full items-center gap-3 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FolderTree className="size-4" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{group.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{group.description}</span></span>
        <span className="hidden text-xs text-muted-foreground sm:block">{group.attributes.length} {group.attributes.length === 1 ? 'attribute' : 'attributes'}{valueCount ? ` · ${valueCount} values` : ''}</span>
        {missingCount ? <Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-500/10 text-amber-700">{missingCount} need values</Badge> : <Badge variant="outline" className="shrink-0 border-emerald-300 bg-emerald-500/10 text-emerald-700">All configured</Badge>}
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
      </button>
      {expanded ? <div className="ml-5 border-l-2 border-primary/10 bg-muted/[0.08]">{group.attributes.map(attribute => {
        const usage = usageByKey.get(attribute.key) ?? [];
        const options = attribute.options.split(',').map(option => option.trim()).filter(Boolean);
        const configured = attributeHasConfiguredValue(attribute);
        return <div key={attribute.id} className="border-t border-border/70 first:border-t-0">
          <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_auto_auto]">
            <div className="min-w-0"><span className="flex items-center gap-1.5 text-sm font-semibold"><span className="truncate">{attribute.name}</span>{attribute.isLocalizable || attribute.name.toLowerCase() === 'material' ? <Tooltip><TooltipTrigger asChild><span className="inline-grid size-5 shrink-0 place-items-center rounded text-muted-foreground"><Globe2 className="size-3.5" /></span></TooltipTrigger><TooltipContent>Supports localized values</TooltipContent></Tooltip> : null}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{attribute.name.toLowerCase() === 'dimensions' ? 'Length, width, height' : attribute.type === 'Number' ? 'Number / range' : humanAttributeType(attribute.type)}</span></div>
            <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-1.5 sm:col-span-1"><AttributeValuePreview attribute={attribute} options={options} onEdit={() => onEdit(attribute)} />{!options.length && (attribute.type === 'Country selector' ? <><span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium">Japan</span><span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium">Vietnam</span><span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium">United States</span><span className="text-[11px] font-semibold text-primary">+200 more</span></> : attribute.unit ? <span className="text-xs text-muted-foreground">Measured in <strong className="text-foreground">{attribute.unit}</strong></span> : configured ? <span className="text-xs text-muted-foreground">Entered on each product</span> : <Badge variant="outline" className="border-amber-300 bg-amber-500/10 text-[10px] text-amber-700">No values configured</Badge>)}</div>
            <div><AttributeUsageSummary attribute={attribute} usage={usage} /></div>
            <div className="flex items-center justify-end gap-1"><Button type="button" size="sm" variant="ghost" onClick={() => onEdit(attribute)}>Edit</Button>{usage.length ? <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" size="icon" variant="ghost" aria-label={`More actions for ${attribute.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled className="items-start"><span><span className="block font-medium">Archive</span><span className="mt-0.5 block text-xs text-muted-foreground">In use by products; cannot be deleted permanently.</span></span></DropdownMenuItem></DropdownMenuContent></DropdownMenu> : <Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Delete ${attribute.name}`} onClick={() => onDelete(attribute)} className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"><Trash2 className="size-4" /></button></TooltipTrigger><TooltipContent>Delete unused attribute</TooltipContent></Tooltip>}</div>
          </div>
        </div>;
      })}</div> : null}
    </section>;
  })}</div>;
}

function BrandUsageSummary({ brand, products }: { brand: BrandDefinition; products: Array<{ id: string; name: string; sku_code: string }> }) {
  if (!products.length) return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500"><span className="size-1.5 rounded-full bg-slate-400" />No products</span>;
  return <Popover><PopoverTrigger asChild><button type="button" onClick={event => event.stopPropagation()} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`${products.length} Product Masters use ${brand.name}`}><span className="size-1.5 rounded-full bg-primary" />{products.length} linked<ChevronDown className="size-3.5" /></button></PopoverTrigger><PopoverContent align="start" className="w-80 p-0" onClick={event => event.stopPropagation()}><div className="border-b px-4 py-3"><p className="text-sm font-semibold">Product Masters using {brand.name}</p></div><div className="max-h-72 overflow-y-auto p-2">{products.map(product => <div key={product.id} className="rounded-lg px-2 py-2.5 hover:bg-muted/60"><p className="truncate text-xs font-semibold">{product.name}</p><p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{product.sku_code}</p></div>)}</div></PopoverContent></Popover>;
}

function FieldHelp({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip><TooltipTrigger asChild><button type="button" aria-label={`About ${label}`} className="inline-grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Info aria-hidden="true" className="size-3.5" /></button></TooltipTrigger><TooltipContent side="top" align="start" className="max-w-72 text-xs leading-5">{children}</TooltipContent></Tooltip>;
}

function AttributeOptionsEditor({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState('');
  const options = value.split(',').map(option => option.trim()).filter(Boolean);

  const addOptions = (rawValue: string) => {
    const incoming = rawValue.split(',').map(option => option.trim()).filter(Boolean);
    if (!incoming.length) return;
    const existing = new Set(options.map(option => option.toLowerCase()));
    const next = [...options];
    incoming.forEach(option => {
      const normalized = option.toLowerCase();
      if (!existing.has(normalized)) {
        next.push(option);
        existing.add(normalized);
      }
    });
    onChange(next.join(', '));
    setDraft('');
  };

  const removeOption = (optionToRemove: string) => {
    onChange(options.filter(option => option !== optionToRemove).join(', '));
  };

  return <div className="space-y-2">
    <div className="rounded-lg border border-input bg-background p-2 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      {options.length ? <div className="mb-2 flex flex-wrap gap-2">{options.map(option => <span key={option} className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-sm font-medium"><span>{option}</span><button type="button" onClick={() => removeOption(option)} aria-label={`Remove option ${option}`} className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-background hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-3.5" /></button></span>)}</div> : <p className="px-1 pb-2 text-xs text-muted-foreground">No options added yet</p>}
      <div className="flex items-center gap-2 border-t pt-2">
        <Input id={id} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addOptions(draft); } }} onBlur={() => addOptions(draft)} placeholder="Type a value, e.g. Black" className="h-9 flex-1 border-0 px-1 shadow-none focus-visible:ring-0" />
        <Button type="button" variant="outline" size="sm" disabled={!draft.trim()} onMouseDown={event => event.preventDefault()} onClick={() => addOptions(draft)}><Plus className="size-3.5" />Add</Button>
      </div>
    </div>
    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>Press Enter or comma to add each option.</span><span className="shrink-0 tabular-nums">{options.length} {options.length === 1 ? 'option' : 'options'}</span></div>
  </div>;
}

function AttributeValidationFields({ type, value, onChange }: { type: string; value: string; onChange: (value: string) => void }) {
  const numberAfter = (label: string) => value.match(new RegExp(`${label}\\s*(\\d+(?:\\.\\d+)?)`, 'i'))?.[1] ?? '';

  if (type === 'Single-line text' || type === 'Rich text') {
    const maximum = numberAfter('maximum');
    return <div className="grid gap-2"><div className="flex items-center gap-1"><Label htmlFor="attribute-max-characters">Character limit <span className="font-normal text-muted-foreground">(optional)</span></Label><FieldHelp label="Character limit">Prevents excessively long content when this attribute is completed in Product Master.</FieldHelp></div><div className="relative max-w-52"><Input id="attribute-max-characters" type="number" min="1" value={maximum} onChange={event => onChange(event.target.value ? `Maximum ${event.target.value} characters` : '')} placeholder="No limit" className="pr-20" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">characters</span></div></div>;
  }

  if (type === 'Number' || type === 'Measurement' || type === 'Measurement set') {
    const minimum = numberAfter('minimum');
    const maximum = numberAfter('maximum');
    const updateRange = (nextMinimum: string, nextMaximum: string) => onChange([nextMinimum ? `Minimum ${nextMinimum}` : '', nextMaximum ? `Maximum ${nextMaximum}` : ''].filter(Boolean).join('; '));
    return <div className="grid gap-2"><div className="flex items-center gap-1"><Label>Allowed range <span className="font-normal text-muted-foreground">(optional)</span></Label><FieldHelp label="Allowed range">Values outside this range cannot be saved in Product Master.</FieldHelp></div><div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Minimum<Input type="number" value={minimum} onChange={event => updateRange(event.target.value, maximum)} placeholder="No minimum" /></label><label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Maximum<Input type="number" value={maximum} onChange={event => updateRange(minimum, event.target.value)} placeholder="No maximum" /></label></div></div>;
  }

  if (type === 'Multi-select') {
    const minimum = /at least one/i.test(value) ? '1' : numberAfter('minimum');
    const maximum = numberAfter('maximum');
    const updateSelections = (nextMinimum: string, nextMaximum: string) => onChange([nextMinimum ? `Minimum ${nextMinimum} selections` : '', nextMaximum ? `Maximum ${nextMaximum} selections` : ''].filter(Boolean).join('; '));
    return <div className="grid gap-2"><div className="flex items-center gap-1"><Label>Selection limits <span className="font-normal text-muted-foreground">(optional)</span></Label><FieldHelp label="Selection limits">Controls how many options a user may select. Category-level Required is managed separately.</FieldHelp></div><div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Minimum selections<Input type="number" min="0" value={minimum} onChange={event => updateSelections(event.target.value, maximum)} placeholder="No minimum" /></label><label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Maximum selections<Input type="number" min="1" value={maximum} onChange={event => updateSelections(minimum, event.target.value)} placeholder="No maximum" /></label></div></div>;
  }

  return null;
}

function AttributePurposeSelector(_: { value?: AttributeDefinition['purpose']; onChange: (purpose: NonNullable<AttributeDefinition['purpose']>) => void }) {
  return null;
}

function AttributeGroupSelector({ value, groups, onChange }: { value?: string; groups: CatalogAttributeGroup[]; onChange: (groupId: string) => void }) {
  return <div className="grid gap-2"><Label htmlFor="attribute-group">Group <span className="text-destructive">*</span></Label><select id="attribute-group" value={value ?? ''} onChange={event => onChange(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Select a group</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select><p className="text-xs text-muted-foreground">Choose where this attribute is easiest to find.</p></div>;
}

function ManageAttributeGroupsDialog({ open, groups, attributes, onClose, onChange }: { open: boolean; groups: CatalogAttributeGroup[]; attributes: AttributeDefinition[]; onClose: () => void; onChange: (groups: CatalogAttributeGroup[]) => void }) {
  const [name, setName] = useState('');
  const [createsVariants, setCreatesVariants] = useState(false);
  const purpose: NonNullable<AttributeDefinition['purpose']> = createsVariants ? 'variant' : 'specification';
  const setPurpose = (nextPurpose: NonNullable<AttributeDefinition['purpose']>) => setCreatesVariants(nextPurpose === 'variant');
  const addGroup = () => {
    const trimmed = name.trim();
    if (!trimmed || groups.some(group => group.name.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...groups, { id: `attribute-group-${slugify(trimmed)}-${Date.now()}`, name: trimmed, description: '', purpose: createsVariants ? 'variant' : 'specification' }]);
    setName('');
  };
  return <Dialog open={open} onOpenChange={next => !next && onClose()}><DialogContent className="flex max-h-[80vh] max-w-xl flex-col overflow-hidden p-0"><DialogHeader className="border-b px-6 py-5"><DialogTitle>Manage attribute groups</DialogTitle><DialogDescription>Organize attributes without changing how their values behave.</DialogDescription></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto p-6"><div className="divide-y rounded-xl border">{groups.map(group => { const count = attributes.filter(attribute => attribute.groupId === group.id).length; return <div key={group.id} className="flex min-h-16 items-center gap-3 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FolderTree className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{group.name}</p>{group.system ? <Badge variant="outline" className="text-[10px]">System</Badge> : null}</div><p className="mt-0.5 text-xs text-muted-foreground">{group.purpose === 'variant' ? 'Variant attributes' : 'Product information'} · {count} {count === 1 ? 'attribute' : 'attributes'}</p></div>{!group.system ? <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" disabled={count > 0} aria-label={`Delete ${group.name}`} onClick={() => onChange(groups.filter(item => item.id !== group.id))}><Trash2 className="size-4" /></Button></TooltipTrigger><TooltipContent>{count ? 'Move its attributes before deleting this group' : 'Delete group'}</TooltipContent></Tooltip> : null}</div>; })}</div><div className="mt-5 rounded-xl border bg-muted/20 p-4"><p className="text-sm font-semibold">New group</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px_auto]"><Input value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addGroup(); } }} placeholder="e.g. Packaging" aria-label="Group name" /><select value={purpose} onChange={event => setPurpose(event.target.value as NonNullable<AttributeDefinition['purpose']>)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="specification">Product information</option><option value="variant">Variant</option></select><Button type="button" onClick={addGroup} disabled={!name.trim()}><Plus className="size-4" />Add</Button></div></div></div><DialogFooter className="border-t px-6 py-4"><Button type="button" onClick={onClose}>Done</Button></DialogFooter></DialogContent></Dialog>;
}

const blankAttribute: AttributeDefinition = {
  id: '', name: '', key: '', type: 'Single-line text', categories: 0, description: '', options: '', unit: '', validation: '', purpose: 'specification', isLocalizable: true, status: 'Active', source: 'internal',
};
const blankBrand: BrandDefinition = { id: '', name: '', code: '', manufacturer: '', legalName: '', country: '', website: '', roles: ['Brand'], productCount: 0, status: 'Active', source: 'internal', aliases: [], mappings: {} };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[đĐ]/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function attributeForType(attribute: AttributeDefinition, type: string): AttributeDefinition {
  const previousType = attribute.type;
  const usesOptions = type === 'Single select' || type === 'Multi-select';
  const usesUnit = type === 'Measurement' || type === 'Measurement set';
  const usesValidation = type === 'Single-line text' || type === 'Rich text' || type === 'Number' || type === 'Measurement' || type === 'Measurement set' || type === 'Multi-select';
  const canLocalize = type === 'Single-line text' || type === 'Rich text';
  const previouslyLocalizable = previousType === 'Single-line text' || previousType === 'Rich text';
  return {
    ...attribute,
    type,
    options: usesOptions ? attribute.options : '',
    unit: usesUnit ? attribute.unit : '',
    validation: usesValidation ? attribute.validation : '',
    isLocalizable: canLocalize ? (previouslyLocalizable ? attribute.isLocalizable : true) : false,
  };
}

function attributeForPurpose(attribute: AttributeDefinition, purpose: NonNullable<AttributeDefinition['purpose']>): AttributeDefinition {
  if (purpose === 'variant') return { ...attributeForType(attribute, 'Single select'), purpose, isLocalizable: false };
  return { ...attribute, purpose };
}

export default function ProductCategories() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pathname, search: locationSearch } = useLocation();
  const requestedWorkspaceTab = new URLSearchParams(locationSearch).get('tab');
  const returnParams = new URLSearchParams(locationSearch);
  const requestedReturnTo = returnParams.get('returnTo') ?? '';
  const returnTo = requestedReturnTo.startsWith('/products/') ? requestedReturnTo : '';
  const returnLabel = returnParams.get('returnLabel') || 'Product Master';
  const returnMode = returnParams.get('returnMode');
  const viewTab: ViewTab = pathname.endsWith('/brands') ? 'brands' : pathname.endsWith('/attributes') || requestedWorkspaceTab === 'attributes' ? 'attributes' : 'categories';
  const [search, setSearch] = useState('');
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('general');
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const initialSettings = useMemo(() => getProductCatalogSettings(), []);
  const [categories, setCategories] = useState<CatalogCategory[]>(initialSettings.categories);
  const [pendingCategorySave, setPendingCategorySave] = useState<CatalogCategory | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(() => new Set(initialSettings.categories.map(category => category.id)));
  const [attributes, setAttributes] = useState<AttributeDefinition[]>(initialSettings.attributes);
  const [attributeGroups, setAttributeGroups] = useState<CatalogAttributeGroup[]>(initialSettings.attributeGroups ?? []);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [attributeDrawerOpen, setAttributeDrawerOpen] = useState(false);
  const [attributeDraft, setAttributeDraft] = useState<AttributeDefinition>(blankAttribute);
  const [isCreatingAttribute, setIsCreatingAttribute] = useState(false);
  const [attributeDeleteTarget, setAttributeDeleteTarget] = useState<AttributeDefinition | null>(null);
  const [attributeFilter, setAttributeFilter] = useState<AttributeFilter>('all');
  const [brands, setBrands] = useState<BrandDefinition[]>(initialSettings.brands);
  const [brandUsageFilter, setBrandUsageFilter] = useState<UsageFilter>('all');
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [brandDrawerTab, setBrandDrawerTab] = useState<BrandDrawerTab>('details');
  const [brandDraft, setBrandDraft] = useState<BrandDefinition>(blankBrand);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [brandDeleteTarget, setBrandDeleteTarget] = useState<BrandDefinition | null>(null);
  const products = getProducts();
  const handledCategoryDeepLink = useRef('');
  const handledAttributeDeepLink = useRef('');
  const previousCategory = categories.find(category => category.id === pendingCategorySave?.id);
  const categoryImpact = pendingCategorySave && previousCategory
    ? categoryConfigurationImpact(previousCategory, pendingCategorySave, categories, attributes, products)
    : null;
  const categoryRenameBlocked = Boolean(categoryImpact?.unresolved.length && previousCategory?.name !== pendingCategorySave?.name);

  function commitCategory(nextCategory: CatalogCategory) {
    if (categoryRenameBlocked) return;
    const nextCategories = isCreating ? [...categories, nextCategory] : categories.map(item => item.id === nextCategory.id ? nextCategory : item);
    setCategories(nextCategories);
    saveProductCatalogSettings({ categories: nextCategories, attributes, brands, attributeGroups });
    if (nextCategory.parentId) setExpandedCategoryIds(current => new Set(current).add(nextCategory.parentId!));
    toast({ title: isCreating ? 'Category created' : 'Category configuration saved', description: 'Existing values are preserved. Live listings have not changed.' });
    setPendingCategorySave(null);
    setDrawerOpen(false);
    if (returnTo) returnToProduct();
  }

  function reviewCategorySave(nextCategory: CatalogCategory) {
    const previous = categories.find(category => category.id === nextCategory.id);
    const schema = (category: CatalogCategory) => JSON.stringify({ name: category.name, parentId: category.parentId, status: category.status, attributes: [...category.attributes].sort((a, b) => a.key.localeCompare(b.key)) });
    if (previous && schema(previous) !== schema(nextCategory)) setPendingCategorySave(nextCategory);
    else commitCategory(nextCategory);
  }

  function returnToProduct() {
    if (!returnTo) return;
    if (returnMode === 'close') {
      window.close();
      window.setTimeout(() => navigate(returnTo), 100);
      return;
    }
    navigate(returnTo);
  }

  useEffect(() => { saveProductCatalogSettings({ categories, attributes, brands, attributeGroups }); }, [categories, attributes, brands, attributeGroups]);

  const rows = useMemo<CategoryRow[]>(() => {
    const productsByCategory = new Map<string, typeof products>();
    products.forEach(product => {
      const category = resolveCatalogCategory(product, categories);
      if (category) productsByCategory.set(category.id, [...(productsByCategory.get(category.id) ?? []), product]);
    });
    const byId = new Map(categories.map(category => [category.id, category]));
    const childrenByParent = new Map<string | null, CatalogCategory[]>();
    categories.forEach(category => childrenByParent.set(category.parentId, [...(childrenByParent.get(category.parentId) ?? []), category]));
    childrenByParent.forEach(children => children.sort((a, b) => a.name.localeCompare(b.name)));
    const directProductsFor = (category: CatalogCategory) => productsByCategory.get(category.id) ?? [];
    const linkedProductsFor = (category: CatalogCategory) => {
      const linked = new Map(directProductsFor(category).map(product => [product.id, product]));
      (childrenByParent.get(category.id) ?? []).forEach(child => linkedProductsFor(child).forEach(product => linked.set(product.id, product)));
      return [...linked.values()];
    };
    const applicableChannels: CatalogChannel[] = ['webstore', 'shopee', 'lazada', 'tiktok', 'amazon', 'rakuten'];
    const pathFor = (category: CatalogCategory) => {
      const names = [category.name];
      let parent = category.parentId ? byId.get(category.parentId) : undefined;
      let guard = 0;
      while (parent && guard < 3) { names.unshift(parent.name); parent = parent.parentId ? byId.get(parent.parentId) : undefined; guard += 1; }
      return names.join(' › ');
    };
    const visible: CategoryRow[] = [];
    const visit = (category: CatalogCategory, level: number) => {
      const children = childrenByParent.get(category.id) ?? [];
      const row: CategoryRow = {
        id: category.id,
        category: category.name,
        parentId: category.parentId,
        path: pathFor(category),
        level,
        hasChildren: children.length > 0,
        productCount: linkedProductsFor(category).length,
        directProductCount: directProductsFor(category).length,
        linkedProducts: linkedProductsFor(category).map(product => ({ id: product.id, name: product.name, sku: product.sku_code })),
        attributes: category.attributes.map(assignment => attributes.find(item => item.key === assignment.key)?.name).filter(Boolean) as string[],
        status: category.status,
        source: category.source,
        mappings: category.mappings,
        mappedChannelCount: applicableChannels.filter(channel => category.mappings[channel] === 'mapped').length,
        applicableChannelCount: 6,
      };
      const matches = `${row.path} ${row.attributes.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase());
      if (!search.trim() || matches) visible.push(row);
      if (search.trim() || usageFilter !== 'all' || expandedCategoryIds.has(category.id)) children.forEach(child => visit(child, level + 1));
    };
    (childrenByParent.get(null) ?? []).forEach(root => visit(root, 1));
    return visible;
  }, [products, search, usageFilter, categories, attributes, expandedCategoryIds]);

  const filteredCategoryRows = useMemo(() => {
    if (usageFilter === 'all') return rows;
    const matchesFilter = (row: CategoryRow) => usageFilter === 'with_products' ? row.productCount > 0 : row.productCount === 0;
    return rows.filter(row => matchesFilter(row) || (row.hasChildren && rows.some(candidate => candidate.path.startsWith(`${row.path} ›`) && matchesFilter(candidate))));
  }, [rows, usageFilter]);

  const filteredAttributes = attributes.filter(attribute => {
    const matchesSearch = `${attribute.name} ${attribute.type} ${attribute.description}`.toLowerCase().includes(search.trim().toLowerCase());
    const assigned = categories.some(category => category.attributes.some(item => item.key === attribute.key));
    const matchesFilter = attributeFilter === 'all'
      || (attributeFilter === 'assigned' && assigned)
      || (attributeFilter === 'unassigned' && !assigned);
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    if (viewTab !== 'categories' || !locationSearch || handledCategoryDeepLink.current === locationSearch) return;
    const params = new URLSearchParams(locationSearch);
    const requestedCategory = params.get('category');
    if (!requestedCategory) return;
    const selected = categories.find(category => category.id === requestedCategory) ?? resolveCatalogCategory({ category: requestedCategory }, categories);
    const match = rows.find(row => row.id === selected?.id);
    if (!match) return;
    handledCategoryDeepLink.current = locationSearch;
    setSelectedCategory(match);
    setCreateParentId(null);
    setIsCreating(false);
    setDrawerTab(params.get('panel') === 'attributes' ? 'attributes' : 'general');
    setDrawerOpen(true);
  }, [locationSearch, rows, viewTab]);

  useEffect(() => {
    if (viewTab !== 'attributes' || !locationSearch || handledAttributeDeepLink.current === locationSearch) return;
    const params = new URLSearchParams(locationSearch);
    const requestedAttribute = params.get('attribute');
    if (!requestedAttribute) return;
    const normalized = requestedAttribute.trim().toLowerCase();
    const match = attributes.find(attribute => attribute.id.toLowerCase() === normalized || attribute.key.toLowerCase() === normalized || attribute.name.trim().toLowerCase() === normalized);
    if (!match) return;
    handledAttributeDeepLink.current = locationSearch;
    setAttributeDraft(match);
    setIsCreatingAttribute(false);
    setAttributeDrawerOpen(true);
  }, [attributes, locationSearch, viewTab]);
  const productsByBrand = useMemo(() => new Map(brands.map(brand => {
    const identities = [brand.name, brand.code, ...brand.aliases].map(value => value.trim().toLowerCase());
    return [brand.id, products.filter(product => product.brandId === brand.id || identities.includes(product.brand.trim().toLowerCase()))];
  })), [brands, products]);
  const filteredBrands = brands.filter(brand => {
    const matchesSearch = `${brand.name} ${brand.code} ${brand.manufacturer} ${brand.country}`.toLowerCase().includes(search.trim().toLowerCase());
    const productCount = productsByBrand.get(brand.id)?.length ?? 0;
    return matchesSearch && (brandUsageFilter === 'all' || (brandUsageFilter === 'with_products' ? productCount > 0 : productCount === 0));
  });

  function openCategory(row: CategoryRow) {
    setSelectedCategory(row);
    setCreateParentId(null);
    setIsCreating(false);
    setDrawerTab('general');
    setDrawerOpen(true);
  }

  function createCategory() {
    setSelectedCategory(null);
    setCreateParentId(null);
    setIsCreating(true);
    setDrawerTab('general');
    setDrawerOpen(true);
  }

  function createSubcategory(row: CategoryRow) {
    setSelectedCategory(null);
    setCreateParentId(row.id);
    setExpandedCategoryIds(current => new Set(current).add(row.id));
    setIsCreating(true);
    setDrawerTab('general');
    setDrawerOpen(true);
  }

  const deleteChildren = deleteTarget ? categories.filter(category => category.parentId === deleteTarget.id) : [];
  const deleteNameConflicts = deleteTarget ? deleteChildren.filter(child => categories.some(category => category.id !== deleteTarget.id && category.id !== child.id && category.parentId === null && category.name.trim().toLowerCase() === child.name.trim().toLowerCase())) : [];
  const deleteBlockedByProducts = (deleteTarget?.directProductCount ?? 0) > 0;
  const deleteUnresolvedProducts = deleteTarget ? products.filter(product => !product.categoryId && !resolveCatalogCategory(product, categories) && product.category.trim().toLowerCase() === deleteTarget.category.trim().toLowerCase()) : [];
  const deleteBlockedByChildLimit = deleteChildren.length > 50;
  const deleteBlocked = deleteBlockedByProducts || deleteUnresolvedProducts.length > 0 || deleteNameConflicts.length > 0 || deleteBlockedByChildLimit;

  function deleteCategory() {
    if (!deleteTarget || deleteBlocked) { setDeleteTarget(null); return; }
    const removedName = deleteTarget.category;
    setCategories(current => current.filter(category => category.id !== deleteTarget.id).map(category => category.parentId === deleteTarget.id ? { ...category, parentId: null } : category));
    setExpandedCategoryIds(current => { const next = new Set(current); next.delete(deleteTarget.id); return next; });
    setDeleteTarget(null);
    toast({ title: 'Category deleted', description: deleteChildren.length ? `${removedName} was deleted. ${deleteChildren.length} child ${deleteChildren.length === 1 ? 'category was' : 'categories were'} moved to the root level.` : `${removedName} was removed from the taxonomy.` });
  }

  function createAttribute() {
    setAttributeDraft({ ...blankAttribute });
    setIsCreatingAttribute(true);
    setAttributeDrawerOpen(true);
  }


  function editAttribute(attribute: AttributeDefinition) {
    const purpose = resolvedAttributePurpose(attribute);
    setAttributeDraft({ ...attribute, purpose, groupId: attribute.groupId || defaultGroupId(attributeGroups, purpose) });
    setIsCreatingAttribute(false);
    setAttributeDrawerOpen(true);
  }

  function saveAttribute(attribute: AttributeDefinition) {
    const usageCount = categories.filter(category => category.attributes.some(assignment => assignment.key === attribute.key)).length;
    const normalizedOptions = attribute.options.split(',').map(option => option.trim()).filter(Boolean).join(', ');
    const shapedAttribute = attributeForType(attribute, attribute.type);
    const normalized = {
      ...shapedAttribute,
      id: shapedAttribute.id || slugify(shapedAttribute.key || shapedAttribute.name),
      key: shapedAttribute.key || slugify(shapedAttribute.name).replace(/-/g, '_'),
      name: shapedAttribute.name.trim(),
      description: shapedAttribute.description.trim(),
      options: shapedAttribute.type === 'Single select' || shapedAttribute.type === 'Multi-select' ? normalizedOptions : '',
      categories: usageCount,
    };
    const nextAttributes = isCreatingAttribute
      ? [...attributes, normalized]
      : attributes.map(item => item.id === normalized.id ? normalized : item);
    setAttributes(nextAttributes);
    saveProductCatalogSettings({ categories, attributes: nextAttributes, brands, attributeGroups });
    toast({ title: isCreatingAttribute ? 'Attribute created' : 'Attribute updated', description: `${normalized.name} is ready to assign to product categories.` });
    setAttributeDrawerOpen(false);
    if (returnTo) returnToProduct();
  }

  const attributeUsageByKey = useMemo(() => {
    const byId = new Map(categories.map(category => [category.id, category]));
    const pathFor = (category: CatalogCategory) => {
      const names = [category.name];
      let parent = category.parentId ? byId.get(category.parentId) : undefined;
      let guard = 0;
      while (parent && guard < 3) { names.unshift(parent.name); parent = parent.parentId ? byId.get(parent.parentId) : undefined; guard += 1; }
      return names.join(' › ');
    };
    const usage = new Map<string, AttributeUsageItem[]>();
    categories.forEach(category => category.attributes.forEach(assignment => usage.set(assignment.key, [...(usage.get(assignment.key) ?? []), { id: category.id, name: category.name, path: pathFor(category), required: assignment.required }])));
    return usage;
  }, [categories]);

  const attributeDeleteUsage = attributeDeleteTarget ? attributeUsageByKey.get(attributeDeleteTarget.key) ?? [] : [];

  function deleteAttribute() {
    if (!attributeDeleteTarget || attributeDeleteUsage.length) { setAttributeDeleteTarget(null); return; }
    setAttributes(current => current.filter(attribute => attribute.id !== attributeDeleteTarget.id));
    toast({ title: 'Attribute deleted', description: `${attributeDeleteTarget.name} was removed from reusable attributes.` });
    setAttributeDeleteTarget(null);
  }

  function createBrand() { setBrandDraft(blankBrand); setIsCreatingBrand(true); setBrandDrawerTab('details'); setBrandDrawerOpen(true); }
  function editBrand(brand: BrandDefinition) { setBrandDraft(brand); setIsCreatingBrand(false); setBrandDrawerTab('details'); setBrandDrawerOpen(true); }
  function saveBrand(brand: BrandDefinition) {
    const normalized = { ...brand, id: brand.id || slugify(brand.name), name: brand.name.trim(), code: brand.code.trim().toUpperCase() };
    setBrands(current => isCreatingBrand ? [...current, normalized] : current.map(item => item.id === normalized.id ? normalized : item));
    toast({ title: isCreatingBrand ? 'Brand created' : 'Brand updated', description: `${normalized.name} is available for Product Master selection.` });
    setBrandDrawerOpen(false);
  }
  const brandDeleteProducts = brandDeleteTarget ? productsByBrand.get(brandDeleteTarget.id) ?? [] : [];
  const brandDeleteMappingCount = brandDeleteTarget ? Object.values(brandDeleteTarget.mappings).filter(Boolean).length : 0;
  const brandDeleteBlocked = brandDeleteProducts.length > 0 || brandDeleteMappingCount > 0;
  function deleteBrand() {
    if (!brandDeleteTarget || brandDeleteBlocked) { setBrandDeleteTarget(null); return; }
    setBrands(current => current.filter(brand => brand.id !== brandDeleteTarget.id));
    toast({ title: 'Brand deleted', description: `${brandDeleteTarget.name} was removed from the canonical brand catalog.` });
    setBrandDeleteTarget(null);
  }

  const pageMeta = viewTab === 'brands'
    ? { title: 'Brands', description: 'Maintain canonical product brands, matching aliases and marketplace mappings.', icon: Award, action: 'Add Brand' }
    : { title: 'Categories & Attributes', description: 'Manage product taxonomy and the reusable fields each category requires.', icon: Layers3, action: viewTab === 'categories' ? 'Add Category' : 'Add Attribute' };

  return <div className="space-y-5 p-4 md:p-6">
    {returnTo ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"><div><p className="text-sm font-semibold">Editing catalog setup for {returnLabel}</p><p className="mt-0.5 text-xs text-muted-foreground">Your Product Master draft was saved before opening this setup.</p></div><Button type="button" variant="outline" size="sm" onClick={returnToProduct}><ArrowLeft className="size-4" />Back to {returnLabel}</Button></div> : null}
    <WorkspacePageHeader
      title={pageMeta.title}
      description={pageMeta.description}
      icon={pageMeta.icon}
      actions={viewTab === 'brands' ? <Button onClick={createBrand}><Plus className="size-4" />{pageMeta.action}</Button> : undefined}
    />

    <Tabs value={viewTab} onValueChange={value => navigate(value === 'attributes' ? '/products/categories?tab=attributes' : '/products/categories')}>
      {viewTab !== 'brands' ? <TabsList className="mb-4 h-auto w-full max-w-md justify-start rounded-lg border bg-muted/30 p-1">
        <TabsTrigger value="categories" className="min-h-10 flex-1 gap-2 rounded-md px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><FolderTree className="size-4" />Categories</TabsTrigger>
        <TabsTrigger value="attributes" className="min-h-10 flex-1 gap-2 rounded-md px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Layers3 className="size-4" />Attribute library</TabsTrigger>
      </TabsList> : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div className="relative max-w-xl flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder={viewTab === 'categories' ? 'Search category paths or required attributes...' : viewTab === 'attributes' ? 'Search global attribute definitions...' : 'Search brand, code, manufacturer or country...'} className="pl-9" /></div>
          <p className="text-xs text-slate-500 sm:ml-auto">{viewTab === 'categories' ? `${filteredCategoryRows.length} categories` : viewTab === 'attributes' ? `${filteredAttributes.length} reusable attributes` : `${filteredBrands.length} brands`}</p>
          {viewTab === 'categories' ? <Button type="button" onClick={createCategory}><Plus className="size-4" />New category</Button> : viewTab === 'attributes' ? <><Button type="button" variant="outline" onClick={() => setGroupManagerOpen(true)}>Manage groups</Button><Button type="button" onClick={createAttribute}><Plus className="size-4" />New attribute</Button></> : null}
        </div>

        <TabsContent value="categories" className="m-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3" aria-label="Filter categories by Product Master usage">{([['all', 'All'], ['with_products', 'With products'], ['no_products', 'No products']] as Array<[UsageFilter, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setUsageFilter(value)} aria-pressed={usageFilter === value} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', usageFilter === value ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>{label}</button>)}</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70"><tr>{['CATEGORY', 'PRODUCT MASTERS', 'STATUS', 'ACTIONS'].map(label => <th key={label} className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-slate-500', label === 'ACTIONS' && 'text-right')}>{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{filteredCategoryRows.map(row => <tr key={row.id} tabIndex={0} onClick={() => openCategory(row)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCategory(row); } }} className="cursor-pointer transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              <td className="px-4 py-3"><div className="flex items-center gap-2" style={{ paddingLeft: `${(row.level - 1) * 24}px` }}>
                <button type="button" aria-label={`${expandedCategoryIds.has(row.id) ? 'Collapse' : 'Expand'} ${row.category}`} aria-expanded={row.hasChildren ? expandedCategoryIds.has(row.id) : undefined} disabled={!row.hasChildren} onClick={event => { event.stopPropagation(); setExpandedCategoryIds(current => { const next = new Set(current); next.has(row.id) ? next.delete(row.id) : next.add(row.id); return next; }); }} className={cn('grid size-8 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100', !row.hasChildren && 'invisible')}>
                  {expandedCategoryIds.has(row.id) ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', row.hasChildren ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500')}><FolderTree className="size-4" /></span>
                <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-slate-900">{row.category}</p>{row.source === 'imported' ? <Badge variant="outline" className="h-5 text-[10px]">Imported</Badge> : null}</div><p className="mt-0.5 truncate text-xs text-slate-500">{row.path}</p></div>
              </div></td>
              <td className="px-4 py-3"><LinkedProductsSummary row={row} /></td>
              <td className="px-4 py-3"><Badge className={row.status === 'Active' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}>{row.status}</Badge></td>
              <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                {row.level < 3 ? <Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Add subcategory under ${row.category}`} onClick={event => { event.stopPropagation(); createSubcategory(row); }} className="grid size-9 place-items-center rounded-md text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Plus className="size-4" /></button></TooltipTrigger><TooltipContent>Add subcategory</TooltipContent></Tooltip> : null}
                <Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Edit ${row.category}`} onClick={event => { event.stopPropagation(); openCategory(row); }} className="grid size-9 place-items-center rounded-md text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Pencil className="size-4" /></button></TooltipTrigger><TooltipContent>Edit category</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Delete ${row.category}`} onClick={event => { event.stopPropagation(); setDeleteTarget(row); }} className="grid size-9 place-items-center rounded-md text-slate-500 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"><Trash2 className="size-4" /></button></TooltipTrigger><TooltipContent>Delete category</TooltipContent></Tooltip>
              </div></td>
            </tr>)}</tbody>
          </table></div>
          {filteredCategoryRows.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No categories match this search or setup filter.</div> : null}
        </TabsContent>

        <TabsContent value="attributes" className="m-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2" aria-label="Filter attributes by assignment status">{([
              ['all', 'All'], ['assigned', 'Assigned'], ['unassigned', 'Not assigned'],
            ] as Array<[AttributeFilter, string]>).map(([value, label]) => {
              const count = attributes.filter(attribute => {
                const assigned = categories.some(category => category.attributes.some(item => item.key === attribute.key));
                return value === 'all' || (value === 'assigned' && assigned) || (value === 'unassigned' && !assigned);
              }).length;
              return <button key={value} type="button" onClick={() => setAttributeFilter(value)} aria-pressed={attributeFilter === value} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', attributeFilter === value ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>{label} <span className="ml-1 opacity-70">{count}</span></button>;
            })}</div>
          </div>
          <AttributeLibraryTree attributes={filteredAttributes} attributeGroups={attributeGroups} usageByKey={attributeUsageByKey} onEdit={editAttribute} onDelete={setAttributeDeleteTarget} />
          {filteredAttributes.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No attributes match this search.</div> : null}
        </TabsContent>

        <TabsContent value="brands" className="m-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3" aria-label="Filter brands by Product Master usage">{([['all', 'All'], ['with_products', 'With products'], ['no_products', 'No products']] as Array<[UsageFilter, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setBrandUsageFilter(value)} aria-pressed={brandUsageFilter === value} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', brandUsageFilter === value ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>{label}</button>)}</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70"><tr>{['BRAND', 'PRODUCT MASTERS', 'CHANNEL MAPPING', 'ACTIONS'].map(label => <th key={label} className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-slate-500', label === 'ACTIONS' && 'text-right')}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredBrands.map(brand => { const linkedProducts = productsByBrand.get(brand.id) ?? []; const mappedCount = Object.values(brand.mappings).filter(Boolean).length; return <tr key={brand.id} tabIndex={0} onClick={() => editBrand(brand)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); editBrand(brand); } }} className="cursor-pointer hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 font-bold text-primary">{brand.name.slice(0, 1)}</span><div><div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-900">{brand.name}</p>{brand.source === 'imported' ? <Badge variant="outline" className="h-5 text-[10px]">Imported</Badge> : null}{brand.status === 'Inactive' ? <Badge variant="outline" className="h-5 text-[10px] text-slate-500">Inactive</Badge> : null}</div><p className="mt-0.5 font-mono text-xs text-slate-500">{brand.code}</p></div></div></td><td className="px-4 py-3"><BrandUsageSummary brand={brand} products={linkedProducts} /></td><td className="px-4 py-3"><button type="button" onClick={event => { event.stopPropagation(); setBrandDraft(brand); setIsCreatingBrand(false); setBrandDrawerTab('mapping'); setBrandDrawerOpen(true); }} className={cn('inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', mappedCount ? 'bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300')}><span className={cn('size-1.5 rounded-full', mappedCount ? 'bg-emerald-500' : 'bg-amber-500')} />{mappedCount}/5 configured<ChevronRight className="size-3.5" /></button></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Edit ${brand.name}`} onClick={event => { event.stopPropagation(); editBrand(brand); }} className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Pencil className="size-4" /></button></TooltipTrigger><TooltipContent>Edit brand</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Delete ${brand.name}`} onClick={event => { event.stopPropagation(); setBrandDeleteTarget(brand); }} className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"><Trash2 className="size-4" /></button></TooltipTrigger><TooltipContent>{linkedProducts.length || mappedCount ? 'Remove usage and mappings before deleting' : 'Delete brand'}</TooltipContent></Tooltip></div></td></tr>; })}</tbody></table></div>
          {filteredBrands.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No brands match this search.</div> : null}
        </TabsContent>
      </div>
    </Tabs>

    <ManagedCategoryConfigurationDrawer open={drawerOpen} category={selectedCategory} categories={categories} initialParentId={createParentId} creating={isCreating} tab={drawerTab} attributes={attributes} attributeGroups={attributeGroups} onTabChange={setDrawerTab} onClose={() => setDrawerOpen(false)} onEditAttribute={editAttribute} onCreateAttribute={(attribute) => { setAttributes(current => [...current, attribute]); toast({ title: 'Attribute created and assigned', description: `${attribute.name} is now available in this category.` }); }} saveLabel={returnTo ? 'Save & return to product' : undefined} onSave={reviewCategorySave} />
    <Dialog open={Boolean(pendingCategorySave)} onOpenChange={open => !open && setPendingCategorySave(null)}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader><DialogTitle>Review category impact</DialogTitle><DialogDescription>Review changes to {previousCategory?.name}. Nothing is applied until you confirm.</DialogDescription></DialogHeader>
        {categoryImpact && pendingCategorySave && previousCategory ? <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
          <p className="text-sm"><strong>{categoryImpact.affected.length} Product {categoryImpact.affected.length === 1 ? 'Master uses' : 'Masters use'} this category directly.</strong> <span className="text-muted-foreground">Child categories keep their own attribute configuration.</span></p>
          {categoryImpact.unresolved.length ? <p role="alert" className="rounded-lg border border-amber-500/30 p-3 text-sm text-amber-700 dark:text-amber-300">{categoryImpact.unresolved.length} legacy products have this category name but no confirmed Category ID. They are excluded from the impact count. Confirm their category in Product Master before renaming or deleting this category.</p> : null}
          {previousCategory.name !== pendingCategorySave.name ? <p className="text-sm">Name: {previousCategory.name} → <strong>{pendingCategorySave.name}</strong>. Product references stay linked.</p> : null}
          {previousCategory.parentId !== pendingCategorySave.parentId ? <p className="text-sm">Parent: {categories.find(category => category.id === previousCategory.parentId)?.name ?? 'Root'} → {categories.find(category => category.id === pendingCategorySave.parentId)?.name ?? 'Root'}</p> : null}
          {previousCategory.status !== pendingCategorySave.status ? <p className="text-sm">Status: {previousCategory.status} → <strong>{pendingCategorySave.status}</strong>{pendingCategorySave.status === 'Inactive' ? '. Existing products keep their category, but must select an active category before publishing a new revision.' : '.'}</p> : null}
          <CategorySchemaChanges diff={categoryImpact} attributes={attributes} />
          {categoryImpact.newlyIncomplete.length ? <section className="rounded-lg border border-amber-500/30 p-4"><h3 className="text-sm font-medium text-amber-700 dark:text-amber-300">{categoryImpact.newlyIncomplete.length} Product {categoryImpact.newlyIncomplete.length === 1 ? 'Master will need' : 'Masters will need'} additional data</h3><ul className="mt-3 space-y-3">{categoryImpact.newlyIncomplete.map(({ product, missing }) => <li key={product.id} className="text-sm"><p className="font-medium">{product.name} <span className="font-mono text-xs text-muted-foreground">{product.sku_code}</span></p><p className="mt-1 text-muted-foreground">Missing: {missing.map(attribute => attribute.name).join(', ')}</p></li>)}</ul></section> : <p className="text-sm text-muted-foreground">No new missing required values in the affected products.</p>}
          <p className="text-sm text-muted-foreground">Existing values and translations are kept, including fields removed from this category. Live listings and published revisions stay unchanged; review and publish updates separately.</p>
        </div> : null}
        <DialogFooter className="shrink-0 border-t pt-4"><Button variant="outline" onClick={() => setPendingCategorySave(null)}>Back to editing</Button><Button disabled={categoryRenameBlocked} onClick={() => pendingCategorySave && commitCategory(pendingCategorySave)}>Confirm changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      onOpenChange={open => !open && setDeleteTarget(null)}
      title={deleteBlocked ? 'Category cannot be deleted' : `Delete ${deleteTarget?.category ?? 'category'}?`}
      description={deleteUnresolvedProducts.length
        ? `${deleteUnresolvedProducts.length} legacy products still reference this category name without a confirmed Category ID. Select their category in Product Master before deleting.`
        : deleteBlockedByProducts
        ? `${deleteTarget?.category} has ${deleteTarget?.directProductCount} directly linked Product ${deleteTarget?.directProductCount === 1 ? 'Master' : 'Masters'}. Reassign them before deleting this category.`
        : deleteBlockedByChildLimit
          ? `${deleteTarget?.category} has too many direct child categories to move safely. Reduce the hierarchy before retrying.`
          : deleteNameConflicts.length
            ? `${deleteNameConflicts.length} child ${deleteNameConflicts.length === 1 ? 'category has' : 'categories have'} the same name as an existing root category. Rename or move them before deleting.`
            : deleteChildren.length
              ? `${deleteChildren.length} direct child ${deleteChildren.length === 1 ? 'category will' : 'categories will'} be moved to the root level. This action cannot be undone.`
              : 'This category will be removed from the master taxonomy. This action cannot be undone.'}
      confirmText={deleteBlocked ? 'Close' : 'Delete category'}
      cancelText={deleteBlocked ? 'Back' : 'Cancel'}
      variant={deleteBlocked ? 'default' : 'destructive'}
      onConfirm={deleteCategory}
    />
    <ConfirmDialog
      open={Boolean(attributeDeleteTarget)}
      onOpenChange={open => !open && setAttributeDeleteTarget(null)}
      title={attributeDeleteUsage.length ? 'Attribute cannot be deleted' : `Delete ${attributeDeleteTarget?.name ?? 'attribute'}?`}
      description={attributeDeleteUsage.length
        ? `${attributeDeleteTarget?.name} is used in ${attributeDeleteUsage.length} ${attributeDeleteUsage.length === 1 ? 'category' : 'categories'}. Remove it from those categories first, or mark the attribute inactive instead.`
        : 'This reusable attribute will be permanently removed. This action cannot be undone.'}
      confirmText={attributeDeleteUsage.length ? 'Close' : 'Delete attribute'}
      cancelText={attributeDeleteUsage.length ? 'Back' : 'Cancel'}
      variant={attributeDeleteUsage.length ? 'default' : 'destructive'}
      onConfirm={deleteAttribute}
    />
    <ConfirmDialog open={Boolean(brandDeleteTarget)} onOpenChange={open => !open && setBrandDeleteTarget(null)} title={brandDeleteBlocked ? 'Brand cannot be deleted' : `Delete ${brandDeleteTarget?.name ?? 'brand'}?`} description={brandDeleteProducts.length ? `${brandDeleteTarget?.name} is used by ${brandDeleteProducts.length} Product ${brandDeleteProducts.length === 1 ? 'Master' : 'Masters'}. Reassign those products first.` : brandDeleteMappingCount ? `${brandDeleteTarget?.name} has ${brandDeleteMappingCount} active channel ${brandDeleteMappingCount === 1 ? 'mapping' : 'mappings'}. Remove the mappings first to avoid orphaned listings.` : 'This brand will be removed from the canonical brand catalog. This action cannot be undone.'} confirmText={brandDeleteBlocked ? 'Close' : 'Delete brand'} cancelText={brandDeleteBlocked ? 'Back' : 'Cancel'} variant={brandDeleteBlocked ? 'default' : 'destructive'} onConfirm={deleteBrand} />
    <ManageAttributeGroupsDialog open={groupManagerOpen} groups={attributeGroups} attributes={attributes} onClose={() => setGroupManagerOpen(false)} onChange={setAttributeGroups} />
    <AttributeConfigurationDrawer open={attributeDrawerOpen} creating={isCreatingAttribute} value={attributeDraft} groups={attributeGroups} usage={attributeUsageByKey.get(attributeDraft.key) ?? []} onChange={setAttributeDraft} onClose={() => setAttributeDrawerOpen(false)} onSave={() => saveAttribute(attributeDraft)} saveLabel={returnTo ? 'Save & return to product' : undefined} />
    <BrandConfigurationDrawer open={brandDrawerOpen} creating={isCreatingBrand} tab={brandDrawerTab} onTabChange={setBrandDrawerTab} value={brandDraft} brands={brands} products={productsByBrand.get(brandDraft.id) ?? []} onChange={setBrandDraft} onClose={() => setBrandDrawerOpen(false)} onSave={() => saveBrand(brandDraft)} />
  </div>;
}

function ManagedCategoryConfigurationDrawer({ open, category, categories, initialParentId, creating, tab, attributes, attributeGroups, onTabChange, onClose, onEditAttribute, onCreateAttribute, onSave, saveLabel }: { open: boolean; category: CategoryRow | null; categories: CatalogCategory[]; initialParentId: string | null; creating: boolean; tab: DrawerTab; attributes: AttributeDefinition[]; attributeGroups: CatalogAttributeGroup[]; onTabChange: (tab: DrawerTab) => void; onClose: () => void; onEditAttribute: (attribute: AttributeDefinition) => void; onCreateAttribute: (attribute: AttributeDefinition) => void; onSave: (category: CatalogCategory) => void; saveLabel?: string }) {
  const { toast } = useToast();
  const emptyMappings = Object.fromEntries(channelLabels.map(([key]) => [key, key === 'pos' || key === 'social' ? 'not_required' : 'needs_review'])) as Record<CatalogChannel, MappingStatus>;
  const [draft, setDraft] = useState<CatalogCategory>({ id: '', name: '', parentId: null, description: '', status: 'Active', source: 'internal', attributes: [], mappings: emptyMappings });
  const [showDescription, setShowDescription] = useState(false);
  const [attributePickerOpen, setAttributePickerOpen] = useState(false);
  const [attributePickerMode, setAttributePickerMode] = useState<'existing' | 'create'>('existing');
  const [attributeSearch, setAttributeSearch] = useState('');
  const [pendingAttributeKeys, setPendingAttributeKeys] = useState<string[]>([]);
  const [newAttribute, setNewAttribute] = useState<AttributeDefinition>(blankAttribute);
  const [newAttributeRequired, setNewAttributeRequired] = useState(false);
  const [mappingChannel, setMappingChannel] = useState<CatalogChannel | null>(null);
  const [mappingSearch, setMappingSearch] = useState('');
  const [pendingMapping, setPendingMapping] = useState<CategoryChannelMapping | null>(null);
  const [mappingReview, setMappingReview] = useState<{ channel: CatalogChannel; current: CategoryChannelMapping; target: CategoryChannelMapping } | null>(null);
  const [mappingLockChannel, setMappingLockChannel] = useState<CatalogChannel | null>(null);
  const [showAffectedMappingItems, setShowAffectedMappingItems] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShowDescription(Boolean(category));
    const saved = category ? categories.find(item => item.id === category.id) : null;
    setDraft(saved ? applyHighConfidenceCategoryMappings({ ...saved, attributes: saved.attributes.map(item => ({ ...item })), mappings: { ...saved.mappings }, channelMappings: { ...saved.channelMappings } })
      : { id: `category-${crypto.randomUUID()}`, name: '', parentId: initialParentId, description: '', status: 'Active', source: 'internal', attributes: [], mappings: emptyMappings });
  }, [open, category, categories, initialParentId]);

  const categoryDepth = (id: string): number => {
    let depth = 1;
    let current = categories.find(item => item.id === id);
    let guard = 0;
    while (current?.parentId && guard < 3) { depth += 1; current = categories.find(item => item.id === current?.parentId); guard += 1; }
    return depth;
  };
  const isSelfOrDescendant = (candidateId: string, selfId: string): boolean => {
    let current = categories.find(item => item.id === candidateId);
    let guard = 0;
    while (current && guard < 4) { if (current.id === selfId) return true; current = current.parentId ? categories.find(item => item.id === current?.parentId) : undefined; guard += 1; }
    return false;
  };
  const categoryPath = (id: string) => {
    const names: string[] = [];
    let current = categories.find(item => item.id === id);
    let guard = 0;
    while (current && guard < 3) { names.unshift(current.name); current = current.parentId ? categories.find(item => item.id === current?.parentId) : undefined; guard += 1; }
    return names.join(' › ');
  };
  const subtreeHeight = (id: string): number => {
    const children = categories.filter(item => item.parentId === id);
    return children.length ? 1 + Math.max(...children.map(child => subtreeHeight(child.id))) : 1;
  };
  const draftSubtreeHeight = draft.id ? subtreeHeight(draft.id) : 1;
  const parentOptions = categories.filter(item => categoryDepth(item.id) + draftSubtreeHeight <= 3 && (!draft.id || !isSelfOrDescendant(item.id, draft.id))).sort((a, b) => categoryPath(a.id).localeCompare(categoryPath(b.id)));
  const selectedParent = draft.parentId ? categories.find(item => item.id === draft.parentId) : null;
  const duplicateName = categories.some(item => item.id !== draft.id && item.parentId === draft.parentId && item.name.trim().toLowerCase() === draft.name.trim().toLowerCase());

  function toggleAttribute(key: string, checked: boolean) {
    setDraft(current => ({ ...current, attributes: checked ? [...current.attributes, { key, required: false }] : current.attributes.filter(item => item.key !== key) }));
  }

  function toggleRequired(key: string, required: boolean) {
    setDraft(current => ({ ...current, attributes: current.attributes.map(item => item.key === key ? { ...item, required } : item) }));
  }

  const assignedAttributes = draft.attributes.map(assignment => ({ definition: attributes.find(attribute => attribute.key === assignment.key), assignment })).filter(item => item.definition) as Array<{ definition: AttributeDefinition; assignment: { key: string; required: boolean } }>;
  const availableAttributes = attributes.filter(attribute => !draft.attributes.some(assignment => assignment.key === attribute.key) && `${attribute.name} ${attribute.description} ${attribute.type}`.toLowerCase().includes(attributeSearch.trim().toLowerCase()));
  const generatedNewAttributeKey = slugify(newAttribute.name).replace(/-/g, '_');
  const duplicateNewAttribute = Boolean(generatedNewAttributeKey) && attributes.some(attribute => attribute.key === generatedNewAttributeKey || attribute.name.trim().toLowerCase() === newAttribute.name.trim().toLowerCase());
  const newAttributeNeedsOptions = newAttribute.type === 'Single select' || newAttribute.type === 'Multi-select';
  const newAttributeOptionsValid = !newAttributeNeedsOptions || newAttribute.options.split(',').some(option => option.trim());

  function openAttributePicker() {
    setAttributePickerMode('existing');
    setAttributeSearch('');
    setPendingAttributeKeys([]);
    setNewAttribute(blankAttribute);
    setNewAttributeRequired(false);
    setAttributePickerOpen(true);
  }

  function addSelectedAttributes() {
    setDraft(current => ({ ...current, attributes: [...current.attributes, ...pendingAttributeKeys.filter(key => !current.attributes.some(item => item.key === key)).map(key => ({ key, required: false }))] }));
    setAttributePickerOpen(false);
  }

  function createAndAssignAttribute() {
    const shapedAttribute = attributeForType(newAttribute, newAttribute.type);
    const purpose = resolvedAttributePurpose(shapedAttribute);
    const normalized: AttributeDefinition = { ...shapedAttribute, purpose, groupId: shapedAttribute.groupId || defaultGroupId(attributeGroups, purpose), id: generatedNewAttributeKey, key: generatedNewAttributeKey, name: shapedAttribute.name.trim(), description: shapedAttribute.description.trim(), options: shapedAttribute.options.split(',').map(option => option.trim()).filter(Boolean).join(', '), categories: 1, status: 'Active', source: 'internal' };
    onCreateAttribute(normalized);
    setDraft(current => ({ ...current, attributes: [...current.attributes, { key: normalized.key, required: newAttributeRequired }] }));
    setAttributePickerOpen(false);
  }

  const productUsageCount = category?.productCount ?? 0;
  const mappingUsageCount = (channel: CatalogChannel) => channel === 'rakuten' ? 0 : productUsageCount;
  const activeListingUsageCount = (channel: CatalogChannel) => mappingUsageCount(channel) ? Math.max(1, mappingUsageCount(channel) - 1) : 0;
  const mappingFor = (channel: CatalogChannel) => {
    const saved = draft.channelMappings?.[channel];
    if (saved) return saved;
    if (draft.mappings[channel] !== 'mapped') return null;
    return suggestedChannelCategories(channel, draft.name)[0];
  };
  const openMappingPicker = (channel: CatalogChannel) => {
    setMappingChannel(channel);
    setMappingSearch('');
    setPendingMapping(mappingFor(channel) ?? autoMappingSuggestion(channel, draft.name));
  };
  const applyMapping = (channel: CatalogChannel, target: CategoryChannelMapping) => {
    const replacingExistingMapping = Boolean(mappingFor(channel));
    const channelName = channelLabels.find(([key]) => key === channel)?.[1] ?? channel;
    setDraft(current => ({
      ...current,
      mappings: { ...current.mappings, [channel]: 'mapped' },
      channelMappings: { ...current.channelMappings, [channel]: { ...target, lastSyncedAt: new Date().toISOString() } },
    }));
    setMappingChannel(null);
    setMappingReview(null);
    toast({
      title: replacingExistingMapping ? 'Category mapping replaced' : 'Category mapping saved',
      description: `${channelName} now maps to ${target.externalCategoryPath.join(' › ')}.`,
    });
  };
  const saveMapping = () => {
    if (!mappingChannel || !pendingMapping) return;
    const currentMapping = mappingFor(mappingChannel);
    if (currentMapping && mappingUsageCount(mappingChannel) > 0) {
      setMappingReview({ channel: mappingChannel, current: currentMapping, target: pendingMapping });
      setMappingChannel(null);
      return;
    }
    applyMapping(mappingChannel, pendingMapping);
  };
  const autoMappedCount = channelLabels.filter(([channel]) => mappingFor(channel)?.matchMethod === 'automatic').length;
  const needsReviewCount = channelLabels.filter(([channel]) => draft.mappings[channel] === 'needs_review' && Boolean(autoMappingSuggestion(channel, draft.name))).length;
  const noMatchCount = channelLabels.filter(([channel]) => draft.mappings[channel] === 'needs_review' && !autoMappingSuggestion(channel, draft.name)).length;
  const reviewProductCount = mappingReview ? mappingUsageCount(mappingReview.channel) : 0;
  const reviewListingCount = mappingReview ? activeListingUsageCount(mappingReview.channel) : 0;
  const reviewIssueCount = mappingReview && mappingReview.channel === 'amazon' && reviewProductCount > 1 ? 1 : 0;
  const reviewReadyCount = Math.max(0, reviewProductCount - reviewIssueCount);

  return <Sheet open={open} onOpenChange={next => !next && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[650px]">
    <SheetHeader className="border-b border-border px-6 py-5"><SheetTitle>{creating ? (initialParentId ? 'Create subcategory' : 'Create category') : 'Configure Category'}</SheetTitle><SheetDescription>{creating ? (initialParentId ? `Add a new category under ${selectedParent?.name ?? 'the selected parent'}.` : 'Create a root category or place it under an existing category.') : 'Manage the category details, product attributes, and channel mappings.'}</SheetDescription></SheetHeader>
    {creating ? <>
      <div className="flex-1 overflow-y-auto p-6 pb-28">
        <div className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="managed-category-name">Category name</Label>
            <Input id="managed-category-name" autoFocus value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Art Supplies" />
            <p className="text-xs leading-5 text-muted-foreground">Use a stable product type. Manage promotions and seasonal groups with tags or collections, not category attributes.</p>
          </div>
          <label className="grid gap-2 text-sm font-medium">Parent category <span className="font-normal text-muted-foreground">(optional)</span><select value={draft.parentId ?? ''} disabled={Boolean(initialParentId)} onChange={event => setDraft({ ...draft, parentId: event.target.value || null })} className="h-10 rounded-md border border-input bg-background px-3 font-normal disabled:cursor-not-allowed disabled:opacity-70"><option value="">None — create at root level</option>{parentOptions.map(option => <option key={option.id} value={option.id}>{categoryPath(option.id)}</option>)}</select></label>
          {initialParentId ? <p className="-mt-3 text-xs text-muted-foreground">Parent is locked because you started from <strong className="text-foreground">{selectedParent?.name}</strong>.</p> : null}
          {duplicateName ? <p role="alert" className="text-xs font-medium text-destructive">A category with this name already exists under the selected parent.</p> : null}
          <div className="rounded-xl border bg-muted/20">
            <button type="button" aria-expanded={showDescription} onClick={() => setShowDescription(current => !current)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm font-medium">
              <span>Add description <span className="font-normal text-muted-foreground">(optional)</span></span>
              <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', showDescription && 'rotate-180')} />
            </button>
            {showDescription ? <div className="border-t p-4"><Label htmlFor="managed-category-description" className="sr-only">Description</Label><Textarea id="managed-category-description" value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} rows={4} placeholder="Describe which products belong in this category..." /></div> : null}
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold">Ready immediately after creation</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">The category will be active and available in Product Master. Attributes and channel mappings can be configured later.</p>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-background/95 p-4 backdrop-blur"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!draft.name.trim() || duplicateName} onClick={() => onSave({ ...draft, id: draft.id || `${slugify(draft.name)}-${Date.now().toString(36)}`, status: 'Active', source: 'internal' })}>{initialParentId ? 'Create subcategory' : 'Create category'}</Button></div>
    </> : <>
    <Tabs value={tab} onValueChange={value => onTabChange(value as DrawerTab)} className="flex min-h-0 flex-1 flex-col">
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-background px-4 py-0">
        <TabsTrigger value="general" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">General</TabsTrigger>
        <TabsTrigger value="attributes" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Attributes</TabsTrigger>
        <TabsTrigger value="mapping" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Channel mapping</TabsTrigger>
      </TabsList>
      <div className="flex-1 overflow-y-auto p-6 pb-28">
        <TabsContent value="general" className="m-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Parent category<select value={draft.parentId ?? ''} onChange={event => setDraft({ ...draft, parentId: event.target.value || null })} className="h-10 rounded-md border border-input bg-background px-3 font-normal"><option value="">None — root level</option>{parentOptions.map(option => <option key={option.id} value={option.id}>{categoryPath(option.id)}</option>)}</select></label><label className="grid gap-2 text-sm font-medium">Status<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as CatalogCategory['status'] })} className="h-10 rounded-md border border-input bg-background px-3 font-normal"><option>Active</option><option>Inactive</option></select></label></div>
          <div className="grid gap-2"><Label htmlFor="managed-category-name">Category name</Label><Input id="managed-category-name" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Art Supplies" /><p className="text-xs text-muted-foreground">Renaming keeps the same Category ID and product references.</p></div>
          <div className="grid gap-2"><Label htmlFor="managed-category-description">Description</Label><Textarea id="managed-category-description" value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} rows={4} /></div>
          <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-semibold">Data source</p><p className="text-xs text-muted-foreground">Imported records require review before becoming canonical.</p></div><Badge variant="outline">{draft.source === 'internal' ? 'Internal' : 'Imported'}</Badge></div>
        </TabsContent>
        <TabsContent value="attributes" className="m-0 space-y-5">
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold">Assigned to this category</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">These fields appear automatically in Product Master when this category is selected.</p></div><Button type="button" size="sm" onClick={openAttributePicker}><Plus className="size-4" />Add attribute</Button></div>
          {assignedAttributes.length ? <div className="space-y-2">{assignedAttributes.map(({ definition: attribute, assignment }) => <div key={attribute.key} className="flex min-h-16 items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold">{attribute.name}</p><Badge variant="outline" className="text-[10px] font-medium">{attribute.type}</Badge></div><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{attribute.description || 'Reusable Product Master field'}</p></div><Tooltip><TooltipTrigger asChild><button type="button" aria-pressed={assignment.required} onClick={() => toggleRequired(attribute.key, !assignment.required)} className={cn('inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', assignment.required ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted')}><span className={cn('grid size-4 place-items-center rounded-full border', assignment.required ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50')} aria-hidden="true">{assignment.required ? <Check className="size-3" /> : null}</span>{assignment.required ? 'Required' : 'Optional'}</button></TooltipTrigger><TooltipContent>{assignment.required ? 'A value is required for products in this category' : 'Products in this category may leave this field empty'}</TooltipContent></Tooltip><div className="h-7 w-px shrink-0 bg-border" aria-hidden="true" /><div className="flex shrink-0 items-center gap-1"><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={`Edit shared attribute ${attribute.name}`} onClick={() => onEditAttribute(attribute)} className="text-muted-foreground hover:text-primary"><Pencil className="size-4" /></Button></TooltipTrigger><TooltipContent>Edit shared attribute</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={`Remove ${attribute.name} from category`} onClick={() => toggleAttribute(attribute.key, false)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></TooltipTrigger><TooltipContent>Remove from this category</TooltipContent></Tooltip></div></div>)}</div> : <div className="rounded-xl border border-dashed p-7 text-center"><p className="text-sm font-semibold">No attributes assigned</p><p className="mt-1 text-xs text-muted-foreground">Add reusable fields to define what Product Masters in this category need.</p><Button type="button" variant="outline" size="sm" className="mt-4" onClick={openAttributePicker}><Plus className="size-4" />Add first attribute</Button></div>}
        </TabsContent>
        <TabsContent value="mapping" className="m-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3"><div className="min-w-0"><div className="flex items-center gap-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Master category</p><Tooltip><TooltipTrigger asChild><button type="button" aria-label="About automatic category mapping" className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-muted"><Info aria-hidden="true" className="size-3.5" /></button></TooltipTrigger><TooltipContent className="max-w-72 text-xs leading-5">Matches at 85% confidence or higher are saved automatically. Lower-confidence matches need review. Mappings in use cannot be removed.</TooltipContent></Tooltip></div><p className="truncate text-sm font-semibold">{draft.id ? categoryPath(draft.id) : draft.name}</p></div><div className="flex flex-wrap gap-1.5 text-[10px] font-semibold"><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-700">{autoMappedCount} mapped</span>{needsReviewCount ? <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-700">{needsReviewCount} review</span> : null}{noMatchCount ? <span className="rounded-full bg-destructive/10 px-2 py-1 text-destructive">{noMatchCount} no match</span> : null}</div></div>
          {channelLabels.filter(([key]) => draft.mappings[key] !== 'not_required').map(([key, label]) => {
            const status = draft.mappings[key];
            const target = mappingFor(key);
            const notRequired = status === 'not_required';
            const channelProductUsage = mappingUsageCount(key);
            const channelListingUsage = activeListingUsageCount(key);
            const locked = Boolean(target && channelProductUsage > 0);
            const suggestion = !target && !notRequired ? autoMappingSuggestion(key, draft.name) : null;
            const ChannelIcon = channelVisuals[key].icon;
            return <section key={key} className={cn('rounded-xl border p-3', status === 'needs_review' && 'border-amber-300/60')}>
              <div className="flex items-start gap-3"><span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', channelVisuals[key].className)} aria-hidden="true"><ChannelIcon className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{label}</h3>{target ? <Tooltip><TooltipTrigger asChild><button type="button" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Badge variant="outline" className="cursor-help border-emerald-300 bg-emerald-50 text-emerald-700">{target.matchMethod === 'automatic' ? 'Auto-mapped' : 'Mapped'}</Badge></button></TooltipTrigger><TooltipContent className="max-w-72 text-xs leading-5">{locked ? `Locked because ${channelProductUsage} Product Master${channelProductUsage === 1 ? '' : 's'} and ${channelListingUsage} active listing${channelListingUsage === 1 ? '' : 's'} depend on this mapping.` : 'This mapping is not used yet and can be replaced directly.'} Last synced {new Date(target.lastSyncedAt).toLocaleDateString()}.</TooltipContent></Tooltip> : notRequired ? <Badge variant="secondary">Not required</Badge> : suggestion ? <Tooltip><TooltipTrigger asChild><button type="button" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Badge variant="outline" className="cursor-help border-amber-300 text-amber-700">Review · {suggestion.confidence}%</Badge></button></TooltipTrigger><TooltipContent className="max-w-64 text-xs">The automatic match is below the 85% threshold and needs confirmation.</TooltipContent></Tooltip> : <Badge variant="outline" className="border-destructive/40 text-destructive">No match</Badge>}</div>{target ? <><p className="mt-1.5 truncate text-sm font-medium">{target.externalCategoryPath.join(' › ')}</p><p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{target.externalCategoryId} · {target.account} · {target.market}</p></> : suggestion ? <><p className="mt-1.5 truncate text-sm font-medium">{suggestion.externalCategoryPath.join(' › ')}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{suggestion.externalCategoryId}</p></> : !notRequired ? <p className="mt-1.5 text-xs text-muted-foreground">No reliable automatic match.</p> : null}</div>{!notRequired ? target ? locked ? <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="ghost" aria-label={`Why ${label} mapping is locked`} onClick={() => { setShowAffectedMappingItems(false); setMappingLockChannel(key); }} className="shrink-0"><Lock className="size-4" /></Button></TooltipTrigger><TooltipContent>View lock details</TooltipContent></Tooltip> : <Button type="button" size="sm" variant="outline" onClick={() => openMappingPicker(key)}>Replace</Button> : <Button type="button" size="sm" variant={suggestion ? 'default' : 'outline'} onClick={() => openMappingPicker(key)}>{suggestion ? 'Review' : 'Select'}</Button> : null}</div>
            </section>;
          })}
        </TabsContent>
      </div>
    </Tabs>
    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-background/95 p-4 backdrop-blur"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!draft.name.trim() || duplicateName} onClick={() => onSave({ ...draft, id: draft.id || slugify(draft.name) })}>{saveLabel ?? 'Save Configuration'}</Button></div>
    </>}
    <Dialog open={attributePickerOpen} onOpenChange={setAttributePickerOpen}><DialogContent className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0">
      <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14"><DialogTitle>Add attribute to category</DialogTitle><DialogDescription>{attributePickerMode === 'existing' ? 'Choose a reusable field. You can mark it as required after adding it.' : 'Create a reusable field and assign it without leaving this category.'}</DialogDescription></DialogHeader>
      <div className="shrink-0 px-6 py-4"><div className="grid grid-cols-2 rounded-lg bg-muted p-1"><button type="button" onClick={() => setAttributePickerMode('existing')} className={cn('min-h-9 rounded-md px-3 text-sm font-medium', attributePickerMode === 'existing' && 'bg-background text-foreground shadow-sm')}>Choose existing</button><button type="button" onClick={() => setAttributePickerMode('create')} className={cn('min-h-9 rounded-md px-3 text-sm font-medium', attributePickerMode === 'create' && 'bg-background text-foreground shadow-sm')}>Create new</button></div></div>
      {attributePickerMode === 'existing' ? <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-4"><div className="relative shrink-0"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={attributeSearch} onChange={event => setAttributeSearch(event.target.value)} placeholder="Search name or field type..." className="pl-9" /></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">{availableAttributes.map(attribute => { const checked = pendingAttributeKeys.includes(attribute.key); return <label key={attribute.key} className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/40"><Checkbox checked={checked} onCheckedChange={value => setPendingAttributeKeys(current => value === true ? [...current, attribute.key] : current.filter(key => key !== attribute.key))} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{attribute.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{attribute.type}{attribute.description ? ` · ${attribute.description}` : ''}</p></div></label>; })}{availableAttributes.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center"><p className="text-sm font-semibold">No matching attributes</p><button type="button" className="mt-2 text-sm font-semibold text-primary hover:underline" onClick={() => { setNewAttribute(current => ({ ...current, name: attributeSearch })); setAttributePickerMode('create'); }}>Create “{attributeSearch || 'a new attribute'}”</button></div> : null}</div></div> : <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4 pr-8"><div className="grid gap-2"><Label htmlFor="inline-attribute-name">Attribute name <span className="text-destructive">*</span></Label><Input id="inline-attribute-name" autoFocus value={newAttribute.name} onChange={event => setNewAttribute({ ...newAttribute, name: event.target.value })} placeholder="e.g. Lens material" />{duplicateNewAttribute ? <p className="text-xs font-medium text-destructive">An attribute with this name already exists. Choose it from Existing instead.</p> : null}</div><div className="grid gap-2"><Label htmlFor="inline-attribute-description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="inline-attribute-description" rows={2} value={newAttribute.description} onChange={event => setNewAttribute({ ...newAttribute, description: event.target.value })} placeholder="Explain what this attribute captures." /></div><AttributePurposeSelector value={newAttribute.purpose} onChange={purpose => setNewAttribute(attributeForPurpose(newAttribute, purpose))} /><div className="grid gap-2"><Label htmlFor="inline-attribute-type">Field type <span className="text-destructive">*</span></Label><select id="inline-attribute-type" value={newAttribute.type} disabled={newAttribute.purpose === 'variant'} onChange={event => setNewAttribute(attributeForType(newAttribute, event.target.value))} className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:bg-muted/40"><option>Single-line text</option><option>Rich text</option><option>Number</option><option>Single select</option><option>Multi-select</option><option>Country selector</option><option>Measurement</option><option>Measurement set</option></select>{newAttribute.purpose === 'variant' ? <p className="text-xs text-muted-foreground">Variant attributes use a single set of values to create SKU combinations.</p> : null}</div>{newAttributeNeedsOptions ? <div className="grid gap-2"><div className="flex items-center gap-1"><Label htmlFor="inline-attribute-options">Options <span className="text-destructive">*</span></Label><FieldHelp label="Options">Each option becomes a separate value users can select in Product Master.</FieldHelp></div><AttributeOptionsEditor id="inline-attribute-options" value={newAttribute.options} onChange={options => setNewAttribute({ ...newAttribute, options })} /></div> : null}{['Measurement', 'Measurement set'].includes(newAttribute.type) ? <div className="grid gap-2"><Label htmlFor="inline-attribute-unit">Default unit <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="inline-attribute-unit" value={newAttribute.unit} onChange={event => setNewAttribute({ ...newAttribute, unit: event.target.value })} placeholder="e.g. cm, kg" /></div> : null}<AttributeValidationFields type={newAttribute.type} value={newAttribute.validation} onChange={validation => setNewAttribute({ ...newAttribute, validation })} />{newAttribute.type === 'Single-line text' || newAttribute.type === 'Rich text' ? <label className="flex items-center justify-between gap-4 rounded-lg border p-3"><div><p className="text-sm font-semibold">Translate per locale</p><p className="mt-1 text-xs text-muted-foreground">Allow a different value for each content language.</p></div><Switch checked={newAttribute.isLocalizable} onCheckedChange={checked => setNewAttribute({ ...newAttribute, isLocalizable: checked })} /></label> : null}<label className="flex items-center justify-between gap-4 rounded-lg border p-3"><div><p className="text-sm font-semibold">Required for this category</p><p className="mt-1 text-xs text-muted-foreground">Required before publishing a new Product Master revision. Drafts can be saved without a value.</p></div><Switch checked={newAttributeRequired} onCheckedChange={setNewAttributeRequired} /></label></div>}
      <DialogFooter className="shrink-0 border-t px-6 py-4"><Button type="button" variant="outline" onClick={() => setAttributePickerOpen(false)}>Cancel</Button>{attributePickerMode === 'existing' ? <Button type="button" disabled={!pendingAttributeKeys.length} onClick={addSelectedAttributes}>Add {pendingAttributeKeys.length || ''} {pendingAttributeKeys.length === 1 ? 'attribute' : 'attributes'}</Button> : <Button type="button" disabled={!newAttribute.name.trim() || !newAttribute.purpose || duplicateNewAttribute || !newAttributeOptionsValid} onClick={createAndAssignAttribute}>Create and add</Button>}</DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={Boolean(mappingChannel)} onOpenChange={open => !open && setMappingChannel(null)}><DialogContent className="max-w-xl p-0">
      <DialogHeader className="border-b px-6 py-5"><DialogTitle>{mappingChannel && mappingFor(mappingChannel) ? 'Replace category mapping' : mappingChannel && autoMappingSuggestion(mappingChannel, draft.name) ? 'Review auto-mapping suggestion' : 'Select marketplace category manually'}</DialogTitle><DialogDescription>{mappingChannel && autoMappingSuggestion(mappingChannel, draft.name) && !mappingFor(mappingChannel) ? `PrimeOS suggested the closest category for ${channelLabels.find(([key]) => key === mappingChannel)?.[1]}. Confirm it or choose another result.` : `Select the exact destination for ${mappingChannel ? channelLabels.find(([key]) => key === mappingChannel)?.[1] : 'this channel'}. Saving replaces the existing destination atomically; it never leaves the category unmapped.`}</DialogDescription></DialogHeader>
      <div className="space-y-3 px-6"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={mappingSearch} onChange={event => setMappingSearch(event.target.value)} placeholder="Search category name or ID..." className="pl-9" /></div><div className="max-h-72 space-y-2 overflow-y-auto">{mappingChannel ? suggestedChannelCategories(mappingChannel, draft.name).filter(option => `${option.externalCategoryPath.join(' ')} ${option.externalCategoryId}`.toLowerCase().includes(mappingSearch.toLowerCase())).map((option, index) => <button key={option.externalCategoryId} type="button" onClick={() => setPendingMapping({ ...option, matchMethod: index === 0 ? 'automatic' : 'manual' })} className={cn('flex w-full items-start gap-3 rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', pendingMapping?.externalCategoryId === option.externalCategoryId && 'border-primary bg-primary/5')}><span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border', pendingMapping?.externalCategoryId === option.externalCategoryId && 'border-primary')}><span className={cn('size-2 rounded-full', pendingMapping?.externalCategoryId === option.externalCategoryId && 'bg-primary')} /></span><span className="min-w-0"><span className="block text-sm font-semibold">{option.externalCategoryPath.join(' › ')}</span><span className="mt-1 block font-mono text-[11px] text-muted-foreground">{option.externalCategoryId} · {option.account} · {option.market}{index === 0 ? ` · ${option.confidence}% confidence` : ''}</span></span></button>) : null}</div></div>
      <DialogFooter className="border-t px-6 py-4"><Button type="button" variant="outline" onClick={() => setMappingChannel(null)}>Cancel</Button><Button type="button" disabled={!pendingMapping} onClick={saveMapping}>{mappingChannel && mappingFor(mappingChannel) && mappingUsageCount(mappingChannel) > 0 ? 'Continue to review' : mappingChannel && mappingFor(mappingChannel) ? 'Replace mapping' : mappingChannel && autoMappingSuggestion(mappingChannel, draft.name) ? 'Accept suggestion' : 'Save manual selection'}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={Boolean(mappingReview)} onOpenChange={open => !open && setMappingReview(null)}><DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
      <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14"><DialogTitle>Review mapping impact</DialogTitle><DialogDescription>Confirm how this replacement affects Product Masters and channel listings before changing the shared category mapping.</DialogDescription></DialogHeader>
      {mappingReview ? <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
        <section className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Current mapping</p><p className="mt-1 text-sm font-semibold">{mappingReview.current.externalCategoryPath.join(' › ')}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{mappingReview.current.externalCategoryId}</p></div><ChevronRight className="hidden size-5 text-muted-foreground sm:block" /><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-primary">New mapping</p><p className="mt-1 text-sm font-semibold">{mappingReview.target.externalCategoryPath.join(' › ')}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{mappingReview.target.externalCategoryId}</p></div></section>
        <section><h3 className="text-sm font-semibold">Affected data</h3><div className="mt-3 grid grid-cols-3 gap-3"><div className="rounded-lg border p-3"><p className="text-xl font-semibold tabular-nums">{reviewProductCount}</p><p className="mt-1 text-xs text-muted-foreground">Product Masters</p></div><div className="rounded-lg border p-3"><p className="text-xl font-semibold tabular-nums">{reviewListingCount}</p><p className="mt-1 text-xs text-muted-foreground">Active listings</p></div><div className={cn('rounded-lg border p-3', reviewIssueCount && 'border-amber-300/60 bg-amber-500/[0.06]')}><p className={cn('text-xl font-semibold tabular-nums', reviewIssueCount && 'text-amber-700')}>{reviewIssueCount}</p><p className="mt-1 text-xs text-muted-foreground">Need attention</p></div></div></section>
        <section className="space-y-3"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Validation results</h3><span className="text-xs text-muted-foreground">{reviewReadyCount}/{reviewProductCount} ready</span></div><div className="divide-y overflow-hidden rounded-xl border">{category?.linkedProducts.length ? category.linkedProducts.map((product, index) => { const needsAttention = reviewIssueCount > 0 && index === category.linkedProducts.length - 1; return <div key={product.id} className="flex items-center gap-3 p-3"><span className={cn('grid size-7 shrink-0 place-items-center rounded-full', needsAttention ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700')}>{needsAttention ? <CircleAlert className="size-4" /> : <Check className="size-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{product.name}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{product.sku}</p></div><span className={cn('shrink-0 text-xs font-semibold', needsAttention ? 'text-amber-700' : 'text-emerald-700')}>{needsAttention ? 'Missing channel fields' : 'Ready'}</span></div>; }) : <p className="p-5 text-center text-sm text-muted-foreground">No Product Masters are affected.</p>}</div></section>
        <div className={cn('flex items-start gap-3 rounded-xl border p-4', reviewIssueCount ? 'border-amber-300/60 bg-amber-500/[0.06]' : 'border-emerald-300/60 bg-emerald-500/[0.06]')}>{reviewIssueCount ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" /> : <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" />}<p className="text-xs leading-5 text-muted-foreground">{reviewIssueCount ? 'The current mapping remains active. Save this replacement as pending, then complete the missing channel fields before applying it.' : 'All affected data passed validation. Published listings keep serving normally while the new mapping is applied.'}</p></div>
      </div> : null}
      <DialogFooter className="shrink-0 border-t px-6 py-4"><Button type="button" variant="outline" onClick={() => { if (!mappingReview) return; setMappingChannel(mappingReview.channel); setPendingMapping(mappingReview.target); setMappingReview(null); }}>Back</Button>{reviewIssueCount ? <Button type="button" onClick={() => { toast({ title: 'Replacement saved as pending', description: 'The current mapping remains active until affected Product Masters pass validation.' }); setMappingReview(null); }}>Save as pending</Button> : <Button type="button" onClick={() => mappingReview && applyMapping(mappingReview.channel, mappingReview.target)}>Apply new mapping</Button>}</DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={Boolean(mappingLockChannel)} onOpenChange={open => { if (!open) { setMappingLockChannel(null); setShowAffectedMappingItems(false); } }}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Start a controlled remapping?</DialogTitle><DialogDescription>{mappingLockChannel ? channelLabels.find(([key]) => key === mappingLockChannel)?.[1] : 'This channel'} is already used by Product Masters and listings. The current mapping stays active until the replacement passes validation.</DialogDescription></DialogHeader>{mappingLockChannel ? <div className="space-y-3"><div className="rounded-lg border bg-muted/30 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Current mapping</p><p className="mt-1 text-sm font-semibold">{mappingFor(mappingLockChannel)?.externalCategoryPath.join(' › ')}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{mappingFor(mappingLockChannel)?.externalCategoryId}</p></div><div className="flex items-center justify-between rounded-lg border border-amber-300/60 bg-amber-500/[0.06] p-3 text-sm"><div><p className="font-semibold">{mappingUsageCount(mappingLockChannel)} Product Master{mappingUsageCount(mappingLockChannel) === 1 ? '' : 's'} · {activeListingUsageCount(mappingLockChannel)} active listing{activeListingUsageCount(mappingLockChannel) === 1 ? '' : 's'}</p><p className="mt-1 text-xs text-muted-foreground">Required attributes and active listings will be revalidated.</p></div><Button type="button" size="sm" variant="ghost" onClick={() => setShowAffectedMappingItems(current => !current)}>{showAffectedMappingItems ? 'Hide' : 'View items'}</Button></div>{showAffectedMappingItems ? <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">{category?.linkedProducts.length ? category.linkedProducts.map(product => <div key={product.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-xs"><span className="truncate font-medium">{product.name}</span><span className="shrink-0 font-mono text-muted-foreground">{product.sku}</span></div>) : <p className="p-3 text-center text-xs text-muted-foreground">No affected Product Masters.</p>}</div> : null}</div> : null}<DialogFooter><Button type="button" variant="outline" onClick={() => setMappingLockChannel(null)}>Cancel</Button><Button type="button" onClick={() => { if (!mappingLockChannel) return; const channel = mappingLockChannel; setMappingLockChannel(null); setShowAffectedMappingItems(false); openMappingPicker(channel); }}>Start remapping</Button></DialogFooter></DialogContent></Dialog>
  </SheetContent></Sheet>;
}

function BrandDetailsPanel({ value, productsCount, onChange }: { value: BrandDefinition; productsCount: number; onChange: (value: BrandDefinition) => void }) {
  return <TabsContent value="details" className="m-0 space-y-5">
    <section className="space-y-4"><div><h3 className="text-sm font-semibold">Canonical identity</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">This is the Brand name Product Masters reference across PrimeOS.</p></div><div className="grid gap-4 sm:grid-cols-[1fr_180px]"><div className="grid gap-2"><Label htmlFor="brand-name">Brand name</Label><Input id="brand-name" value={value.name} onChange={event => onChange({ ...value, name: event.target.value })} /></div><label className="grid gap-2 text-sm font-medium">Status<select className="h-10 rounded-md border bg-background px-3" value={value.status} onChange={event => onChange({ ...value, status: event.target.value as BrandDefinition['status'] })}><option>Active</option><option>Inactive</option></select></label></div></section>
    <section className="grid gap-4 border-t pt-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="brand-legal-name">Legal name</Label><Input id="brand-legal-name" value={value.legalName ?? value.manufacturer} onChange={event => onChange({ ...value, legalName: event.target.value, manufacturer: event.target.value })} /></div><div className="grid gap-2"><Label htmlFor="brand-country">Country</Label><Input id="brand-country" maxLength={2} value={value.country} onChange={event => onChange({ ...value, country: event.target.value.replace(/[^a-z]/gi, '').toUpperCase() })} placeholder="JP" className="uppercase" /></div><div className="grid gap-2 sm:col-span-2"><Label htmlFor="brand-website">Website</Label><Input id="brand-website" type="url" value={value.website} onChange={event => onChange({ ...value, website: event.target.value })} placeholder="https://" /></div><fieldset className="space-y-3 sm:col-span-2"><legend className="text-sm font-medium">Roles</legend><div className="grid gap-3 sm:grid-cols-3">{(['Brand', 'Manufacturer', 'Rights holder', 'Distributor', 'Reseller'] as const).map(role => { const roles = value.roles ?? ['Brand']; return <label key={role} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"><Checkbox checked={roles.includes(role)} onCheckedChange={checked => onChange({ ...value, roles: checked === true ? [...roles, role] : roles.filter(item => item !== role) })} />{role}</label>; })}</div></fieldset></section>
    <section className="space-y-3 border-t pt-5"><div><h3 className="text-sm font-semibold">Matching aliases</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Alternate names help imports and channels resolve to this canonical Brand.</p></div><Input id="brand-aliases" aria-label="Matching aliases" value={value.aliases.join(', ')} onChange={event => onChange({ ...value, aliases: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} placeholder="Add alternate names, separated by commas" /></section>
    <section className="border-t pt-5"><div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-4 py-3"><div><p className="text-xs font-semibold text-muted-foreground">System Brand code</p><p className="mt-1 font-mono text-sm">{value.code}</p></div><Badge variant="outline">{productsCount ? 'Locked' : 'Generated'}</Badge></div>{productsCount ? <p className="mt-2 text-xs text-muted-foreground">Locked because {productsCount} Product {productsCount === 1 ? 'Master uses' : 'Masters use'} this Brand.</p> : null}</section>
  </TabsContent>;
}

function BrandConfigurationDrawer({ open, creating, tab, onTabChange, value, brands, products, onChange, onClose, onSave }: { open: boolean; creating: boolean; tab: BrandDrawerTab; onTabChange: (tab: BrandDrawerTab) => void; value: BrandDefinition; brands: BrandDefinition[]; products: Array<{ id: string; name: string; sku_code: string }>; onChange: (value: BrandDefinition) => void; onClose: () => void; onSave: () => void }) {
  const duplicateBrand = creating && Boolean(value.name.trim()) && brands.some(brand => brand.name.trim().toLowerCase() === value.name.trim().toLowerCase());
  const roles: NonNullable<BrandDefinition['roles']> = value.roles?.length ? value.roles : ['Brand'];
  const invalidWebsite = Boolean(value.website.trim()) && !/^https?:\/\/[^\s]+$/i.test(value.website.trim());
  const roleOptions: NonNullable<BrandDefinition['roles']> = ['Brand', 'Manufacturer', 'Rights holder', 'Distributor', 'Reseller'];

  return <Sheet open={open} onOpenChange={next => !next && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[720px]"><SheetHeader className="border-b border-border px-6 py-5"><SheetTitle>{creating ? 'New brand' : value.name}</SheetTitle><SheetDescription>{creating ? 'Create a shared brand for your products. You can use it as soon as it is saved.' : 'Manage the canonical identity, Product Master usage and marketplace mappings.'}</SheetDescription></SheetHeader>
    {creating ? <><div className="flex-1 overflow-y-auto p-6"><div className="grid gap-5 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor="brand-name">Canonical name <span className="text-destructive">*</span></Label><Input id="brand-name" autoFocus aria-invalid={duplicateBrand} value={value.name} onChange={event => onChange({ ...value, name: event.target.value, code: slugify(event.target.value).replace(/-/g, '_').toUpperCase() })} placeholder="e.g. Cyber Records" />{duplicateBrand ? <p className="text-xs font-medium text-destructive">A brand with this name already exists. Select or edit the existing Brand instead.</p> : null}</div>
      <div className="grid gap-2"><Label htmlFor="brand-legal-name">Legal name</Label><Input id="brand-legal-name" value={value.legalName ?? value.manufacturer} onChange={event => onChange({ ...value, legalName: event.target.value, manufacturer: event.target.value })} placeholder="e.g. Cyber Records Co., Ltd." /></div>
      <div className="grid gap-2"><Label htmlFor="brand-country">Country</Label><Input id="brand-country" value={value.country} maxLength={2} onChange={event => onChange({ ...value, country: event.target.value.replace(/[^a-z]/gi, '').toUpperCase() })} placeholder="JP" className="uppercase" /><p className="text-xs text-muted-foreground">ISO 2-letter country code</p></div>
      <div className="grid gap-2"><Label htmlFor="brand-website">Website</Label><Input id="brand-website" type="url" aria-invalid={invalidWebsite} value={value.website} onChange={event => onChange({ ...value, website: event.target.value })} placeholder="https://" />{invalidWebsite ? <p className="text-xs font-medium text-destructive">Enter a complete URL starting with http:// or https://</p> : null}</div>
      <fieldset className="space-y-3 sm:col-span-2"><legend className="text-sm font-medium">Roles</legend><div className="grid gap-3 sm:grid-cols-3">{roleOptions.map(role => <label key={role} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"><Checkbox checked={roles.includes(role)} onCheckedChange={checked => onChange({ ...value, roles: checked === true ? [...roles, role] : roles.filter(item => item !== role) })} /><span>{role}</span></label>)}</div>{roles.length === 0 ? <p className="text-xs font-medium text-destructive">Select at least one role.</p> : null}</fieldset>
      <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground sm:col-span-2">Available for Product Master immediately. Any marketplace approval requirements are handled separately for each listing.</div>
    </div></div><div className="grid shrink-0 grid-cols-2 gap-3 border-t bg-background p-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={!value.name.trim() || duplicateBrand || invalidWebsite || roles.length === 0}>Save</Button></div></> : <><Tabs value={tab} onValueChange={next => onTabChange(next as BrandDrawerTab)} className="flex min-h-0 flex-1 flex-col"><TabsList className="h-auto w-full justify-start rounded-none border-b bg-background px-4 py-0"><TabsTrigger value="details" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Details</TabsTrigger><TabsTrigger value="usage" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Product usage <Badge variant="secondary" className="ml-1.5">{products.length}</Badge></TabsTrigger><TabsTrigger value="mapping" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Channel mapping</TabsTrigger></TabsList><div className="flex-1 overflow-y-auto p-6"><BrandDetailsPanel value={value} productsCount={products.length} onChange={onChange} /><TabsContent value="usage" className="m-0 space-y-3">{products.length ? products.map(product => <div key={product.id} className="rounded-xl border p-4"><p className="text-sm font-semibold">{product.name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku_code}</p></div>) : <div className="rounded-xl border border-dashed p-8 text-center"><p className="text-sm font-semibold">No Product Masters use this brand</p><p className="mt-1 text-xs text-muted-foreground">It can be safely renamed or removed from the catalog.</p></div>}</TabsContent><TabsContent value="mapping" className="m-0"><BrandChannelMappings value={value} onChange={onChange} /></TabsContent></div></Tabs><div className="flex shrink-0 justify-end gap-2 border-t bg-background p-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={!value.name.trim() || !value.code.trim()}>Save changes</Button></div></>}
  </SheetContent></Sheet>;
}

function AttributeConfigurationDrawer({ open, creating, value, groups, usage, onChange, onClose, onSave, saveLabel }: { open: boolean; creating: boolean; value: AttributeDefinition; groups: CatalogAttributeGroup[]; usage: AttributeUsageItem[]; onChange: (value: AttributeDefinition) => void; onClose: () => void; onSave: () => void; saveLabel?: string }) {
  const needsOptions = value.type === 'Single select' || value.type === 'Multi-select';
  const needsUnit = value.type === 'Measurement' || value.type === 'Measurement set';
  const definitionLocked = !creating && usage.length > 0;
  const optionItems = value.options.split(',').map(option => option.trim()).filter(Boolean);
  const normalizedOptionItems = optionItems.map(option => option.toLowerCase());
  const hasDuplicateOptions = new Set(normalizedOptionItems).size !== normalizedOptionItems.length;
  const optionError = needsOptions && optionItems.length === 0
    ? 'Add at least one option for this field type.'
    : needsOptions && hasDuplicateOptions
      ? 'Remove duplicate options before saving.'
      : '';
  const definitionForm = <div className="space-y-5">
    {!creating && usage.length > 0 ? <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-500/[0.06] p-4"><CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" /><div><p className="text-sm font-semibold">Changes affect {usage.length} {usage.length === 1 ? 'category' : 'categories'}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Name, description, values and validation are shared. Field type stays locked while this attribute is in use.</p></div></div> : null}
    <div className="grid gap-2"><Label htmlFor="attribute-name">Attribute name <span className="text-destructive">*</span></Label><Input id="attribute-name" autoFocus value={value.name} onChange={event => onChange({ ...value, name: event.target.value, key: creating ? slugify(event.target.value).replace(/-/g, '_') : value.key })} placeholder="e.g. Material" /></div>
    <div className="grid gap-2"><Label htmlFor="attribute-description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="attribute-description" rows={2} value={value.description} onChange={event => onChange({ ...value, description: event.target.value })} placeholder="Explain what this attribute captures." /></div>
    <AttributeGroupSelector value={value.groupId} groups={groups} onChange={groupId => { const group = groups.find(item => item.id === groupId); if (!group) return; const next = definitionLocked ? { ...value, purpose: group.purpose } : attributeForPurpose(value, group.purpose); onChange({ ...next, groupId }); }} />
    <div className="grid gap-2"><div className="flex items-center gap-1"><Label htmlFor="attribute-field-type">Field type <span className="text-destructive">*</span></Label><FieldHelp label="Field type">Controls how users enter this value in Product Master. Choose text, select, number or measurement based on the data you need to capture.</FieldHelp></div>{definitionLocked ? <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-muted/30 px-3"><span className="text-sm font-medium">{value.type}</span><span className="text-xs text-muted-foreground">Locked · used by {usage.length} {usage.length === 1 ? 'category' : 'categories'}</span></div> : <select id="attribute-field-type" value={value.type} disabled={value.purpose === 'variant'} onChange={event => onChange(attributeForType(value, event.target.value))} className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:bg-muted/40"><option>Single-line text</option><option>Rich text</option><option>Number</option><option>Single select</option><option>Multi-select</option><option>Country selector</option><option>Measurement</option><option>Measurement set</option></select>}{value.purpose === 'variant' ? <p className="text-xs text-muted-foreground">Variant attributes use a single set of values to create SKU combinations.</p> : null}</div>
    {needsOptions ? <div className="grid gap-2"><div className="flex items-center gap-1"><Label htmlFor="attribute-options">Options <span className="text-destructive">*</span></Label><FieldHelp label="Options">Each option becomes a separate value users can select in Product Master. Single-select allows one value; multi-select allows several.</FieldHelp></div><AttributeOptionsEditor id="attribute-options" value={value.options} onChange={options => onChange({ ...value, options })} />{optionError ? <p id="attribute-options-error" className="text-xs font-medium text-destructive">{optionError}</p> : null}</div> : null}
    {needsUnit ? <div className="grid gap-2"><Label htmlFor="attribute-unit">Default unit</Label><Input id="attribute-unit" value={value.unit} onChange={event => onChange({ ...value, unit: event.target.value })} placeholder="e.g. cm, kg, ml" /></div> : null}
    <AttributeValidationFields type={value.type} value={value.validation} onChange={validation => onChange({ ...value, validation })} />
    {value.type === 'Single-line text' || value.type === 'Rich text' ? <label className="flex items-center justify-between gap-4 rounded-xl border p-4"><div><p className="text-sm font-semibold">Translate per locale</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Allow a different value for each content language.</p></div><Switch checked={value.isLocalizable} onCheckedChange={checked => onChange({ ...value, isLocalizable: checked })} /></label> : null}

  </div>;

  return <Sheet open={open} onOpenChange={nextOpen => !nextOpen && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[600px]">
    <SheetHeader className="border-b border-slate-200 px-6 py-5"><SheetTitle>{creating ? 'Add Attribute' : value.name}</SheetTitle><SheetDescription>{creating ? 'Create a reusable field for Product Master.' : 'Manage its values, rules and category usage.'}</SheetDescription></SheetHeader>
    {creating ? <div className="flex-1 overflow-y-auto p-6 pb-28">{definitionForm}</div> : <Tabs defaultValue="definition" className="flex min-h-0 flex-1 flex-col">
      <TabsList className="h-auto w-full justify-start rounded-none border-b bg-background px-4 py-0">
        <TabsTrigger value="definition" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Definition</TabsTrigger>
        <TabsTrigger value="usage" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Usage <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-[10px]">{usage.length}</Badge></TabsTrigger>
      </TabsList>
      <div className="flex-1 overflow-y-auto p-6 pb-28">
        <TabsContent value="definition" className="m-0">{definitionForm}</TabsContent>
        <TabsContent value="usage" className="m-0 space-y-4"><div><h3 className="text-sm font-semibold">Category usage</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Open a category to assign this attribute or change whether it is required.</p></div>{usage.length ? <div className="divide-y rounded-xl border">{usage.map(item => <div key={item.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.path}</p></div><Badge variant="outline" className={cn('shrink-0', item.required && 'border-primary/30 bg-primary/5 text-primary')}>{item.required ? 'Required' : 'Optional'}</Badge></div>)}</div> : <div className="rounded-xl border border-dashed p-6 text-center"><p className="text-sm font-semibold">Not assigned yet</p><p className="mt-1 text-xs leading-5 text-muted-foreground">This attribute is safe to edit or delete because no category uses it.</p></div>}</TabsContent>
      </div>
    </Tabs>}
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={!value.name.trim() || !value.key.trim() || !value.purpose || !value.groupId || Boolean(optionError)}>{saveLabel ?? (creating ? 'Create Attribute' : 'Save Attribute')}</Button></div>
  </SheetContent></Sheet>;
}

function CategoryConfigurationDrawer({ open, category, creating, tab, onTabChange, onClose, onSave }: { open: boolean; category: CategoryRow | null; creating: boolean; tab: DrawerTab; onTabChange: (tab: DrawerTab) => void; onClose: () => void; onSave: () => void }) {
  const name = creating ? '' : category?.category ?? '';
  const group = creating ? 'None (root category)' : category?.path ?? 'Root';
  const availableAttributes = ['Brand', 'Material', 'Color', 'Size', 'Dimensions', 'Care instructions', 'Country of origin', 'Warranty'];

  return <Sheet open={open} onOpenChange={value => !value && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[650px]">
    <SheetHeader className="border-b border-slate-200 px-6 py-5"><SheetTitle>{creating ? 'Add Category' : 'Configure Category'}</SheetTitle><SheetDescription>{creating ? 'Create a category and define the product information it requires.' : category?.path}</SheetDescription></SheetHeader>
    <Tabs value={tab} onValueChange={value => onTabChange(value as DrawerTab)} className="flex min-h-0 flex-1 flex-col">
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-white px-4 py-0">
        <TabsTrigger value="general" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">General & Sub-categories</TabsTrigger>
        <TabsTrigger value="attributes" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Attributes</TabsTrigger>
        <TabsTrigger value="mapping" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Marketplace Mapping</TabsTrigger>
      </TabsList>
      <div className="flex-1 overflow-y-auto p-6 pb-28">
        <TabsContent value="general" className="m-0 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-slate-700">Parent Category<select defaultValue={group} className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"><option>None (root category)</option><option>Fashion</option><option>Electronics</option><option>Lifestyle</option><option>Personal Care</option></select></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Status<select defaultValue={category?.status ?? 'Active'} className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"><option>Active</option><option>Inactive</option></select></label></div><div className="grid gap-2"><Label htmlFor="category-name">Category Name</Label><Input id="category-name" defaultValue={name} placeholder="e.g. Art Supplies" /></div><div className="grid gap-2"><Label htmlFor="category-slug">Slug</Label><Input id="category-slug" defaultValue={slugify(name)} placeholder="art-supplies" className="font-mono" /></div><div className="grid gap-2"><Label htmlFor="category-description">Description</Label><Textarea id="category-description" rows={4} placeholder="Describe which products belong in this category..." /></div><section className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">Sub-categories</h3><p className="mt-1 text-xs text-slate-500">Create child nodes under this master category.</p></div><Button variant="outline" size="sm"><Plus className="size-4" />Add Sub-category</Button></div><div className="mt-4 rounded-lg border border-dashed p-4 text-center text-xs text-slate-500">No sub-categories configured yet.</div></section></TabsContent>

        <TabsContent value="attributes" className="m-0 space-y-5"><div><h3 className="text-sm font-semibold text-slate-900">Product Attributes</h3><p className="mt-1 text-xs leading-5 text-slate-500">Assign reusable fields, then decide which ones every product in this category must complete.</p></div><div className="space-y-2">{availableAttributes.map((attribute, index) => { const assigned = category?.attributes.includes(attribute) ?? index < 2; return <div key={attribute} className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 p-3"><Checkbox defaultChecked={assigned} aria-label={`Assign ${attribute}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{attribute}</p><p className="mt-1 text-xs text-slate-500">Reusable product attribute</p></div><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Switch defaultChecked={assigned && index < 4} aria-label={`Make ${attribute} mandatory`} />Required</label></div>; })}</div></TabsContent>

        <TabsContent value="mapping" className="m-0 space-y-5"><div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-sm font-semibold text-slate-900">Auto-recommendation available</p><p className="mt-1 text-xs leading-5 text-slate-600">Prime OS matched this taxonomy path against connected marketplace category trees. Review each recommendation before saving.</p></div></div></div><div className="space-y-3">{[
          ['Shopee', '100630 — Hobbies & Stationery > Art Supplies', '96% match'],
          ['TikTok Shop', '601492 — Office & School Supplies > Art', '91% match'],
          ['Lazada', '10100342 — Stationery & Craft > Drawing', '88% match'],
          ['Amazon', '2617941011 — Arts, Crafts & Sewing', '84% match'],
        ].map(([marketplace, recommendation, confidence]) => <section key={marketplace} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /><h3 className="text-sm font-semibold text-slate-900">{marketplace}</h3></div><Badge variant="outline" className="text-emerald-700">{confidence}</Badge></div><label className="grid gap-2 text-xs font-semibold text-slate-500">Marketplace Category<select defaultValue={recommendation} className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal text-slate-800"><option>{recommendation}</option><option>Search category tree manually...</option><option>Leave unmapped</option></select></label><p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700"><Check className="size-3.5" />Recommended from master category and product attributes</p></section>)}</div><div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800"><CircleAlert className="mt-0.5 size-4 shrink-0" />Changing mappings may trigger attribute revalidation for already published products.</div></TabsContent>
      </div>
    </Tabs>
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave}>{creating ? 'Create Category' : 'Save Configuration'}</Button></div>
  </SheetContent></Sheet>;
}
