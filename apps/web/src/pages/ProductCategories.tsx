import { useMemo, useState } from 'react';
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

type ViewTab = 'categories' | 'attributes' | 'brands';
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

interface AttributeDefinition {
  id: string;
  name: string;
  key: string;
  type: string;
  categories: number;
  description: string;
  options: string;
  unit: string;
  validation: string;
  status: 'Active' | 'Inactive';
}

interface BrandDefinition {
  id: string;
  name: string;
  code: string;
  manufacturer: string;
  country: string;
  website: string;
  productCount: number;
  status: 'Verified' | 'Unverified' | 'Inactive';
  amazonId: string;
  shopeeId: string;
  lazadaId: string;
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

const initialAttributes: AttributeDefinition[] = [
  { id: 'brand', name: 'Brand', key: 'brand', type: 'Single-line text', categories: 12, description: 'Canonical manufacturer or house brand.', options: '', unit: '', validation: 'Maximum 100 characters', status: 'Active' },
  { id: 'material', name: 'Material', key: 'material', type: 'Multi-select', categories: 8, description: 'Primary materials used to manufacture the product.', options: 'Cotton, Leather, Metal, Plastic, Wood', unit: '', validation: 'At least one value when required by category', status: 'Active' },
  { id: 'care-instructions', name: 'Care Instructions', key: 'care_instructions', type: 'Rich text', categories: 5, description: 'Handling, cleaning and storage guidance.', options: '', unit: '', validation: 'Maximum 2,000 characters', status: 'Active' },
  { id: 'dimensions', name: 'Dimensions', key: 'dimensions', type: 'Measurement set', categories: 10, description: 'Length, width, height and supported unit.', options: '', unit: 'cm', validation: 'Values must be greater than zero', status: 'Active' },
  { id: 'country-of-origin', name: 'Country of Origin', key: 'country_of_origin', type: 'Country selector', categories: 9, description: 'Manufacturing country used for compliance.', options: '', unit: '', validation: 'ISO 3166 country list', status: 'Active' },
];

const blankAttribute: AttributeDefinition = {
  id: '', name: '', key: '', type: 'Single-line text', categories: 0, description: '', options: '', unit: '', validation: '', status: 'Active',
};

const initialBrands: BrandDefinition[] = [
  { id: 'cyber-records', name: 'CYBER-RECORDS', code: 'CYBR', manufacturer: 'CyberRecord Japan Co.', country: 'Japan', website: 'https://cyber-records.example', productCount: 5, status: 'Verified', amazonId: 'CYBER RECORDS', shopeeId: '1009234', lazadaId: 'BR-20418' },
  { id: 'prime-essentials', name: 'Prime Essentials', code: 'PRME', manufacturer: 'Prime Commerce', country: 'Singapore', website: 'https://prime.example', productCount: 12, status: 'Verified', amazonId: '', shopeeId: '1008871', lazadaId: '' },
  { id: 'no-brand', name: 'No Brand', code: 'GENERIC', manufacturer: '', country: '', website: '', productCount: 8, status: 'Unverified', amazonId: 'Generic', shopeeId: '0', lazadaId: 'No Brand' },
];
const blankBrand: BrandDefinition = { id: '', name: '', code: '', manufacturer: '', country: '', website: '', productCount: 0, status: 'Unverified', amazonId: '', shopeeId: '', lazadaId: '' };

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
  const { pathname } = useLocation();
  const viewTab: ViewTab = pathname.endsWith('/attributes') ? 'attributes' : pathname.endsWith('/brands') ? 'brands' : 'categories';
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('general');
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>(initialAttributes);
  const [attributeDrawerOpen, setAttributeDrawerOpen] = useState(false);
  const [attributeDraft, setAttributeDraft] = useState<AttributeDefinition>(blankAttribute);
  const [isCreatingAttribute, setIsCreatingAttribute] = useState(false);
  const [brands, setBrands] = useState<BrandDefinition[]>(initialBrands);
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [brandDraft, setBrandDraft] = useState<BrandDefinition>(blankBrand);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
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
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70"><tr>{['ATTRIBUTE', 'FIELD TYPE', 'USED IN', 'STATUS', 'ACTIONS'].map(label => <th key={label} className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-slate-500', label === 'ACTIONS' && 'text-right')}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredAttributes.map(attribute => <tr key={attribute.id} tabIndex={0} onClick={() => editAttribute(attribute)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); editAttribute(attribute); } }} className="cursor-pointer transition-colors hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><td className="px-4 py-3"><p className="text-sm font-semibold text-slate-900">{attribute.name}</p><p className="mt-1 max-w-md text-xs text-slate-500">{attribute.description}</p></td><td className="px-4 py-3 text-sm text-slate-700">{attribute.type}</td><td className="px-4 py-3 text-sm text-slate-700"><span className="font-semibold tabular-nums">{attribute.categories}</span> categories</td><td className="px-4 py-3"><span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', attribute.status === 'Active' ? 'text-emerald-700' : 'text-slate-500')}><span className={cn('size-2 rounded-full', attribute.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400')} />{attribute.status}</span></td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={event => { event.stopPropagation(); editAttribute(attribute); }}>Edit<ChevronRight className="size-4" /></Button></td></tr>)}</tbody></table></div>
          {filteredAttributes.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No attributes match this search.</div> : null}
        </TabsContent>

        <TabsContent value="brands" className="m-0">
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70"><tr>{['BRAND', 'MANUFACTURER', 'COUNTRY', 'PRODUCTS', 'CHANNEL MAPPING', 'STATUS', 'ACTIONS'].map(label => <th key={label} className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-slate-500', label === 'ACTIONS' && 'text-right')}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredBrands.map(brand => <tr key={brand.id} tabIndex={0} onClick={() => editBrand(brand)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); editBrand(brand); } }} className="cursor-pointer hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 font-bold text-primary">{brand.name.slice(0, 1)}</span><div><p className="text-sm font-semibold text-slate-900">{brand.name}</p><p className="mt-0.5 font-mono text-xs text-slate-500">{brand.code}</p></div></div></td><td className="px-4 py-3 text-sm text-slate-700">{brand.manufacturer || '—'}</td><td className="px-4 py-3 text-sm text-slate-700">{brand.country || '—'}</td><td className="px-4 py-3 text-sm font-semibold tabular-nums">{brand.productCount}</td><td className="px-4 py-3"><div className="flex gap-1.5">{[['AMZ', brand.amazonId], ['SHP', brand.shopeeId], ['LAZ', brand.lazadaId]].map(([label, value]) => <Badge key={label} variant="outline" className={value ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'text-slate-400'}>{label} {value ? 'Mapped' : '—'}</Badge>)}</div></td><td className="px-4 py-3"><Badge className={brand.status === 'Verified' ? 'bg-emerald-50 text-emerald-700' : brand.status === 'Inactive' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}>{brand.status}</Badge></td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={event => { event.stopPropagation(); editBrand(brand); }}>Edit<ChevronRight className="size-4" /></Button></td></tr>)}</tbody></table></div>
          {filteredBrands.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No brands match this search.</div> : null}
        </TabsContent>
      </div>
    </Tabs>

    <CategoryConfigurationDrawer open={drawerOpen} category={selectedCategory} creating={isCreating} tab={drawerTab} onTabChange={setDrawerTab} onClose={() => setDrawerOpen(false)} onSave={() => { toast({ title: isCreating ? 'Category created' : 'Category configuration saved', description: isCreating ? 'The new master category is ready for attribute assignment.' : `${selectedCategory?.category} mappings and attributes were updated.` }); setDrawerOpen(false); }} />
    <AttributeConfigurationDrawer open={attributeDrawerOpen} creating={isCreatingAttribute} value={attributeDraft} onChange={setAttributeDraft} onClose={() => setAttributeDrawerOpen(false)} onSave={() => saveAttribute(attributeDraft)} />
    <BrandConfigurationDrawer open={brandDrawerOpen} creating={isCreatingBrand} value={brandDraft} onChange={setBrandDraft} onClose={() => setBrandDrawerOpen(false)} onSave={() => saveBrand(brandDraft)} />
  </div>;
}

