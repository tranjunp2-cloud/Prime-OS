import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Award, Check, ChevronRight, CircleAlert, FolderTree, Layers3, Plus, Search,
  Sparkles, Tags,
} from 'lucide-react';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getProducts } from '@/lib/product-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  getProductCatalogSettings, saveProductCatalogSettings,
  type CatalogAttribute as AttributeDefinition,
  type CatalogBrand as BrandDefinition,
  type CatalogCategory,
  type CatalogChannel,
  type ReviewStatus as MappingStatus,
} from '@/lib/product-catalog-settings-store';

type ViewTab = 'categories' | 'attributes' | 'brands';
type DrawerTab = 'general' | 'attributes' | 'mapping';
interface CategoryRow {
  id: string;
  category: string;
  group: string;
  productCount: number;
  attributes: string[];
  status: 'Active' | 'Inactive';
  source: 'internal' | 'imported';
  mappings: Record<CatalogChannel, MappingStatus>;
}

const channelLabels: Array<[CatalogChannel, string]> = [
  ['webstore', 'PrimeWeb'], ['pos', 'PrimePOS'], ['shopee', 'Shopee'], ['lazada', 'Lazada'],
  ['tiktok', 'TikTok Shop'], ['amazon', 'Amazon'], ['rakuten', 'Rakuten'], ['social', 'Social Inbox'],
] as const;

