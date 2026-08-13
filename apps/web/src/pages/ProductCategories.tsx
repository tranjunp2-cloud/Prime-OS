import { useMemo, useState } from 'react';
import {
  Check, ChevronRight, CircleAlert, FolderTree, Layers3, Plus, Search,
  Settings2, Sparkles, Tags,
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

type ViewTab = 'categories' | 'attributes';
type DrawerTab = 'general' | 'attributes' | 'mapping';
type MappingStatus = 'mapped' | 'unmapped';

interface CategoryRow {
  id: string;
  category: string;
  group: string;
  productCount: number;
  attributes: string[];
  status: 'Active' | 'Inactive';
  mappings: Record<'webstore' | 'pos' | 'shopee' | 'tiktok' | 'lazada', MappingStatus>;
}

const taxonomyDefaults: Record<string, string[]> = {
  Fashion: ['Brand', 'Material', 'Color', 'Size', 'Care instructions', 'Dimensions'],
  Electronics: ['Brand', 'Model', 'Connectivity', 'Dimensions', 'Warranty'],
  Lifestyle: ['Brand', 'Material', 'Dimensions', 'Care instructions', 'Country of origin'],
  'Personal Care': ['Brand', 'Volume', 'Ingredients', 'Skin type', 'Country of origin'],
  Uncategorized: ['Brand', 'Model'],
};

const channelLabels = [
  ['webstore', 'WebStore'], ['pos', 'POS'], ['shopee', 'Shopee'], ['tiktok', 'TikTok Shop'], ['lazada', 'Lazada'],
] as const;

const attributeSets = [
  { name: 'Brand', type: 'Single-line text', usage: 'Required', categories: 12, description: 'Canonical manufacturer or house brand.' },
  { name: 'Material', type: 'Multi-select', usage: 'Required', categories: 8, description: 'Primary materials used to manufacture the product.' },
  { name: 'Care Instructions', type: 'Rich text', usage: 'Optional', categories: 5, description: 'Handling, cleaning and storage guidance.' },
  { name: 'Dimensions', type: 'Measurement set', usage: 'Required', categories: 10, description: 'Length, width, height and supported unit.' },
  { name: 'Country of Origin', type: 'Country selector', usage: 'Optional', categories: 9, description: 'Manufacturing country used for compliance.' },
];

function taxonomyGroup(category: string) {
  if (['Jacket', 'Shoe', 'Hat', 'Bag', 'Watch', 'Sunglasses'].includes(category)) return 'Fashion';
  if (['Electronics', 'Headphones'].includes(category)) return 'Electronics';
  if (category === 'Beauty & Personal Care') return 'Personal Care';
  if (category) return 'Lifestyle';
  return 'Uncategorized';
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function ProductCategories() {
  const { toast } = useToast();
  const [viewTab, setViewTab] = useState<ViewTab>('categories');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('general');
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const products = getProducts();

  const rows = useMemo<CategoryRow[]>(() => {
    const counts = new Map<string, number>();
    products.forEach(product => counts.set(product.category || 'Uncategorized', (counts.get(product.category || 'Uncategorized') ?? 0) + 1));
    const demoCategories = ['Art Supplies', 'Stationery', 'Electronics', 'Headphones', 'Beauty & Personal Care', 'Home & Living'];
    const categories = Array.from(new Set([...counts.keys(), ...demoCategories]));
    return categories.map((category, index) => {
      const group = taxonomyGroup(category);
      return {
        id: `cat-${slugify(category)}`,
        category,
        group,
        productCount: counts.get(category) ?? (index % 3),
        attributes: taxonomyDefaults[group] ?? taxonomyDefaults.Uncategorized,
        status: index === categories.length - 1 ? 'Inactive' : 'Active',
        mappings: {
          webstore: 'mapped',
          pos: index % 4 === 0 ? 'unmapped' : 'mapped',
          shopee: index % 3 === 1 ? 'unmapped' : 'mapped',
          tiktok: index % 3 === 2 ? 'unmapped' : 'mapped',
          lazada: index % 2 === 0 ? 'mapped' : 'unmapped',
        },
      };
    }).filter(row => `${row.group} ${row.category} ${row.attributes.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => a.group.localeCompare(b.group) || a.category.localeCompare(b.category));
  }, [products, search]);

  const filteredAttributes = attributeSets.filter(attribute => `${attribute.name} ${attribute.type} ${attribute.description}`.toLowerCase().includes(search.trim().toLowerCase()));

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

  return <div className="space-y-5 p-4 md:p-6">
    <WorkspacePageHeader
      title="Categories & Attributes"
      description="Manage the master taxonomy, reusable attribute sets, and marketplace category mappings."
      icon={Tags}
      actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setViewTab('attributes')}><Settings2 className="size-4" />Manage Global Attributes</Button><Button onClick={createCategory}><Plus className="size-4" />Add Category</Button></div>}
    />

    <Tabs value={viewTab} onValueChange={value => { setViewTab(value as ViewTab); setSearch(''); }}>
      <TabsList className="h-11 w-full justify-start rounded-none border-b bg-transparent p-0">
        <TabsTrigger value="categories" className="h-11 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><FolderTree className="size-4" />Master Categories</TabsTrigger>
        <TabsTrigger value="attributes" className="h-11 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Layers3 className="size-4" />Global Attribute Sets</TabsTrigger>
      </TabsList>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div className="relative max-w-xl flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder={viewTab === 'categories' ? 'Search category paths or required attributes...' : 'Search global attribute definitions...'} className="pl-9" /></div>
          <p className="text-xs text-slate-500">{viewTab === 'categories' ? `${rows.length} master categories` : `${filteredAttributes.length} reusable attribute sets`}</p>
        </div>

        <TabsContent value="categories" className="m-0">
          <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70"><tr>{['CATEGORY PATH', 'PRODUCTS COUNT', 'REQUIRED ATTRIBUTES', 'CHANNEL CATEGORY MAPPING', 'STATUS', 'ACTIONS'].map(label => <th key={label} className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-slate-500', label === 'ACTIONS' && 'text-right')}>{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id} tabIndex={0} onClick={() => openCategory(row)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCategory(row); } }} className="cursor-pointer transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FolderTree className="size-4" /></span><div><p className="text-xs font-medium text-slate-500">{row.group} <span className="mx-1">›</span></p><p className="mt-0.5 text-sm font-semibold text-slate-900">{row.category}</p></div></div></td>
              <td className="px-4 py-3 text-sm font-semibold tabular-nums text-slate-700">{row.productCount}</td>
              <td className="px-4 py-3"><div className="flex max-w-[330px] flex-wrap gap-1.5">{row.attributes.slice(0, 4).map(attribute => <Badge key={attribute} variant="outline" className="font-medium">{attribute}</Badge>)}{row.attributes.length > 4 ? <Popover><PopoverTrigger asChild><button type="button" onClick={event => event.stopPropagation()} className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100">+{row.attributes.length - 4} more</button></PopoverTrigger><PopoverContent align="start" className="w-64 p-3"><p className="mb-2 text-xs font-semibold text-slate-900">All required attributes</p><div className="flex flex-wrap gap-1.5">{row.attributes.map(attribute => <Badge key={attribute} variant="outline">{attribute}</Badge>)}</div></PopoverContent></Popover> : null}</div></td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{channelLabels.map(([key, label]) => <span key={key} className={cn('inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold', row.mappings[key] === 'mapped' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500')}><span className={cn('size-2 rounded-full', row.mappings[key] === 'mapped' ? 'bg-emerald-500' : 'bg-amber-400')} />{label}</span>)}</div></td>
              <td className="px-4 py-3"><Badge className={row.status === 'Active' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}>{row.status}</Badge></td>
              <td className="px-4 py-3"><div className="flex justify-end"><Button type="button" variant="outline" size="sm" onClick={event => { event.stopPropagation(); openCategory(row); }}>Configure<ChevronRight className="size-4" /></Button></div></td>
            </tr>)}</tbody>
          </table></div>
          {rows.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No categories or attributes match this search.</div> : null}
        </TabsContent>

        <TabsContent value="attributes" className="m-0">
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70"><tr>{['ATTRIBUTE SET', 'FIELD TYPE', 'DEFAULT USAGE', 'ASSIGNED CATEGORIES', 'STATUS', ''].map(label => <th key={label} className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredAttributes.map(attribute => <tr key={attribute.name} className="hover:bg-slate-50/60"><td className="px-4 py-3"><p className="text-sm font-semibold text-slate-900">{attribute.name}</p><p className="mt-1 max-w-md text-xs text-slate-500">{attribute.description}</p></td><td className="px-4 py-3 text-sm text-slate-700">{attribute.type}</td><td className="px-4 py-3"><Badge variant="outline">{attribute.usage}</Badge></td><td className="px-4 py-3 text-sm font-semibold tabular-nums text-slate-700">{attribute.categories}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" />Active</span></td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => toast({ title: 'Attribute editor', description: `${attribute.name} is ready to configure.` })}>Edit<ChevronRight className="size-4" /></Button></td></tr>)}</tbody></table></div>
        </TabsContent>
      </div>
    </Tabs>

    <CategoryConfigurationDrawer open={drawerOpen} category={selectedCategory} creating={isCreating} tab={drawerTab} onTabChange={setDrawerTab} onClose={() => setDrawerOpen(false)} onSave={() => { toast({ title: isCreating ? 'Category created' : 'Category configuration saved', description: isCreating ? 'The new master category is ready for attribute assignment.' : `${selectedCategory?.category} mappings and attributes were updated.` }); setDrawerOpen(false); }} />
  </div>;
}

function CategoryConfigurationDrawer({ open, category, creating, tab, onTabChange, onClose, onSave }: { open: boolean; category: CategoryRow | null; creating: boolean; tab: DrawerTab; onTabChange: (tab: DrawerTab) => void; onClose: () => void; onSave: () => void }) {
  const name = creating ? '' : category?.category ?? '';
  const group = creating ? 'None (root category)' : category?.group ?? 'Lifestyle';
  const availableAttributes = ['Brand', 'Material', 'Color', 'Size', 'Dimensions', 'Care instructions', 'Country of origin', 'Warranty'];

  return <Sheet open={open} onOpenChange={value => !value && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[650px]">
    <SheetHeader className="border-b border-slate-200 px-6 py-5"><SheetTitle>{creating ? 'Add Master Category' : 'Configure Category'}</SheetTitle><SheetDescription>{creating ? 'Create a reusable category in the Prime OS master taxonomy.' : `${category?.group} › ${category?.category}`}</SheetDescription></SheetHeader>
    <Tabs value={tab} onValueChange={value => onTabChange(value as DrawerTab)} className="flex min-h-0 flex-1 flex-col">
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-white px-4 py-0">
        <TabsTrigger value="general" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">General & Sub-categories</TabsTrigger>
        <TabsTrigger value="attributes" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Attributes</TabsTrigger>
        <TabsTrigger value="mapping" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Marketplace Mapping</TabsTrigger>
      </TabsList>
      <div className="flex-1 overflow-y-auto p-6 pb-28">
        <TabsContent value="general" className="m-0 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-slate-700">Parent Category<select defaultValue={group} className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"><option>None (root category)</option><option>Fashion</option><option>Electronics</option><option>Lifestyle</option><option>Personal Care</option></select></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Status<select defaultValue={category?.status ?? 'Active'} className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal"><option>Active</option><option>Inactive</option></select></label></div><div className="grid gap-2"><Label htmlFor="category-name">Category Name</Label><Input id="category-name" defaultValue={name} placeholder="e.g. Art Supplies" /></div><div className="grid gap-2"><Label htmlFor="category-slug">Slug</Label><Input id="category-slug" defaultValue={slugify(name)} placeholder="art-supplies" className="font-mono" /></div><div className="grid gap-2"><Label htmlFor="category-description">Description</Label><Textarea id="category-description" rows={4} placeholder="Describe which products belong in this category..." /></div><section className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">Sub-categories</h3><p className="mt-1 text-xs text-slate-500">Create child nodes under this master category.</p></div><Button variant="outline" size="sm"><Plus className="size-4" />Add Sub-category</Button></div><div className="mt-4 rounded-lg border border-dashed p-4 text-center text-xs text-slate-500">No sub-categories configured yet.</div></section></TabsContent>

        <TabsContent value="attributes" className="m-0 space-y-5"><div><h3 className="text-sm font-semibold text-slate-900">Mandatory & Optional Attributes</h3><p className="mt-1 text-xs leading-5 text-slate-500">Products in this category inherit these validation requirements.</p></div><div className="space-y-2">{availableAttributes.map((attribute, index) => { const assigned = category?.attributes.includes(attribute) ?? index < 2; return <div key={attribute} className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 p-3"><Checkbox defaultChecked={assigned} aria-label={`Assign ${attribute}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{attribute}</p><p className="mt-1 text-xs text-slate-500">Global attribute set · reusable across categories</p></div><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Switch defaultChecked={assigned && index < 4} aria-label={`Make ${attribute} mandatory`} />Required</label></div>; })}</div></TabsContent>

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