function BrandConfigurationDrawer({ open, creating, value, onChange, onClose, onSave }: { open: boolean; creating: boolean; value: BrandDefinition; onChange: (value: BrandDefinition) => void; onClose: () => void; onSave: () => void }) {
  return <Sheet open={open} onOpenChange={next => !next && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[600px]"><SheetHeader className="border-b border-slate-200 px-6 py-5"><SheetTitle>{creating ? 'Add Brand' : 'Edit Brand'}</SheetTitle><SheetDescription>Canonical product identity and marketplace brand mapping.</SheetDescription></SheetHeader><div className="flex-1 space-y-5 overflow-y-auto p-6 pb-28"><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="brand-name">Brand Name</Label><Input id="brand-name" value={value.name} onChange={event => onChange({ ...value, name: event.target.value, code: creating ? event.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() : value.code })} /></div><div className="grid gap-2"><Label htmlFor="brand-code">Brand Code</Label><Input id="brand-code" className="font-mono uppercase" value={value.code} onChange={event => onChange({ ...value, code: event.target.value.toUpperCase() })} /></div></div><div className="grid gap-2"><Label htmlFor="brand-manufacturer">Manufacturer / Owner</Label><Input id="brand-manufacturer" value={value.manufacturer} onChange={event => onChange({ ...value, manufacturer: event.target.value })} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="brand-country">Country</Label><Input id="brand-country" value={value.country} onChange={event => onChange({ ...value, country: event.target.value })} /></div><label className="grid gap-2 text-sm font-medium">Status<select className="h-10 rounded-md border bg-background px-3" value={value.status} onChange={event => onChange({ ...value, status: event.target.value as BrandDefinition['status'] })}><option>Verified</option><option>Unverified</option><option>Inactive</option></select></label></div><div className="grid gap-2"><Label htmlFor="brand-website">Website</Label><Input id="brand-website" type="url" value={value.website} onChange={event => onChange({ ...value, website: event.target.value })} /></div><section className="space-y-4 rounded-xl border p-4"><div><h3 className="text-sm font-semibold">Marketplace Brand Mapping</h3><p className="mt-1 text-xs text-slate-500">Map the canonical brand to identifiers recognized by each provider.</p></div><div className="grid gap-2"><Label>Amazon Brand</Label><Input value={value.amazonId} onChange={event => onChange({ ...value, amazonId: event.target.value })} /></div><div className="grid gap-2"><Label>Shopee Brand ID</Label><Input value={value.shopeeId} onChange={event => onChange({ ...value, shopeeId: event.target.value })} /></div><div className="grid gap-2"><Label>Lazada Brand ID</Label><Input value={value.lazadaId} onChange={event => onChange({ ...value, lazadaId: event.target.value })} /></div></section></div><div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-white/95 p-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={!value.name.trim() || !value.code.trim()}>{creating ? 'Create Brand' : 'Save Brand'}</Button></div></SheetContent></Sheet>;
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