const blankAttribute: AttributeDefinition = {
  id: '', name: '', key: '', type: 'Single-line text', categories: 0, description: '', options: '', unit: '', validation: '', status: 'Active', source: 'internal',
};
const blankBrand: BrandDefinition = { id: '', name: '', code: '', manufacturer: '', country: '', website: '', productCount: 0, status: 'Unverified', source: 'internal', aliases: [], mappings: {} };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function ProductCategories() {
  const { toast } = useToast();
  const { pathname } = useLocation();
  const viewTab: ViewTab = pathname.endsWith('/attributes') ? 'attributes' : pathname.endsWith('/brands') ? 'brands' : 'categories';
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('general');
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const initialSettings = useMemo(() => getProductCatalogSettings(), []);
  const [categories, setCategories] = useState<CatalogCategory[]>(initialSettings.categories);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>(initialSettings.attributes);
  const [attributeDrawerOpen, setAttributeDrawerOpen] = useState(false);
  const [attributeDraft, setAttributeDraft] = useState<AttributeDefinition>(blankAttribute);
  const [isCreatingAttribute, setIsCreatingAttribute] = useState(false);
  const [brands, setBrands] = useState<BrandDefinition[]>(initialSettings.brands);
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [brandDraft, setBrandDraft] = useState<BrandDefinition>(blankBrand);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const products = getProducts();

  useEffect(() => { saveProductCatalogSettings({ categories, attributes, brands }); }, [categories, attributes, brands]);

  const rows = useMemo<CategoryRow[]>(() => {
    const counts = new Map<string, number>();
    products.forEach(product => counts.set(product.category || 'Uncategorized', (counts.get(product.category || 'Uncategorized') ?? 0) + 1));
    return categories.map((category) => {
      return {
        id: category.id,
        category: category.name,
        group: category.group,
        productCount: counts.get(category.name) ?? 0,
        attributes: category.attributes.map(assignment => attributes.find(item => item.key === assignment.key)?.name).filter(Boolean) as string[],
        status: category.status,
        source: category.source,
        mappings: category.mappings,
      };
    }).filter(row => `${row.group} ${row.category} ${row.attributes.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => a.group.localeCompare(b.group) || a.category.localeCompare(b.category));
  }, [products, search, categories, attributes]);

  const filteredAttributes = attributes.filter(attribute => `${attribute.name} ${attribute.type} ${attribute.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  const filteredBrands = brands.filter(brand => `${brand.name} ${brand.code} ${brand.manufacturer} ${brand.country}`.toLowerCase().includes(search.trim().toLowerCase()));

  function openCategory(row: CategoryRow) {
    setSelectedCategory(row);
    setIsCreating(false);
    setDrawerTab('general');
    setDrawerOpen(true);
  }

  function createCategory() {
    setSelectedCategory(null);
    setIsCreating(true);
    setDrawerTab('general');
    setDrawerOpen(true);
  }

  function createAttribute() {
    setAttributeDraft(blankAttribute);
    setIsCreatingAttribute(true);
    setAttributeDrawerOpen(true);
  }

  function editAttribute(attribute: AttributeDefinition) {
    setAttributeDraft(attribute);
    setIsCreatingAttribute(false);
    setAttributeDrawerOpen(true);
  }

  function saveAttribute(attribute: AttributeDefinition) {
    const normalized = {
      ...attribute,
      id: attribute.id || slugify(attribute.key || attribute.name),
      key: attribute.key || slugify(attribute.name).replace(/-/g, '_'),
    };
    setAttributes(current => isCreatingAttribute
      ? [...current, normalized]
      : current.map(item => item.id === normalized.id ? normalized : item));
    toast({ title: isCreatingAttribute ? 'Attribute created' : 'Attribute updated', description: `${normalized.name} is ready to assign to product categories.` });
    setAttributeDrawerOpen(false);
  }

  function createBrand() { setBrandDraft(blankBrand); setIsCreatingBrand(true); setBrandDrawerOpen(true); }
  function editBrand(brand: BrandDefinition) { setBrandDraft(brand); setIsCreatingBrand(false); setBrandDrawerOpen(true); }
  function saveBrand(brand: BrandDefinition) {
    const normalized = { ...brand, id: brand.id || slugify(brand.name), code: brand.code.trim().toUpperCase() };
    setBrands(current => isCreatingBrand ? [...current, normalized] : current.map(item => item.id === normalized.id ? normalized : item));
    toast({ title: isCreatingBrand ? 'Brand created' : 'Brand updated', description: `${normalized.name} is available for Product Master selection.` });
    setBrandDrawerOpen(false);
  }

  const pageMeta = viewTab === 'categories'
    ? { title: 'Categories', description: 'Manage the master taxonomy, required attributes and marketplace category mappings.', icon: FolderTree, action: 'Add Category' }
    : viewTab === 'attributes'
      ? { title: 'Attributes', description: 'Maintain reusable product fields, allowed values and validation rules.', icon: Layers3, action: 'Add Attribute' }
      : { title: 'Brands', description: 'Maintain canonical product brands and map them to marketplace brand identifiers.', icon: Award, action: 'Add Brand' };

  return <div className="space-y-5 p-4 md:p-6">
    <WorkspacePageHeader
      title={pageMeta.title}
      description={pageMeta.description}
      icon={pageMeta.icon}
      actions={<Button onClick={viewTab === 'categories' ? createCategory : viewTab === 'attributes' ? createAttribute : createBrand}><Plus className="size-4" />{pageMeta.action}</Button>}
    />

    <Tabs value={viewTab}>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div className="relative max-w-xl flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder={viewTab === 'categories' ? 'Search category paths or required attributes...' : viewTab === 'attributes' ? 'Search global attribute definitions...' : 'Search brand, code, manufacturer or country...'} className="pl-9" /></div>
          <p className="text-xs text-slate-500">{viewTab === 'categories' ? `${rows.length} categories` : viewTab === 'attributes' ? `${filteredAttributes.length} reusable attributes` : `${filteredBrands.length} brands`}</p>
        </div>

        <TabsContent value="categories" className="m-0">
          <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70"><tr>{['CATEGORY PATH', 'PRODUCTS COUNT', 'REQUIRED ATTRIBUTES', 'CHANNEL CATEGORY MAPPING', 'STATUS', 'ACTIONS'].map(label => <th key={label} className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-slate-500', label === 'ACTIONS' && 'text-right')}>{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id} tabIndex={0} onClick={() => openCategory(row)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCategory(row); } }} className="cursor-pointer transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FolderTree className="size-4" /></span><div><p className="text-xs font-medium text-slate-500">{row.group} <span className="mx-1">›</span></p><div className="mt-0.5 flex items-center gap-2"><p className="text-sm font-semibold text-slate-900">{row.category}</p><Badge variant="outline" className="h-5 text-[10px]">{row.source === 'internal' ? 'Internal' : 'Imported'}</Badge></div></div></div></td>
              <td className="px-4 py-3 text-sm font-semibold tabular-nums text-slate-700">{row.productCount}</td>
              <td className="px-4 py-3"><div className="flex max-w-[330px] flex-wrap gap-1.5">{row.attributes.slice(0, 4).map(attribute => <Badge key={attribute} variant="outline" className="font-medium">{attribute}</Badge>)}{row.attributes.length > 4 ? <Popover><PopoverTrigger asChild><button type="button" onClick={event => event.stopPropagation()} className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100">+{row.attributes.length - 4} more</button></PopoverTrigger><PopoverContent align="start" className="w-64 p-3"><p className="mb-2 text-xs font-semibold text-slate-900">All required attributes</p><div className="flex flex-wrap gap-1.5">{row.attributes.map(attribute => <Badge key={attribute} variant="outline">{attribute}</Badge>)}</div></PopoverContent></Popover> : null}</div></td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{channelLabels.slice(0, 3).map(([key, label]) => <span key={key} className={cn('inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold', row.mappings[key] === 'mapped' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : row.mappings[key] === 'needs_review' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-500')}><span className={cn('size-2 rounded-full', row.mappings[key] === 'mapped' ? 'bg-emerald-500' : row.mappings[key] === 'needs_review' ? 'bg-amber-400' : 'bg-slate-400')} />{label} · {row.mappings[key] === 'mapped' ? 'Mapped' : row.mappings[key] === 'needs_review' ? 'Review' : 'N/A'}</span>)}<Popover><PopoverTrigger asChild><button type="button" onClick={event => event.stopPropagation()} className="inline-flex min-h-7 items-center rounded-md border px-2 text-[11px] font-semibold hover:bg-muted">+{channelLabels.length - 3} channels</button></PopoverTrigger><PopoverContent align="start" className="w-72 p-3"><p className="mb-2 text-xs font-semibold">All channel mappings</p><div className="space-y-2">{channelLabels.map(([key, label]) => <div key={key} className="flex items-center justify-between gap-3 text-xs"><span>{label}</span><span className={cn('font-semibold', row.mappings[key] === 'mapped' ? 'text-emerald-700' : row.mappings[key] === 'needs_review' ? 'text-amber-700' : 'text-muted-foreground')}>{row.mappings[key] === 'mapped' ? 'Mapped' : row.mappings[key] === 'needs_review' ? 'Needs review' : 'Not required'}</span></div>)}</div></PopoverContent></Popover></div></td>
              <td className="px-4 py-3"><Badge className={row.status === 'Active' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}>{row.status}</Badge></td>
              <td className="px-4 py-3"><div className="flex justify-end"><Button type="button" variant="outline" size="sm" onClick={event => { event.stopPropagation(); openCategory(row); }}>Configure<ChevronRight className="size-4" /></Button></div></td>
            </tr>)}</tbody>
          </table></div>
          {rows.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No categories or attributes match this search.</div> : null}
        </TabsContent>

        <TabsContent value="attributes" className="m-0">
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70"><tr>{['ATTRIBUTE', 'FIELD TYPE', 'USED IN', 'STATUS', 'ACTIONS'].map(label => <th key={label} className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-slate-500', label === 'ACTIONS' && 'text-right')}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredAttributes.map(attribute => <tr key={attribute.id} tabIndex={0} onClick={() => editAttribute(attribute)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); editAttribute(attribute); } }} className="cursor-pointer transition-colors hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><td className="px-4 py-3"><p className="text-sm font-semibold text-slate-900">{attribute.name}</p><p className="mt-1 max-w-md text-xs text-slate-500">{attribute.description}</p></td><td className="px-4 py-3 text-sm text-slate-700">{attribute.type}</td><td className="px-4 py-3 text-sm text-slate-700"><span className="font-semibold tabular-nums">{attribute.categories}</span> categories</td><td className="px-4 py-3"><span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', attribute.status === 'Active' ? 'text-emerald-700' : 'text-slate-500')}><span className={cn('size-2 rounded-full', attribute.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400')} />{attribute.status}</span></td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={event => { event.stopPropagation(); editAttribute(attribute); }}>Edit<ChevronRight className="size-4" /></Button></td></tr>)}</tbody></table></div>
          {filteredAttributes.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No attributes match this search.</div> : null}
        </TabsContent>

        <TabsContent value="brands" className="m-0">
          <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70"><tr>{['BRAND', 'SOURCE', 'MANUFACTURER', 'COUNTRY', 'PRODUCTS', 'CHANNEL MAPPING', 'STATUS', 'ACTIONS'].map(label => <th key={label} className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-slate-500', label === 'ACTIONS' && 'text-right')}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredBrands.map(brand => <tr key={brand.id} tabIndex={0} onClick={() => editBrand(brand)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); editBrand(brand); } }} className="cursor-pointer hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 font-bold text-primary">{brand.name.slice(0, 1)}</span><div><p className="text-sm font-semibold text-slate-900">{brand.name}</p><p className="mt-0.5 font-mono text-xs text-slate-500">{brand.code}</p></div></div></td><td className="px-4 py-3"><Badge variant="outline">{brand.source === 'internal' ? 'Internal' : 'Imported'}</Badge></td><td className="px-4 py-3 text-sm text-slate-700">{brand.manufacturer || '—'}</td><td className="px-4 py-3 text-sm text-slate-700">{brand.country || '—'}</td><td className="px-4 py-3 text-sm font-semibold tabular-nums">{brand.productCount}</td><td className="px-4 py-3"><div className="flex gap-1.5">{([['AMZ', brand.mappings.amazon], ['SHP', brand.mappings.shopee], ['LAZ', brand.mappings.lazada]] as const).map(([label, value]) => <Badge key={label} variant="outline" className={value ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'text-slate-400'}>{label} {value ? 'Mapped' : '—'}</Badge>)}</div></td><td className="px-4 py-3"><Badge className={brand.status === 'Verified' ? 'bg-emerald-50 text-emerald-700' : brand.status === 'Inactive' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}>{brand.status}</Badge></td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={event => { event.stopPropagation(); editBrand(brand); }}>Edit<ChevronRight className="size-4" /></Button></td></tr>)}</tbody></table></div>
          {filteredBrands.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No brands match this search.</div> : null}
        </TabsContent>
      </div>
    </Tabs>

    <ManagedCategoryConfigurationDrawer open={drawerOpen} category={selectedCategory} creating={isCreating} tab={drawerTab} attributes={attributes} onTabChange={setDrawerTab} onClose={() => setDrawerOpen(false)} onSave={(nextCategory) => { setCategories(current => isCreating ? [...current, nextCategory] : current.map(item => item.id === nextCategory.id ? nextCategory : item)); toast({ title: isCreating ? 'Category created' : 'Category configuration saved', description: `${nextCategory.name} is ready for Product Master selection.` }); setDrawerOpen(false); }} />
    <AttributeConfigurationDrawer open={attributeDrawerOpen} creating={isCreatingAttribute} value={attributeDraft} onChange={setAttributeDraft} onClose={() => setAttributeDrawerOpen(false)} onSave={() => saveAttribute(attributeDraft)} />
    <BrandConfigurationDrawer open={brandDrawerOpen} creating={isCreatingBrand} value={brandDraft} onChange={setBrandDraft} onClose={() => setBrandDrawerOpen(false)} onSave={() => saveBrand(brandDraft)} />
  </div>;
}

