import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Award, Check, ChevronDown, ChevronRight, CircleAlert, CircleHelp, FolderTree, Layers3, MoreHorizontal, Pencil, Plus, Search, Trash2,
  Sparkles, Tags,
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
type UsageFilter = 'all' | 'with_products' | 'no_products';
type AttributeFilter = 'all' | 'assigned' | 'unassigned' | 'inactive';
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

  return <Popover><PopoverTrigger asChild><button type="button" onClick={event => event.stopPropagation()} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`${attribute.name} is used in ${usage.length} categories. Show categories.`}><span className="size-1.5 rounded-full bg-primary" />{usage.length} {usage.length === 1 ? 'category' : 'categories'}<ChevronDown className="size-3.5" /></button></PopoverTrigger><PopoverContent align="start" className="w-80 p-0" onClick={event => event.stopPropagation()}>
    <div className="border-b px-4 py-3"><p className="text-sm font-semibold">Used in categories</p><p className="mt-1 text-xs text-muted-foreground">Required or optional is managed inside each category.</p></div>
    <div className="max-h-72 overflow-y-auto p-2">{usage.map(item => <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60"><div className="min-w-0"><p className="truncate text-xs font-semibold">{item.name}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.path}</p></div><Badge variant="outline" className={cn('shrink-0 text-[10px]', item.required && 'border-primary/30 bg-primary/5 text-primary')}>{item.required ? 'Required' : 'Optional'}</Badge></div>)}</div>
  </PopoverContent></Popover>;
}

function BrandUsageSummary({ brand, products }: { brand: BrandDefinition; products: Array<{ id: string; name: string; sku_code: string }> }) {
  if (!products.length) return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500"><span className="size-1.5 rounded-full bg-slate-400" />No products</span>;
  return <Popover><PopoverTrigger asChild><button type="button" onClick={event => event.stopPropagation()} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`${products.length} Product Masters use ${brand.name}`}><span className="size-1.5 rounded-full bg-primary" />{products.length} linked<ChevronDown className="size-3.5" /></button></PopoverTrigger><PopoverContent align="start" className="w-80 p-0" onClick={event => event.stopPropagation()}><div className="border-b px-4 py-3"><p className="text-sm font-semibold">Product Masters using {brand.name}</p></div><div className="max-h-72 overflow-y-auto p-2">{products.map(product => <div key={product.id} className="rounded-lg px-2 py-2.5 hover:bg-muted/60"><p className="truncate text-xs font-semibold">{product.name}</p><p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{product.sku_code}</p></div>)}</div></PopoverContent></Popover>;
}

