import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, CloudUpload, Eye, Loader2, Pencil, RefreshCw, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  type AmazonListingDraft,
  createAmazonListingDraft,
  getAmazonListing,
  saveAmazonListing,
  updateAmazonListing,
} from '@/lib/amazon-listing-store';
import { getProductById } from '@/lib/product-store';
import { cn } from '@/lib/utils';

type ValidationErrors = Partial<Record<'title' | 'bullets' | 'searchTerms' | 'category' | 'price' | 'quantity', string>>;

function validate(listing: AmazonListingDraft): ValidationErrors {
  const errors: ValidationErrors = {};
  if (listing.title.trim().length < 10 || listing.title.length > 200) errors.title = 'Use an Amazon title between 10 and 200 characters.';
  const completedBullets = listing.bulletPoints.filter(value => value.trim().length >= 10);
  if (completedBullets.length < 3) errors.bullets = 'Add at least 3 bullet points with 10 or more characters.';
  if (listing.searchTerms.length > 250) errors.searchTerms = 'Search terms must stay within 250 characters.';
  if (!listing.category.trim()) errors.category = 'Select an Amazon category before submission.';
  if (listing.price <= 0) errors.price = 'Price must be greater than zero.';
  if (listing.fulfillment === 'FBM' && listing.quantity < 1) errors.quantity = 'FBM listings need at least one available unit.';
  return errors;
}