function ManagedCategoryConfigurationDrawer({ open, category, creating, tab, attributes, onTabChange, onClose, onSave }: { open: boolean; category: CategoryRow | null; creating: boolean; tab: DrawerTab; attributes: AttributeDefinition[]; onTabChange: (tab: DrawerTab) => void; onClose: () => void; onSave: (category: CatalogCategory) => void }) {
  const emptyMappings = Object.fromEntries(channelLabels.map(([key]) => [key, key === 'webstore' ? 'mapped' : key === 'pos' || key === 'social' ? 'not_required' : 'needs_review'])) as Record<CatalogChannel, MappingStatus>;
  const [draft, setDraft] = useState<CatalogCategory>({ id: '', name: '', group: 'Lifestyle', parent: 'None (root category)', description: '', status: 'Active', source: 'internal', attributes: [], mappings: emptyMappings });

  useEffect(() => {
    if (!open) return;
    setDraft(category ? {
      id: category.id, name: category.category, group: category.group, parent: category.group,
      description: '', status: category.status, source: category.source,
      attributes: attributes.filter(item => category.attributes.includes(item.name)).map(item => ({ key: item.key, required: true })),
      mappings: category.mappings,
    } : { id: '', name: '', group: 'Lifestyle', parent: 'None (root category)', description: '', status: 'Active', source: 'internal', attributes: [], mappings: emptyMappings });
  }, [open, category, attributes]);

  function toggleAttribute(key: string, checked: boolean) {
    setDraft(current => ({ ...current, attributes: checked ? [...current.attributes, { key, required: false }] : current.attributes.filter(item => item.key !== key) }));
  }

  function toggleRequired(key: string, required: boolean) {
    setDraft(current => ({ ...current, attributes: current.attributes.map(item => item.key === key ? { ...item, required } : item) }));
  }

  return <Sheet open={open} onOpenChange={next => !next && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[650px]">
    <SheetHeader className="border-b border-border px-6 py-5"><SheetTitle>{creating ? 'Add Category' : 'Configure Category'}</SheetTitle><SheetDescription>Maintain the internal taxonomy first, then review mappings imported from each channel.</SheetDescription></SheetHeader>
    <Tabs value={tab} onValueChange={value => onTabChange(value as DrawerTab)} className="flex min-h-0 flex-1 flex-col">
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-background px-4 py-0">
        <TabsTrigger value="general" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">General</TabsTrigger>
        <TabsTrigger value="attributes" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Attributes</TabsTrigger>
        <TabsTrigger value="mapping" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Channel mapping</TabsTrigger>
      </TabsList>
      <div className="flex-1 overflow-y-auto p-6 pb-28">
        <TabsContent value="general" className="m-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Group<select value={draft.group} onChange={event => setDraft({ ...draft, group: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 font-normal"><option>Fashion</option><option>Electronics</option><option>Lifestyle</option><option>Personal Care</option></select></label><label className="grid gap-2 text-sm font-medium">Status<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as CatalogCategory['status'] })} className="h-10 rounded-md border border-input bg-background px-3 font-normal"><option>Active</option><option>Inactive</option></select></label></div>
          <div className="grid gap-2"><Label htmlFor="managed-category-name">Category name</Label><Input id="managed-category-name" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value, id: creating ? slugify(event.target.value) : draft.id })} placeholder="e.g. Art Supplies" /></div>
          <div className="grid gap-2"><Label htmlFor="managed-category-description">Description</Label><Textarea id="managed-category-description" value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} rows={4} /></div>
          <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-semibold">Data source</p><p className="text-xs text-muted-foreground">Imported records require review before becoming canonical.</p></div><Badge variant="outline">{draft.source === 'internal' ? 'Internal' : 'Imported'}</Badge></div>
        </TabsContent>
        <TabsContent value="attributes" className="m-0 space-y-3">{attributes.filter(item => item.status === 'Active').map(attribute => { const assignment = draft.attributes.find(item => item.key === attribute.key); return <div key={attribute.key} className="flex min-h-16 items-center gap-3 rounded-xl border p-3"><Checkbox checked={Boolean(assignment)} onCheckedChange={checked => toggleAttribute(attribute.key, checked === true)} aria-label={`Assign ${attribute.name}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{attribute.name}</p><p className="mt-1 text-xs text-muted-foreground">{attribute.description}</p></div><label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Switch checked={assignment?.required ?? false} disabled={!assignment} onCheckedChange={checked => toggleRequired(attribute.key, checked)} />Required</label></div>; })}</TabsContent>
        <TabsContent value="mapping" className="m-0 space-y-3"><div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><p className="font-semibold">Channel data is a mapping, not the master taxonomy</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Review imported suggestions before using them for publishing.</p></div>{channelLabels.map(([key, label]) => <div key={key} className="flex items-center gap-3 rounded-xl border p-4"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{key === 'pos' || key === 'social' ? 'Category mapping is not required for this channel.' : 'Marketplace category mapping'}</p></div><select aria-label={`${label} mapping status`} value={draft.mappings[key]} disabled={key === 'pos' || key === 'social'} onChange={event => setDraft({ ...draft, mappings: { ...draft.mappings, [key]: event.target.value as MappingStatus } })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="mapped">Mapped</option><option value="needs_review">Needs review</option><option value="not_required">Not required</option></select></div>)}</TabsContent>
      </div>
    </Tabs>
    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-background/95 p-4 backdrop-blur"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!draft.name.trim()} onClick={() => onSave({ ...draft, id: draft.id || slugify(draft.name) })}>{creating ? 'Create Category' : 'Save Configuration'}</Button></div>
  </SheetContent></Sheet>;
}

function BrandConfigurationDrawer({ open, creating, value, onChange, onClose, onSave }: { open: boolean; creating: boolean; value: BrandDefinition; onChange: (value: BrandDefinition) => void; onClose: () => void; onSave: () => void }) {
  return <Sheet open={open} onOpenChange={next => !next && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[600px]"><SheetHeader className="border-b border-border px-6 py-5"><SheetTitle>{creating ? 'Add Brand' : 'Edit Brand'}</SheetTitle><SheetDescription>Canonical brand identity. Values synced from channels remain aliases or mappings until verified.</SheetDescription></SheetHeader><div className="flex-1 space-y-5 overflow-y-auto p-6 pb-28"><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="brand-name">Brand Name</Label><Input id="brand-name" value={value.name} onChange={event => onChange({ ...value, name: event.target.value, code: creating ? event.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() : value.code })} /></div><div className="grid gap-2"><Label htmlFor="brand-code">Brand Code</Label><Input id="brand-code" className="font-mono uppercase" value={value.code} onChange={event => onChange({ ...value, code: event.target.value.toUpperCase() })} /></div></div><div className="grid gap-2"><Label htmlFor="brand-aliases">Aliases from channels</Label><Input id="brand-aliases" value={value.aliases.join(', ')} onChange={event => onChange({ ...value, aliases: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} placeholder="CyberRecords, CYBER RECORDS" /></div><div className="grid gap-2"><Label htmlFor="brand-manufacturer">Manufacturer / Owner</Label><Input id="brand-manufacturer" value={value.manufacturer} onChange={event => onChange({ ...value, manufacturer: event.target.value })} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="brand-country">Country</Label><Input id="brand-country" value={value.country} onChange={event => onChange({ ...value, country: event.target.value })} /></div><label className="grid gap-2 text-sm font-medium">Status<select className="h-10 rounded-md border bg-background px-3" value={value.status} onChange={event => onChange({ ...value, status: event.target.value as BrandDefinition['status'] })}><option>Verified</option><option>Unverified</option><option>Inactive</option></select></label></div><div className="grid gap-2"><Label htmlFor="brand-website">Website</Label><Input id="brand-website" type="url" value={value.website} onChange={event => onChange({ ...value, website: event.target.value })} /></div><section className="space-y-4 rounded-xl border p-4"><div><h3 className="text-sm font-semibold">Marketplace Brand Mapping</h3><p className="mt-1 text-xs text-muted-foreground">Blank values stay unmapped and do not block Product Master.</p></div>{([['amazon', 'Amazon brand'], ['shopee', 'Shopee brand ID'], ['lazada', 'Lazada brand ID'], ['tiktok', 'TikTok Shop brand ID'], ['rakuten', 'Rakuten brand']] as Array<[CatalogChannel, string]>).map(([key, label]) => <div key={key} className="grid gap-2"><Label htmlFor={`brand-${key}`}>{label}</Label><Input id={`brand-${key}`} value={value.mappings[key] ?? ''} onChange={event => onChange({ ...value, mappings: { ...value.mappings, [key]: event.target.value } })} /></div>)}</section></div><div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-background/95 p-4 backdrop-blur"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={!value.name.trim() || !value.code.trim()}>{creating ? 'Create Brand' : 'Save Brand'}</Button></div></SheetContent></Sheet>;
}

function AttributeConfigurationDrawer({ open, creating, value, onChange, onClose, onSave }: { open: boolean; creating: boolean; value: AttributeDefinition; onChange: (value: AttributeDefinition) => void; onClose: () => void; onSave: () => void }) {
  const needsOptions = value.type === 'Single select' || value.type === 'Multi-select';
  const needsUnit = value.type === 'Measurement' || value.type === 'Measurement set' || value.type === 'Number';

  return <Sheet open={open} onOpenChange={nextOpen => !nextOpen && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[560px]">
    <SheetHeader className="border-b border-slate-200 px-6 py-5"><SheetTitle>{creating ? 'Add Attribute' : 'Edit Attribute'}</SheetTitle><SheetDescription>Define a reusable product field. Required or optional usage is configured separately for each category.</SheetDescription></SheetHeader>
    <div className="flex-1 space-y-5 overflow-y-auto p-6 pb-28">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2"><Label htmlFor="attribute-name">Attribute Name</Label><Input id="attribute-name" value={value.name} onChange={event => onChange({ ...value, name: event.target.value, key: creating ? slugify(event.target.value).replace(/-/g, '_') : value.key })} placeholder="e.g. Material" /></div>
        <div className="grid gap-2"><Label htmlFor="attribute-key">Internal Key</Label><Input id="attribute-key" value={value.key} onChange={event => onChange({ ...value, key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="material" className="font-mono" /></div>
      </div>
      <div className="grid gap-2"><Label htmlFor="attribute-description">Description</Label><Textarea id="attribute-description" value={value.description} onChange={event => onChange({ ...value, description: event.target.value })} rows={3} placeholder="Explain what product information this field captures..." /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">Field Type<select value={value.type} onChange={event => onChange({ ...value, type: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"><option>Single-line text</option><option>Rich text</option><option>Number</option><option>Single select</option><option>Multi-select</option><option>Country selector</option><option>Measurement</option><option>Measurement set</option></select></label>
        <label className="grid gap-2 text-sm font-medium">Status<select value={value.status} onChange={event => onChange({ ...value, status: event.target.value as AttributeDefinition['status'] })} className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"><option>Active</option><option>Inactive</option></select></label>
      </div>
      {needsOptions ? <div className="grid gap-2"><Label htmlFor="attribute-options">Available Values</Label><Textarea id="attribute-options" value={value.options} onChange={event => onChange({ ...value, options: event.target.value })} rows={3} placeholder="Cotton, Leather, Metal — separate values with commas" /><p className="text-xs text-slate-500">These canonical values can later be mapped to each marketplace vocabulary.</p></div> : null}
      {needsUnit ? <div className="grid gap-2"><Label htmlFor="attribute-unit">Default Unit</Label><Input id="attribute-unit" value={value.unit} onChange={event => onChange({ ...value, unit: event.target.value })} placeholder="e.g. cm, kg, ml" /></div> : null}
      <div className="grid gap-2"><Label htmlFor="attribute-validation">Validation Rules</Label><Input id="attribute-validation" value={value.validation} onChange={event => onChange({ ...value, validation: event.target.value })} placeholder="e.g. Maximum 100 characters" /></div>
      {!creating ? <section className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-900">Category Usage</h3><p className="mt-1 text-xs leading-5 text-slate-500">Used in {value.categories} categories. Open a category to change whether this attribute is required or optional.</p></section> : null}
    </div>
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={!value.name.trim() || !value.key.trim()}>{creating ? 'Create Attribute' : 'Save Attribute'}</Button></div>
  </SheetContent></Sheet>;
}

function CategoryConfigurationDrawer({ open, category, creating, tab, onTabChange, onClose, onSave }: { open: boolean; category: CategoryRow | null; creating: boolean; tab: DrawerTab; onTabChange: (tab: DrawerTab) => void; onClose: () => void; onSave: () => void }) {
  const name = creating ? '' : category?.category ?? '';
  const group = creating ? 'None (root category)' : category?.group ?? 'Lifestyle';
  const availableAttributes = ['Brand', 'Material', 'Color', 'Size', 'Dimensions', 'Care instructions', 'Country of origin', 'Warranty'];

  return <Sheet open={open} onOpenChange={value => !value && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[650px]">
    <SheetHeader className="border-b border-slate-200 px-6 py-5"><SheetTitle>{creating ? 'Add Category' : 'Configure Category'}</SheetTitle><SheetDescription>{creating ? 'Create a category and define the product information it requires.' : `${category?.group} › ${category?.category}`}</SheetDescription></SheetHeader>
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