function FieldHelp({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip><TooltipTrigger asChild><button type="button" aria-label={`About ${label}`} className="inline-grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><CircleHelp className="size-3.5" /></button></TooltipTrigger><TooltipContent side="top" align="start" className="max-w-72 text-xs leading-5">{children}</TooltipContent></Tooltip>;
}

const blankAttribute: AttributeDefinition = {
  id: '', name: '', key: '', type: 'Single-line text', categories: 0, description: '', options: '', unit: '', validation: '', status: 'Active', source: 'internal',
};
const blankBrand: BrandDefinition = { id: '', name: '', code: '', manufacturer: '', country: '', website: '', productCount: 0, status: 'Unverified', source: 'internal', aliases: [], mappings: {} };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[đĐ]/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(() => new Set(initialSettings.categories.map(category => category.id)));
  const [attributes, setAttributes] = useState<AttributeDefinition[]>(initialSettings.attributes);
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

  function returnToProduct() {
    if (!returnTo) return;
    if (returnMode === 'close') {
      window.close();
      window.setTimeout(() => navigate(returnTo), 100);
      return;
    }
    navigate(returnTo);
  }

  useEffect(() => { saveProductCatalogSettings({ categories, attributes, brands }); }, [categories, attributes, brands]);

  const rows = useMemo<CategoryRow[]>(() => {
    const productsByCategory = new Map<string, typeof products>();
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      productsByCategory.set(category, [...(productsByCategory.get(category) ?? []), product]);
    });
    const byId = new Map(categories.map(category => [category.id, category]));
    const childrenByParent = new Map<string | null, CatalogCategory[]>();
    categories.forEach(category => childrenByParent.set(category.parentId, [...(childrenByParent.get(category.parentId) ?? []), category]));
    childrenByParent.forEach(children => children.sort((a, b) => a.name.localeCompare(b.name)));
    const hasDescendantNamed = (category: CatalogCategory, name: string): boolean => (childrenByParent.get(category.id) ?? []).some(child => child.name === name || hasDescendantNamed(child, name));
    const directProductsFor = (category: CatalogCategory) => hasDescendantNamed(category, category.name) ? [] : (productsByCategory.get(category.name) ?? []);
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
      || (attributeFilter === 'unassigned' && !assigned)
      || (attributeFilter === 'inactive' && attribute.status === 'Inactive');
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    if (viewTab !== 'categories' || !locationSearch || handledCategoryDeepLink.current === locationSearch) return;
    const params = new URLSearchParams(locationSearch);
    const requestedCategory = params.get('category');
    if (!requestedCategory) return;
    const normalized = requestedCategory.trim().toLowerCase();
    const match = rows.find(row => row.id.toLowerCase() === normalized || row.category.trim().toLowerCase() === normalized);
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
  const deleteBlockedByChildLimit = deleteChildren.length > 50;
  const deleteBlocked = deleteBlockedByProducts || deleteNameConflicts.length > 0 || deleteBlockedByChildLimit;

  function deleteCategory() {
    if (!deleteTarget || deleteBlocked) { setDeleteTarget(null); return; }
    const removedName = deleteTarget.category;
    setCategories(current => current.filter(category => category.id !== deleteTarget.id).map(category => category.parentId === deleteTarget.id ? { ...category, parentId: null } : category));
    setExpandedCategoryIds(current => { const next = new Set(current); next.delete(deleteTarget.id); return next; });
    setDeleteTarget(null);
    toast({ title: 'Category deleted', description: deleteChildren.length ? `${removedName} was deleted. ${deleteChildren.length} child ${deleteChildren.length === 1 ? 'category was' : 'categories were'} moved to the root level.` : `${removedName} was removed from the taxonomy.` });
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
    const usageCount = categories.filter(category => category.attributes.some(assignment => assignment.key === attribute.key)).length;
    const normalizedOptions = attribute.options.split(',').map(option => option.trim()).filter(Boolean).join(', ');
    const normalized = {
      ...attribute,
      id: attribute.id || slugify(attribute.key || attribute.name),
      key: attribute.key || slugify(attribute.name).replace(/-/g, '_'),
      options: attribute.type === 'Single select' || attribute.type === 'Multi-select' ? normalizedOptions : attribute.options,
      categories: usageCount,
    };
    const nextAttributes = isCreatingAttribute
      ? [...attributes, normalized]
      : attributes.map(item => item.id === normalized.id ? normalized : item);
    setAttributes(nextAttributes);
    saveProductCatalogSettings({ categories, attributes: nextAttributes, brands });
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
    const normalized = { ...brand, id: brand.id || slugify(brand.name), code: brand.code.trim().toUpperCase() };
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
      actions={<Button onClick={viewTab === 'categories' ? createCategory : viewTab === 'attributes' ? createAttribute : createBrand}><Plus className="size-4" />{pageMeta.action}</Button>}
    />

    <Tabs value={viewTab} onValueChange={value => navigate(value === 'attributes' ? '/products/categories?tab=attributes' : '/products/categories')}>
      {viewTab !== 'brands' ? <TabsList className="h-auto w-full max-w-md justify-start rounded-lg border bg-muted/30 p-1">
        <TabsTrigger value="categories" className="min-h-10 flex-1 gap-2 rounded-md px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><FolderTree className="size-4" />Categories</TabsTrigger>
        <TabsTrigger value="attributes" className="min-h-10 flex-1 gap-2 rounded-md px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Layers3 className="size-4" />Attribute library</TabsTrigger>
      </TabsList> : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div className="relative max-w-xl flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder={viewTab === 'categories' ? 'Search category paths or required attributes...' : viewTab === 'attributes' ? 'Search global attribute definitions...' : 'Search brand, code, manufacturer or country...'} className="pl-9" /></div>
          <p className="text-xs text-slate-500">{viewTab === 'categories' ? `${filteredCategoryRows.length} categories` : viewTab === 'attributes' ? `${filteredAttributes.length} reusable attributes` : `${filteredBrands.length} brands`}</p>
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
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2" aria-label="Filter attributes by assignment status">{([
              ['all', 'All'], ['assigned', 'Assigned'], ['unassigned', 'Not assigned'], ['inactive', 'Inactive'],
            ] as Array<[AttributeFilter, string]>).map(([value, label]) => {
              const count = attributes.filter(attribute => {
                const assigned = categories.some(category => category.attributes.some(item => item.key === attribute.key));
                return value === 'all' || (value === 'assigned' && assigned) || (value === 'unassigned' && !assigned) || (value === 'inactive' && attribute.status === 'Inactive');
              }).length;
              return <button key={value} type="button" onClick={() => setAttributeFilter(value)} aria-pressed={attributeFilter === value} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', attributeFilter === value ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>{label} <span className="ml-1 opacity-70">{count}</span></button>;
            })}</div>
            <p className="text-xs text-slate-500">Define here → assign in Categories → complete in Product Master</p>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70"><tr>{['ATTRIBUTE', 'FIELD TYPE', 'USED IN', 'ACTIONS'].map(label => <th key={label} className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-slate-500', label === 'ACTIONS' && 'text-right')}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredAttributes.map(attribute => { const usage = attributeUsageByKey.get(attribute.key) ?? []; return <tr key={attribute.id} tabIndex={0} onClick={() => editAttribute(attribute)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); editAttribute(attribute); } }} className="cursor-pointer transition-colors hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><td className="px-4 py-3"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-900">{attribute.name}</p>{attribute.status === 'Inactive' ? <Badge variant="outline" className="text-[10px] text-slate-500">Inactive</Badge> : null}</div><p className="mt-1 max-w-md text-xs text-slate-500">{attribute.description}</p></td><td className="px-4 py-3"><Badge variant="outline" className="font-medium text-slate-600">{attribute.type}</Badge></td><td className="px-4 py-3"><AttributeUsageSummary attribute={attribute} usage={usage} /></td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Edit ${attribute.name}`} onClick={event => { event.stopPropagation(); editAttribute(attribute); }} className="grid size-9 place-items-center rounded-md text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Pencil className="size-4" /></button></TooltipTrigger><TooltipContent>Edit attribute</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Delete ${attribute.name}`} onClick={event => { event.stopPropagation(); setAttributeDeleteTarget(attribute); }} className="grid size-9 place-items-center rounded-md text-slate-500 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"><Trash2 className="size-4" /></button></TooltipTrigger><TooltipContent>{usage.length ? 'Remove category usage before deleting' : 'Delete attribute'}</TooltipContent></Tooltip></div></td></tr>; })}</tbody></table></div>
          {filteredAttributes.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No attributes match this search.</div> : null}
        </TabsContent>

        <TabsContent value="brands" className="m-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3" aria-label="Filter brands by Product Master usage">{([['all', 'All'], ['with_products', 'With products'], ['no_products', 'No products']] as Array<[UsageFilter, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setBrandUsageFilter(value)} aria-pressed={brandUsageFilter === value} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', brandUsageFilter === value ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>{label}</button>)}</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-slate-200 bg-slate-50/70"><tr>{['BRAND', 'PRODUCT MASTERS', 'CHANNEL MAPPING', 'ACTIONS'].map(label => <th key={label} className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-slate-500', label === 'ACTIONS' && 'text-right')}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredBrands.map(brand => { const linkedProducts = productsByBrand.get(brand.id) ?? []; const mappedCount = Object.values(brand.mappings).filter(Boolean).length; return <tr key={brand.id} tabIndex={0} onClick={() => editBrand(brand)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); editBrand(brand); } }} className="cursor-pointer hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 font-bold text-primary">{brand.name.slice(0, 1)}</span><div><div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-900">{brand.name}</p>{brand.source === 'imported' ? <Badge variant="outline" className="h-5 text-[10px]">Imported</Badge> : null}{brand.status === 'Inactive' ? <Badge variant="outline" className="h-5 text-[10px] text-slate-500">Inactive</Badge> : null}</div><p className="mt-0.5 font-mono text-xs text-slate-500">{brand.code}</p></div></div></td><td className="px-4 py-3"><BrandUsageSummary brand={brand} products={linkedProducts} /></td><td className="px-4 py-3"><button type="button" onClick={event => { event.stopPropagation(); setBrandDraft(brand); setIsCreatingBrand(false); setBrandDrawerTab('mapping'); setBrandDrawerOpen(true); }} className={cn('inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', mappedCount ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100')}><span className={cn('size-1.5 rounded-full', mappedCount ? 'bg-emerald-500' : 'bg-amber-500')} />{mappedCount}/5 mapped<ChevronRight className="size-3.5" /></button></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Edit ${brand.name}`} onClick={event => { event.stopPropagation(); editBrand(brand); }} className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Pencil className="size-4" /></button></TooltipTrigger><TooltipContent>Edit brand</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Delete ${brand.name}`} onClick={event => { event.stopPropagation(); setBrandDeleteTarget(brand); }} className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"><Trash2 className="size-4" /></button></TooltipTrigger><TooltipContent>{linkedProducts.length || mappedCount ? 'Remove usage and mappings before deleting' : 'Delete brand'}</TooltipContent></Tooltip></div></td></tr>; })}</tbody></table></div>
          {filteredBrands.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No brands match this search.</div> : null}
        </TabsContent>
      </div>
    </Tabs>

    <ManagedCategoryConfigurationDrawer open={drawerOpen} category={selectedCategory} categories={categories} initialParentId={createParentId} creating={isCreating} tab={drawerTab} attributes={attributes} onTabChange={setDrawerTab} onClose={() => setDrawerOpen(false)} onCreateAttribute={(attribute) => { setAttributes(current => [...current, attribute]); toast({ title: 'Attribute created and assigned', description: `${attribute.name} is now available in this category.` }); }} saveLabel={returnTo ? 'Save & return to product' : undefined} onSave={(nextCategory) => { const nextCategories = isCreating ? [...categories, nextCategory] : categories.map(item => item.id === nextCategory.id ? nextCategory : item); setCategories(nextCategories); saveProductCatalogSettings({ categories: nextCategories, attributes, brands }); if (nextCategory.parentId) setExpandedCategoryIds(current => new Set(current).add(nextCategory.parentId!)); toast({ title: isCreating ? 'Category created' : 'Category configuration saved', description: `${nextCategory.name} is ready for Product Master selection.` }); setDrawerOpen(false); if (returnTo) returnToProduct(); }} />
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      onOpenChange={open => !open && setDeleteTarget(null)}
      title={deleteBlocked ? 'Category cannot be deleted' : `Delete ${deleteTarget?.category ?? 'category'}?`}
      description={deleteBlockedByProducts
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
    <AttributeConfigurationDrawer open={attributeDrawerOpen} creating={isCreatingAttribute} value={attributeDraft} usage={attributeUsageByKey.get(attributeDraft.key) ?? []} onChange={setAttributeDraft} onClose={() => setAttributeDrawerOpen(false)} onSave={() => saveAttribute(attributeDraft)} saveLabel={returnTo ? 'Save & return to product' : undefined} />
    <BrandConfigurationDrawer open={brandDrawerOpen} creating={isCreatingBrand} tab={brandDrawerTab} onTabChange={setBrandDrawerTab} value={brandDraft} brands={brands} products={productsByBrand.get(brandDraft.id) ?? []} onChange={setBrandDraft} onClose={() => setBrandDrawerOpen(false)} onSave={() => saveBrand(brandDraft)} />
  </div>;
}

function ManagedCategoryConfigurationDrawer({ open, category, categories, initialParentId, creating, tab, attributes, onTabChange, onClose, onCreateAttribute, onSave, saveLabel }: { open: boolean; category: CategoryRow | null; categories: CatalogCategory[]; initialParentId: string | null; creating: boolean; tab: DrawerTab; attributes: AttributeDefinition[]; onTabChange: (tab: DrawerTab) => void; onClose: () => void; onCreateAttribute: (attribute: AttributeDefinition) => void; onSave: (category: CatalogCategory) => void; saveLabel?: string }) {
  const emptyMappings = Object.fromEntries(channelLabels.map(([key]) => [key, key === 'pos' || key === 'social' ? 'not_required' : 'needs_review'])) as Record<CatalogChannel, MappingStatus>;
  const [draft, setDraft] = useState<CatalogCategory>({ id: '', name: '', parentId: null, description: '', status: 'Active', source: 'internal', attributes: [], mappings: emptyMappings });
  const [showDescription, setShowDescription] = useState(false);
  const [attributePickerOpen, setAttributePickerOpen] = useState(false);
  const [attributePickerMode, setAttributePickerMode] = useState<'existing' | 'create'>('existing');
  const [attributeSearch, setAttributeSearch] = useState('');
  const [pendingAttributeKeys, setPendingAttributeKeys] = useState<string[]>([]);
  const [newAttribute, setNewAttribute] = useState<AttributeDefinition>(blankAttribute);
  const [newAttributeRequired, setNewAttributeRequired] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShowDescription(Boolean(category));
    const saved = category ? categories.find(item => item.id === category.id) : null;
    setDraft(saved ? { ...saved, attributes: saved.attributes.map(item => ({ ...item })), mappings: { ...saved.mappings } }
      : { id: '', name: '', parentId: initialParentId, description: '', status: 'Active', source: 'internal', attributes: [], mappings: emptyMappings });
  }, [open, category, categories, attributes, initialParentId]);

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
  const availableAttributes = attributes.filter(attribute => attribute.status === 'Active' && !draft.attributes.some(assignment => assignment.key === attribute.key) && `${attribute.name} ${attribute.description} ${attribute.type}`.toLowerCase().includes(attributeSearch.trim().toLowerCase()));
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
    const normalized: AttributeDefinition = { ...newAttribute, id: generatedNewAttributeKey, key: generatedNewAttributeKey, name: newAttribute.name.trim(), options: newAttribute.options.split(',').map(option => option.trim()).filter(Boolean).join(', '), categories: 1, status: 'Active', source: 'internal' };
    onCreateAttribute(normalized);
    setDraft(current => ({ ...current, attributes: [...current.attributes, { key: normalized.key, required: newAttributeRequired }] }));
    setAttributePickerOpen(false);
  }

  return <Sheet open={open} onOpenChange={next => !next && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[650px]">
    <SheetHeader className="border-b border-border px-6 py-5"><SheetTitle>{creating ? (initialParentId ? 'Create subcategory' : 'Create category') : 'Configure Category'}</SheetTitle><SheetDescription>{creating ? (initialParentId ? `Add a new category under ${selectedParent?.name ?? 'the selected parent'}.` : 'Create a root category or place it under an existing category.') : 'Manage the category details, product attributes, and channel mappings.'}</SheetDescription></SheetHeader>
    {creating ? <>
      <div className="flex-1 overflow-y-auto p-6 pb-28">
        <div className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="managed-category-name">Category name</Label>
            <Input id="managed-category-name" autoFocus value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value, id: slugify(event.target.value) })} placeholder="e.g. Art Supplies" />
            <p className="text-xs leading-5 text-muted-foreground">Use a clear name that your team will recognize when creating products.</p>
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
          <div className="grid gap-2"><Label htmlFor="managed-category-name">Category name</Label><Input id="managed-category-name" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value, id: creating ? slugify(event.target.value) : draft.id })} placeholder="e.g. Art Supplies" /></div>
          <div className="grid gap-2"><Label htmlFor="managed-category-description">Description</Label><Textarea id="managed-category-description" value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} rows={4} /></div>
          <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-semibold">Data source</p><p className="text-xs text-muted-foreground">Imported records require review before becoming canonical.</p></div><Badge variant="outline">{draft.source === 'internal' ? 'Internal' : 'Imported'}</Badge></div>
        </TabsContent>
        <TabsContent value="attributes" className="m-0 space-y-5">
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold">Assigned to this category</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">These fields appear automatically in Product Master when this category is selected.</p></div><Button type="button" size="sm" onClick={openAttributePicker}><Plus className="size-4" />Add attribute</Button></div>
          {assignedAttributes.length ? <div className="space-y-2">{assignedAttributes.map(({ definition: attribute, assignment }) => <div key={attribute.key} className="flex min-h-16 items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold">{attribute.name}</p><Badge variant="outline" className="text-[10px] font-medium">{attribute.type}</Badge></div><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{attribute.description || 'Reusable Product Master field'}</p></div><label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Switch checked={assignment.required} onCheckedChange={checked => toggleRequired(attribute.key, checked)} aria-label={`Make ${attribute.name} required`} />Required</label><Button type="button" variant="ghost" size="icon" aria-label={`Remove ${attribute.name} from category`} onClick={() => toggleAttribute(attribute.key, false)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></div>)}</div> : <div className="rounded-xl border border-dashed p-7 text-center"><p className="text-sm font-semibold">No attributes assigned</p><p className="mt-1 text-xs text-muted-foreground">Add reusable fields to define what Product Masters in this category need.</p><Button type="button" variant="outline" size="sm" className="mt-4" onClick={openAttributePicker}><Plus className="size-4" />Add first attribute</Button></div>}
        </TabsContent>
        <TabsContent value="mapping" className="m-0 space-y-3"><div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><p className="font-semibold">Channel data is a mapping, not the master taxonomy</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Map this internal category when you are ready to publish products to each channel.</p></div>{channelLabels.map(([key, label]) => <div key={key} className="flex items-center gap-3 rounded-xl border p-4"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{key === 'pos' || key === 'social' ? 'Category mapping is not required for this channel.' : 'Marketplace category mapping'}</p></div><select aria-label={`${label} mapping status`} value={draft.mappings[key]} disabled={key === 'pos' || key === 'social'} onChange={event => setDraft({ ...draft, mappings: { ...draft.mappings, [key]: event.target.value as MappingStatus } })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="mapped">Mapped</option><option value="needs_review">Not mapped</option><option value="not_required">Not required</option></select></div>)}</TabsContent>
      </div>
    </Tabs>
    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-background/95 p-4 backdrop-blur"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!draft.name.trim() || duplicateName} onClick={() => onSave({ ...draft, id: draft.id || slugify(draft.name) })}>{saveLabel ?? 'Save Configuration'}</Button></div>
    </>}
    <Dialog open={attributePickerOpen} onOpenChange={setAttributePickerOpen}><DialogContent className="max-w-xl p-0">
      <DialogHeader className="border-b px-6 py-5"><DialogTitle>Add attribute to category</DialogTitle><DialogDescription>{attributePickerMode === 'existing' ? 'Choose a reusable field. You can mark it as required after adding it.' : 'Create a reusable field and assign it without leaving this category.'}</DialogDescription></DialogHeader>
      <div className="px-6"><div className="grid grid-cols-2 rounded-lg bg-muted p-1"><button type="button" onClick={() => setAttributePickerMode('existing')} className={cn('min-h-9 rounded-md px-3 text-sm font-medium', attributePickerMode === 'existing' && 'bg-background text-foreground shadow-sm')}>Choose existing</button><button type="button" onClick={() => setAttributePickerMode('create')} className={cn('min-h-9 rounded-md px-3 text-sm font-medium', attributePickerMode === 'create' && 'bg-background text-foreground shadow-sm')}>Create new</button></div></div>
      {attributePickerMode === 'existing' ? <div className="space-y-3 px-6"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={attributeSearch} onChange={event => setAttributeSearch(event.target.value)} placeholder="Search name or field type..." className="pl-9" /></div><div className="max-h-72 space-y-2 overflow-y-auto">{availableAttributes.map(attribute => { const checked = pendingAttributeKeys.includes(attribute.key); return <label key={attribute.key} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/40"><Checkbox checked={checked} onCheckedChange={value => setPendingAttributeKeys(current => value === true ? [...current, attribute.key] : current.filter(key => key !== attribute.key))} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{attribute.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{attribute.type}{attribute.description ? ` · ${attribute.description}` : ''}</p></div></label>; })}{availableAttributes.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center"><p className="text-sm font-semibold">No matching attributes</p><button type="button" className="mt-2 text-sm font-semibold text-primary hover:underline" onClick={() => { setNewAttribute(current => ({ ...current, name: attributeSearch })); setAttributePickerMode('create'); }}>Create “{attributeSearch || 'a new attribute'}”</button></div> : null}</div></div> : <div className="space-y-4 px-6"><div className="grid gap-2"><Label htmlFor="inline-attribute-name">Attribute name</Label><Input id="inline-attribute-name" autoFocus value={newAttribute.name} onChange={event => setNewAttribute({ ...newAttribute, name: event.target.value })} placeholder="e.g. Lens material" />{duplicateNewAttribute ? <p className="text-xs font-medium text-destructive">An attribute with this name already exists. Choose it from Existing instead.</p> : null}</div><div className="grid gap-2"><Label htmlFor="inline-attribute-type">Field type</Label><select id="inline-attribute-type" value={newAttribute.type} onChange={event => setNewAttribute({ ...newAttribute, type: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option>Single-line text</option><option>Rich text</option><option>Number</option><option>Single select</option><option>Multi-select</option><option>Country selector</option><option>Measurement</option><option>Measurement set</option></select></div>{newAttributeNeedsOptions ? <div className="grid gap-2"><Label htmlFor="inline-attribute-options">Available values</Label><Textarea id="inline-attribute-options" rows={2} value={newAttribute.options} onChange={event => setNewAttribute({ ...newAttribute, options: event.target.value })} placeholder="Cotton, Leather, Metal" /><p className="text-xs text-muted-foreground">Separate values with commas.</p></div> : null}{['Measurement', 'Measurement set', 'Number'].includes(newAttribute.type) ? <div className="grid gap-2"><Label htmlFor="inline-attribute-unit">Default unit <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="inline-attribute-unit" value={newAttribute.unit} onChange={event => setNewAttribute({ ...newAttribute, unit: event.target.value })} placeholder="e.g. cm, kg" /></div> : null}<label className="flex items-center justify-between gap-4 rounded-lg border p-3"><div><p className="text-sm font-semibold">Required for this category</p><p className="mt-1 text-xs text-muted-foreground">Products cannot be saved without a value.</p></div><Switch checked={newAttributeRequired} onCheckedChange={setNewAttributeRequired} /></label></div>}
      <DialogFooter className="border-t px-6 py-4"><Button type="button" variant="outline" onClick={() => setAttributePickerOpen(false)}>Cancel</Button>{attributePickerMode === 'existing' ? <Button type="button" disabled={!pendingAttributeKeys.length} onClick={addSelectedAttributes}>Add {pendingAttributeKeys.length || ''} {pendingAttributeKeys.length === 1 ? 'attribute' : 'attributes'}</Button> : <Button type="button" disabled={!newAttribute.name.trim() || duplicateNewAttribute || !newAttributeOptionsValid} onClick={createAndAssignAttribute}>Create and add</Button>}</DialogFooter>
    </DialogContent></Dialog>
  </SheetContent></Sheet>;
}

function BrandDetailsPanel({ value, productsCount, onChange }: { value: BrandDefinition; productsCount: number; onChange: (value: BrandDefinition) => void }) {
  return <TabsContent value="details" className="m-0 space-y-5">
    <section className="space-y-4"><div><h3 className="text-sm font-semibold">Canonical identity</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">This is the Brand name Product Masters reference across PrimeOS.</p></div><div className="grid gap-4 sm:grid-cols-[1fr_180px]"><div className="grid gap-2"><Label htmlFor="brand-name">Brand name</Label><Input id="brand-name" value={value.name} onChange={event => onChange({ ...value, name: event.target.value })} /></div><label className="grid gap-2 text-sm font-medium">Status<select className="h-10 rounded-md border bg-background px-3" value={value.status} onChange={event => onChange({ ...value, status: event.target.value as BrandDefinition['status'] })}><option>Verified</option><option>Unverified</option><option>Inactive</option></select></label></div></section>
    <section className="space-y-3 border-t pt-5"><div><h3 className="text-sm font-semibold">Matching aliases</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Alternate names help imports and channels resolve to this canonical Brand.</p></div><Input id="brand-aliases" aria-label="Matching aliases" value={value.aliases.join(', ')} onChange={event => onChange({ ...value, aliases: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} placeholder="Add alternate names, separated by commas" /></section>
    <section className="border-t pt-5"><div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-4 py-3"><div><p className="text-xs font-semibold text-muted-foreground">System Brand code</p><p className="mt-1 font-mono text-sm">{value.code}</p></div><Badge variant="outline">{productsCount ? 'Locked' : 'Generated'}</Badge></div>{productsCount ? <p className="mt-2 text-xs text-muted-foreground">Locked because {productsCount} Product {productsCount === 1 ? 'Master uses' : 'Masters use'} this Brand.</p> : null}</section>
  </TabsContent>;
}

function BrandConfigurationDrawer({ open, creating, tab, onTabChange, value, brands, products, onChange, onClose, onSave }: { open: boolean; creating: boolean; tab: BrandDrawerTab; onTabChange: (tab: BrandDrawerTab) => void; value: BrandDefinition; brands: BrandDefinition[]; products: Array<{ id: string; name: string; sku_code: string }>; onChange: (value: BrandDefinition) => void; onClose: () => void; onSave: () => void }) {
  const marketplaceChannels: Array<[CatalogChannel, string, string]> = [['amazon', 'Amazon', 'Brand name'], ['shopee', 'Shopee', 'Brand ID'], ['lazada', 'Lazada', 'Brand ID'], ['tiktok', 'TikTok Shop', 'Brand ID'], ['rakuten', 'Rakuten', 'Brand name']];
  const duplicateBrand = creating && Boolean(value.name.trim()) && brands.some(brand => brand.name.trim().toLowerCase() === value.name.trim().toLowerCase());

  return <Sheet open={open} onOpenChange={next => !next && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[600px]"><SheetHeader className="border-b border-border px-6 py-5"><SheetTitle>{creating ? 'Add Brand' : value.name}</SheetTitle><SheetDescription>{creating ? 'Create the canonical brand first. Product usage and channel mapping can be configured later.' : 'Manage the canonical identity, Product Master usage and marketplace mappings.'}</SheetDescription></SheetHeader>
    {creating ? <><div className="flex-1 overflow-y-auto p-6"><div className="grid gap-2"><Label htmlFor="brand-name">Brand name</Label><Input id="brand-name" autoFocus aria-invalid={duplicateBrand} value={value.name} onChange={event => onChange({ ...value, name: event.target.value, code: slugify(event.target.value).replace(/-/g, '_').toUpperCase() })} onKeyDown={event => { if (event.key === 'Enter' && value.name.trim() && !duplicateBrand) { event.preventDefault(); onSave(); } }} placeholder="e.g. Cyber Records" />{duplicateBrand ? <p className="text-xs font-medium text-destructive">A brand with this name already exists. Select or edit the existing Brand instead.</p> : null}</div></div><div className="flex shrink-0 justify-end gap-2 border-t bg-background p-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={!value.name.trim() || duplicateBrand}>Create Brand</Button></div></> : <><Tabs value={tab} onValueChange={next => onTabChange(next as BrandDrawerTab)} className="flex min-h-0 flex-1 flex-col"><TabsList className="h-auto w-full justify-start rounded-none border-b bg-background px-4 py-0"><TabsTrigger value="details" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Details</TabsTrigger><TabsTrigger value="usage" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Product usage <Badge variant="secondary" className="ml-1.5">{products.length}</Badge></TabsTrigger><TabsTrigger value="mapping" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Channel mapping</TabsTrigger></TabsList><div className="flex-1 overflow-y-auto p-6"><BrandDetailsPanel value={value} productsCount={products.length} onChange={onChange} /><TabsContent value="usage" className="m-0 space-y-3">{products.length ? products.map(product => <div key={product.id} className="rounded-xl border p-4"><p className="text-sm font-semibold">{product.name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku_code}</p></div>) : <div className="rounded-xl border border-dashed p-8 text-center"><p className="text-sm font-semibold">No Product Masters use this brand</p><p className="mt-1 text-xs text-muted-foreground">It can be safely renamed or removed from the catalog.</p></div>}</TabsContent><TabsContent value="mapping" className="m-0 space-y-3"><div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="text-sm font-semibold">Map only the channels you publish to</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Blank channels stay unmapped and do not block Product Master.</p></div>{marketplaceChannels.map(([key, label, fieldLabel]) => { const mapped = Boolean(value.mappings[key]); return <div key={key} className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{label}</p><p className="mt-0.5 text-xs text-muted-foreground">{mapped ? 'Mapped' : 'Not mapped'}</p></div><span className={cn('size-2 rounded-full', mapped ? 'bg-emerald-500' : 'bg-slate-300')} /></div><div className="grid gap-2"><Label htmlFor={`brand-${key}`}>{fieldLabel}</Label><Input id={`brand-${key}`} value={value.mappings[key] ?? ''} onChange={event => onChange({ ...value, mappings: { ...value.mappings, [key]: event.target.value } })} placeholder={`Enter ${label} ${fieldLabel.toLowerCase()}`} /></div></div>; })}</TabsContent></div></Tabs><div className="flex shrink-0 justify-end gap-2 border-t bg-background p-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={!value.name.trim() || !value.code.trim()}>Save changes</Button></div></>}
  </SheetContent></Sheet>;
}

function AttributeConfigurationDrawer({ open, creating, value, usage, onChange, onClose, onSave, saveLabel }: { open: boolean; creating: boolean; value: AttributeDefinition; usage: AttributeUsageItem[]; onChange: (value: AttributeDefinition) => void; onClose: () => void; onSave: () => void; saveLabel?: string }) {
  const needsOptions = value.type === 'Single select' || value.type === 'Multi-select';
  const needsUnit = value.type === 'Measurement' || value.type === 'Measurement set' || value.type === 'Number';
  const definitionLocked = !creating && usage.length > 0;
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const optionItems = value.options.split(',').map(option => option.trim()).filter(Boolean);
  const normalizedOptionItems = optionItems.map(option => option.toLowerCase());
  const hasDuplicateOptions = new Set(normalizedOptionItems).size !== normalizedOptionItems.length;
  const optionError = needsOptions && optionItems.length === 0
    ? 'Add at least one option for this field type.'
    : needsOptions && hasDuplicateOptions
      ? 'Remove duplicate options before saving.'
      : '';
  const validationHelp = needsOptions
    ? 'An optional rule applied when Product Master data is saved, such as requiring at least one selection or limiting how many values can be selected.'
    : needsUnit
      ? 'An optional rule applied when Product Master data is saved, such as minimum 0, maximum 100, or a required measurement range.'
      : 'An optional rule applied when Product Master data is saved, such as required text, maximum 100 characters, or a specific text format.';

  useEffect(() => { if (open) setTechnicalOpen(false); }, [open, creating, value.id]);

  const definitionForm = <div className="space-y-5">
    <div className="grid gap-2"><Label htmlFor="attribute-name">Attribute name <span className="text-destructive">*</span></Label><Input id="attribute-name" autoFocus value={value.name} onChange={event => onChange({ ...value, name: event.target.value, key: creating ? slugify(event.target.value).replace(/-/g, '_') : value.key })} placeholder="e.g. Material" /></div>
    <div className="grid gap-2"><div className="flex items-center gap-1"><Label htmlFor="attribute-field-type">Field type <span className="text-destructive">*</span></Label><FieldHelp label="Field type">Controls how users enter this value in Product Master. Choose text, select, number or measurement based on the data you need to capture.</FieldHelp></div>{definitionLocked ? <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-muted/30 px-3"><span className="text-sm font-medium">{value.type}</span><span className="text-xs text-muted-foreground">Locked · used by {usage.length} {usage.length === 1 ? 'category' : 'categories'}</span></div> : <select id="attribute-field-type" value={value.type} onChange={event => onChange({ ...value, type: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option>Single-line text</option><option>Rich text</option><option>Number</option><option>Single select</option><option>Multi-select</option><option>Country selector</option><option>Measurement</option><option>Measurement set</option></select>}</div>
    {needsOptions ? <div className="grid gap-2"><div className="flex items-center gap-1"><Label htmlFor="attribute-options">Options <span className="text-destructive">*</span></Label><FieldHelp label="Options">The predefined values available in Product Master. Single-select allows one option; multi-select allows several.</FieldHelp></div><Textarea id="attribute-options" value={value.options} onChange={event => onChange({ ...value, options: event.target.value })} rows={2} placeholder="Cotton, Leather, Metal" aria-invalid={Boolean(optionError)} aria-describedby={optionError ? 'attribute-options-error' : 'attribute-options-help'} className={cn(optionError && 'border-destructive focus-visible:ring-destructive')} />{optionError ? <p id="attribute-options-error" className="text-xs font-medium text-destructive">{optionError}</p> : <p id="attribute-options-help" className="text-xs text-muted-foreground">Add the options users can select for this attribute. Separate each option with a comma.</p>}</div> : null}
    {needsUnit ? <div className="grid gap-2"><Label htmlFor="attribute-unit">Default unit</Label><Input id="attribute-unit" value={value.unit} onChange={event => onChange({ ...value, unit: event.target.value })} placeholder="e.g. cm, kg, ml" /></div> : null}

    {!creating && technicalOpen ? <section className="space-y-4 rounded-xl border bg-muted/20 p-4"><div><p className="text-sm font-semibold">Technical settings</p><p className="mt-1 text-xs text-muted-foreground">Only change these values when an integration or data rule requires it.</p></div><div className="grid gap-2"><div className="flex items-center gap-1"><Label htmlFor="attribute-key">Internal key</Label><FieldHelp label="Internal key">Generated automatically from the attribute name and used by APIs and stored product data. Change it only when an integration requires a specific key.</FieldHelp></div>{definitionLocked ? <code id="attribute-key" className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{value.key}</code> : <Input id="attribute-key" value={value.key} onChange={event => onChange({ ...value, key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="material" className="font-mono" />}</div><div className="grid gap-2"><div className="flex items-center gap-1"><Label htmlFor="attribute-validation">Validation rule <span className="font-normal text-muted-foreground">(optional)</span></Label><FieldHelp label="Validation rule">{validationHelp}</FieldHelp></div><Input id="attribute-validation" value={value.validation} onChange={event => onChange({ ...value, validation: event.target.value })} placeholder="e.g. Maximum 100 characters" /></div></section> : null}

    {!creating ? <label className="flex items-center justify-between gap-4 rounded-xl border p-4"><div><p className="text-sm font-semibold">Available for assignment</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Turn off to prevent new category assignments.</p></div><Switch checked={value.status === 'Active'} onCheckedChange={checked => onChange({ ...value, status: checked ? 'Active' : 'Inactive' })} aria-label="Available for assignment" /></label> : null}
  </div>;

  return <Sheet open={open} onOpenChange={nextOpen => !nextOpen && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[600px]">
    <SheetHeader className="border-b border-slate-200 px-6 py-5"><SheetTitle>{creating ? 'Add Attribute' : value.name}</SheetTitle><SheetDescription>{creating ? 'Create a reusable field for Product Master.' : 'Manage its values, rules and category usage.'}</SheetDescription></SheetHeader>
    {creating ? <div className="flex-1 overflow-y-auto p-6 pb-28">{definitionForm}</div> : <Tabs defaultValue="definition" className="flex min-h-0 flex-1 flex-col">
      <TabsList className="h-auto w-full justify-start rounded-none border-b bg-background px-4 py-0">
        <TabsTrigger value="definition" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Definition</TabsTrigger>
        <TabsTrigger value="usage" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">Usage <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-[10px]">{usage.length}</Badge></TabsTrigger>
        <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="ml-auto" aria-label="More attribute actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setTechnicalOpen(true)}>Technical settings</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </TabsList>
      <div className="flex-1 overflow-y-auto p-6 pb-28">
        <TabsContent value="definition" className="m-0">{definitionForm}</TabsContent>
        <TabsContent value="usage" className="m-0 space-y-4"><div><h3 className="text-sm font-semibold">Category usage</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Open a category to assign this attribute or change whether it is required.</p></div>{usage.length ? <div className="divide-y rounded-xl border">{usage.map(item => <div key={item.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.path}</p></div><Badge variant="outline" className={cn('shrink-0', item.required && 'border-primary/30 bg-primary/5 text-primary')}>{item.required ? 'Required' : 'Optional'}</Badge></div>)}</div> : <div className="rounded-xl border border-dashed p-6 text-center"><p className="text-sm font-semibold">Not assigned yet</p><p className="mt-1 text-xs leading-5 text-muted-foreground">This attribute is safe to edit or delete because no category uses it.</p></div>}</TabsContent>
      </div>
    </Tabs>}
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={onSave} disabled={!value.name.trim() || !value.key.trim() || Boolean(optionError)}>{saveLabel ?? (creating ? 'Create Attribute' : 'Save Attribute')}</Button></div>
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