const statusMeta = {
  draft: { label: 'Draft', tone: 'border-slate-200 bg-slate-50 text-slate-700' },
  queued: { label: 'Queued', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  syncing: { label: 'Syncing', tone: 'border-blue-200 bg-blue-50 text-blue-800' },
  synced: { label: 'Synced', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  error: { label: 'Error', tone: 'border-rose-200 bg-rose-50 text-rose-800' },
} as const;

export default function AmazonListingDetail() {
  const { productId = '' } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const product = getProductById(productId);
  const [listing, setListing] = useState<AmazonListingDraft | null>(() => product ? getAmazonListing(product) : null);
  const [savedListing, setSavedListing] = useState<AmazonListingDraft | null>(() => product ? getAmazonListing(product) : null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [activeTab, setActiveTab] = useState('edit');
  const [isChecking, setIsChecking] = useState(false);
  const [readinessChecked, setReadinessChecked] = useState(false);
  const [simulateError, setSimulateError] = useState(false);

  const isDirty = Boolean(listing && savedListing && JSON.stringify(listing) !== JSON.stringify(savedListing));
  const issueCount = Object.keys(errors).length;
  const canSubmit = readinessChecked && issueCount === 0 && !isDirty && listing?.status !== 'queued' && listing?.status !== 'syncing';
  const inherited = useMemo(() => product ? createAmazonListingDraft(product) : null, [product]);

  useEffect(() => {
    if (isDirty && readinessChecked) setReadinessChecked(false);
  }, [isDirty, readinessChecked]);

  if (!product || !listing || !savedListing || !inherited) {
    return <div className="p-6"><Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Amazon listing unavailable</AlertTitle><AlertDescription>The Product Master record could not be found.</AlertDescription></Alert><Button className="mt-4" variant="outline" onClick={() => navigate('/products/master-catalog')}><ArrowLeft className="size-4" />Back to Product Master</Button></div>;
  }

  const update = <K extends keyof AmazonListingDraft>(key: K, value: AmazonListingDraft[K]) => setListing(current => current ? { ...current, [key]: value } : current);

  function handleSave() {
    const saved = saveAmazonListing(listing!);
    setListing(saved);
    setSavedListing(saved);
    setReadinessChecked(false);
    toast({ title: 'Amazon draft saved', description: 'Only the Amazon listing override was updated.' });
  }

  function handleCheck() {
    setIsChecking(true);
    window.setTimeout(() => {
      const nextErrors = validate(listing!);
      setErrors(nextErrors);
      setReadinessChecked(true);
      setIsChecking(false);
      if (Object.keys(nextErrors).length) setActiveTab('edit');
      toast({
        title: Object.keys(nextErrors).length ? 'Amazon listing needs attention' : 'Amazon listing is ready',
        description: Object.keys(nextErrors).length ? `${Object.keys(nextErrors).length} requirement(s) must be resolved.` : 'Preview the channel-only changes before submission.',
        variant: Object.keys(nextErrors).length ? 'destructive' : undefined,
      });
    }, 650);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const queued = updateAmazonListing(productId, { status: 'queued', lastError: null });
    setListing(queued);
    setSavedListing(queued);
    toast({ title: 'Amazon update queued', description: 'The Product Master record was not changed.' });
    window.setTimeout(() => {
      const syncing = updateAmazonListing(productId, { status: 'syncing' });
      setListing(syncing);
      setSavedListing(syncing);
    }, 700);
    window.setTimeout(() => {
      const finalListing = updateAmazonListing(productId, simulateError
        ? { status: 'error', lastError: 'Amazon rejected the category/attribute combination.' }
        : { status: 'synced', lastSyncedAt: new Date().toISOString(), lastError: null });
      setListing(finalListing);
      setSavedListing(finalListing);
      toast({ title: simulateError ? 'Amazon sync failed' : 'Amazon listing synced', description: simulateError ? 'Review the response and retry after correcting the listing.' : 'The Amazon-only update completed successfully.', variant: simulateError ? 'destructive' : undefined });
    }, 1800);
  }

  const meta = statusMeta[listing.status];
  const changes = [
    ['Title', inherited.title, listing.title],
    ['Category', inherited.category, listing.category],
    ['Fulfillment', inherited.fulfillment, listing.fulfillment],
    ['Price', String(inherited.price), String(listing.price)],
    ['Search terms', inherited.searchTerms, listing.searchTerms],
  ].filter(([, before, after]) => before !== after);

  return <div className="min-h-full bg-background">
    <header className="sticky top-0 z-40 border-b bg-card/95 px-4 py-4 backdrop-blur sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/products/master-catalog')} aria-label="Back to Product Master"><ArrowLeft className="size-4" /></Button>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-xl font-semibold">Amazon Listing Detail</h1><Badge variant="outline" className={meta.tone}>{listing.status === 'syncing' ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}{meta.label}</Badge></div><p className="truncate text-sm text-muted-foreground">{product.name} · {product.sku_code}</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={handleSave} disabled={!isDirty || listing.status === 'syncing'}><Check className="size-4" />Save Amazon draft</Button><Button onClick={isDirty ? handleSave : readinessChecked && issueCount === 0 ? handleSubmit : handleCheck} disabled={isChecking || listing.status === 'queued' || listing.status === 'syncing'}>{isChecking || listing.status === 'syncing' ? <Loader2 className="size-4 animate-spin" /> : readinessChecked && issueCount === 0 && !isDirty ? <CloudUpload className="size-4" /> : <RefreshCw className="size-4" />}{isDirty ? 'Save changes' : readinessChecked && issueCount === 0 ? 'Submit to Amazon' : 'Check readiness'}</Button></div>
      </div>
    </header>

    <main className="mx-auto grid max-w-7xl gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
        <TabsList className="mb-3"><TabsTrigger value="edit"><Pencil className="size-4" />Edit listing</TabsTrigger><TabsTrigger value="preview"><Eye className="size-4" />Preview changes</TabsTrigger></TabsList>
        <TabsContent value="edit" className="space-y-5">
          {listing.lastError ? <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Amazon rejected the last update</AlertTitle><AlertDescription>{listing.lastError}</AlertDescription></Alert> : null}
          <Card><CardHeader><CardTitle className="text-base">Amazon content</CardTitle></CardHeader><CardContent className="space-y-5">
            <div><Label htmlFor="amazon-title">Listing title</Label><Input id="amazon-title" className="mt-2" value={listing.title} maxLength={200} onChange={event => update('title', event.target.value)} aria-invalid={Boolean(errors.title)} /><div className="mt-1 flex justify-between text-xs"><span className="text-destructive" role={errors.title ? 'alert' : undefined}>{errors.title}</span><span className="text-muted-foreground">{listing.title.length}/200</span></div></div>
            <div><Label>Bullet points</Label><div className="mt-2 space-y-2">{listing.bulletPoints.map((bullet, index) => <div key={index} className="flex gap-2"><span className="mt-3 w-5 text-xs font-semibold text-muted-foreground">{index + 1}</span><Input value={bullet} maxLength={250} onChange={event => update('bulletPoints', listing.bulletPoints.map((value, bulletIndex) => bulletIndex === index ? event.target.value : value))} aria-label={`Amazon bullet point ${index + 1}`} /></div>)}</div>{errors.bullets ? <p className="mt-1 text-xs text-destructive" role="alert">{errors.bullets}</p> : null}</div>
            <div><Label htmlFor="amazon-search-terms">Backend search terms</Label><Textarea id="amazon-search-terms" className="mt-2" value={listing.searchTerms} maxLength={300} onChange={event => update('searchTerms', event.target.value)} aria-invalid={Boolean(errors.searchTerms)} /><div className="mt-1 flex justify-between text-xs"><span className="text-destructive" role={errors.searchTerms ? 'alert' : undefined}>{errors.searchTerms}</span><span className="text-muted-foreground">{listing.searchTerms.length}/250 recommended</span></div></div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Amazon offer and fulfillment</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
            <div><Label>Amazon category</Label><Select value={listing.category} onValueChange={value => update('category', value)}><SelectTrigger className="mt-2" aria-invalid={Boolean(errors.category)}><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{['Office Products', 'Arts, Crafts & Sewing', 'Beauty', 'Home & Kitchen', 'Electronics'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>{errors.category ? <p className="mt-1 text-xs text-destructive" role="alert">{errors.category}</p> : null}</div>
            <div><Label>Fulfillment</Label><Select value={listing.fulfillment} onValueChange={value => update('fulfillment', value as 'FBA' | 'FBM')}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FBA">FBA — Fulfilled by Amazon</SelectItem><SelectItem value="FBM">FBM — Merchant fulfilled</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="amazon-price">Amazon price</Label><Input id="amazon-price" className="mt-2" type="number" min="0" value={listing.price} onChange={event => update('price', Number(event.target.value))} aria-invalid={Boolean(errors.price)} />{errors.price ? <p className="mt-1 text-xs text-destructive" role="alert">{errors.price}</p> : null}</div>
            <div><Label htmlFor="amazon-quantity">Merchant quantity</Label><Input id="amazon-quantity" className="mt-2" type="number" min="0" value={listing.quantity} disabled={listing.fulfillment === 'FBA'} onChange={event => update('quantity', Number(event.target.value))} aria-invalid={Boolean(errors.quantity)} /><p className="mt-1 text-xs text-muted-foreground">{listing.fulfillment === 'FBA' ? 'Inventory is managed by Amazon.' : errors.quantity || 'Quantity sent only to Amazon.'}</p></div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="preview"><Card><CardHeader><CardTitle className="text-base">Channel-only change preview</CardTitle></CardHeader><CardContent>{changes.length ? <div className="divide-y rounded-lg border">{changes.map(([label, before, after]) => <div key={label} className="grid gap-2 p-4 sm:grid-cols-[140px_1fr_1fr]"><strong className="text-sm">{label}</strong><div><p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Product Master</p><p className="break-words text-sm text-muted-foreground">{before || '—'}</p></div><div><p className="mb-1 text-[11px] font-semibold uppercase text-primary">Amazon override</p><p className="break-words text-sm font-medium">{after || '—'}</p></div></div>)}</div> : <div className="py-12 text-center"><CheckCircle2 className="mx-auto size-8 text-emerald-600" /><p className="mt-3 font-semibold">No Amazon overrides differ from Product Master</p></div>}<Alert className="mt-4"><AlertCircle className="size-4" /><AlertTitle>Scope protection</AlertTitle><AlertDescription>Submitting this preview updates Amazon only. Product Master and other channels remain unchanged.</AlertDescription></Alert></CardContent></Card></TabsContent>
      </Tabs>

      <aside className="space-y-4">
        <Card><CardHeader><CardTitle className="text-sm">Amazon readiness</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Validation</span><strong className={cn('text-sm', readinessChecked && issueCount === 0 ? 'text-emerald-700' : issueCount ? 'text-rose-700' : 'text-amber-700')}>{isChecking ? 'Checking…' : readinessChecked ? issueCount ? `${issueCount} issues` : 'Ready' : 'Not checked'}</strong></div><Button className="w-full" variant="outline" onClick={handleCheck} disabled={isDirty || isChecking}>{isChecking ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Run readiness check</Button>{isDirty ? <p className="text-xs text-amber-700">Save the Amazon draft before validating.</p> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Submission status</CardTitle></CardHeader><CardContent><ol className="space-y-3">{['queued', 'syncing', 'synced'].map((status, index) => { const order = { draft: -1, queued: 0, syncing: 1, synced: 2, error: 1 }[listing.status]; const done = order >= index; return <li key={status} className="flex items-center gap-2 text-sm"><span className={cn('grid size-6 place-items-center rounded-full border text-xs', done ? 'border-emerald-500 bg-emerald-500 text-white' : 'text-muted-foreground')}>{done ? <Check className="size-3" /> : index + 1}</span><span className={done ? 'font-medium' : 'text-muted-foreground'}>{status === 'queued' ? 'Queued' : status === 'syncing' ? 'Syncing with Amazon' : 'Synced'}</span></li>; })}</ol>{listing.lastSyncedAt ? <p className="mt-4 text-xs text-muted-foreground">Last synced {new Date(listing.lastSyncedAt).toLocaleString()}</p> : null}</CardContent></Card>
        <Card><CardContent className="pt-6"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={simulateError} onChange={event => setSimulateError(event.target.checked)} className="mt-1" /><span><span className="block text-sm font-medium">Simulate Amazon error</span><span className="mt-1 block text-xs text-muted-foreground">Prototype-only control for testing recovery.</span></span></label>{listing.status === 'error' ? <Button className="mt-4 w-full" variant="outline" onClick={() => { const reset = updateAmazonListing(productId, { status: 'draft', lastError: null }); setListing(reset); setSavedListing(reset); setReadinessChecked(false); }}><RotateCcw className="size-4" />Return to draft</Button> : null}</CardContent></Card>
      </aside>
    </main>
  </div>;
}
