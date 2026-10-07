import { useId } from 'react';
import { ArrowRight, CheckCircle2, FilePenLine, FileSpreadsheet, ListChecks, Loader2, PackagePlus, Plus, ShieldCheck, Store } from 'lucide-react';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { Button } from '@/components/ui/button';
import { productGettingStartedState, type ChannelSetupSnapshot, type ProductOnboardingPreview } from '@/lib/product-onboarding';
import styles from './ProductGettingStarted.module.css';

function MasterIllustration({ pendingCount, sourceChannels }: { pendingCount: number; sourceChannels: Array<{ key: string; label: string }> }) {
  const id = useId();
  const sourceNames = sourceChannels.map(channel => channel.label).join(', ');

  return <div role="img" aria-label={`${sourceNames || 'Shop'} listings to Product Master`} className="relative mx-auto flex w-full max-w-80 items-center justify-center gap-2">
    <div className="min-w-0 flex-1 text-center">
      <div className="flex justify-center -space-x-3" aria-hidden="true">
        {sourceChannels.length ? sourceChannels.map(channel => <span key={channel.key} className={styles.shopAvatar}><ChannelLogo channel={channel} size="lg" /></span>) : <span className={styles.shopAvatar}><Store className="size-6 text-muted-foreground" /></span>}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{sourceChannels.length ? sourceChannels.map(channel => channel.label).join(' · ') : 'Shop listings'}</p>
    </div>
    <svg aria-hidden="true" viewBox="0 0 44 16" className="mb-6 h-4 w-9 shrink-0 sm:w-11">
      <defs><linearGradient id={`${id}-ray`} gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="44" y2="8"><stop stopColor="hsl(var(--primary-hover))" stopOpacity=".4" /><stop offset="1" stopColor="hsl(var(--primary-hover))" /></linearGradient></defs>
      <path d="M1 8H43" stroke={`url(#${id}-ray)`} strokeWidth="1.5" strokeDasharray="3 4" />
      <circle cx="40" cy="8" r="2.5" fill="hsl(var(--primary-hover))" />
    </svg>
    <div className="relative w-28 shrink-0 text-center">
      <span className={styles.itemBadge}>{pendingCount} {pendingCount === 1 ? 'listing' : 'listings'}</span>
      <svg aria-hidden="true" viewBox="0 0 120 132" className={styles.masterCube}>
        <defs>
          <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="hsl(var(--primary-hover))" /><stop offset="1" stopColor="hsl(var(--primary))" /></linearGradient>
          <linearGradient id={`${id}-left`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="hsl(var(--primary))" /><stop offset="1" stopColor="hsl(var(--primary-soft))" /></linearGradient>
          <linearGradient id={`${id}-right`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="hsl(var(--primary-hover))" /><stop offset="1" stopColor="hsl(var(--primary-soft))" /></linearGradient>
        </defs>
        <path d="M60 14 106 40 60 66 14 40Z" fill={`url(#${id}-top)`} />
        <path d="M14 40 60 66V118L14 92Z" fill={`url(#${id}-left)`} />
        <path d="m60 66 46-26v52l-46 26Z" fill={`url(#${id}-right)`} />
        <path d="M14 40 60 14l46 26v52l-46 26-46-26V40l46 26 46-26M60 66v52" fill="none" stroke="hsl(var(--surface-highlight) / .3)" strokeWidth="1" strokeLinejoin="round" />
        <path d="m37 27 46 26v16l-9 5V58L28 32Z" fill="hsl(var(--surface-highlight) / .18)" />
      </svg>
      <p className="mt-1 text-xs font-medium text-foreground">Product Master</p>
    </div>
  </div>;
}

export function ProductGettingStarted({ snapshot, pendingCount, createdCount = 0, sourceChannels = [], preview, onReview, onImport, onCreate, onRetry, onShops, onConnect }: {
  createdCount?: number;
  snapshot: ChannelSetupSnapshot; pendingCount: number;
  sourceChannels?: Array<{ key: string; label: string }>;
  preview?: ProductOnboardingPreview;
  onReview: () => void; onImport: () => void; onCreate: () => void; onRetry: () => void; onShops: () => void; onConnect: () => void;
}) {
  const state = productGettingStartedState(snapshot, pendingCount, preview);
  const hasListings = state.kind === 'listings';
  const hasNoChannels = state.kind === 'no-channels';
  const hasHero = hasListings || hasNoChannels;
  const heroClass = `${styles.hero} grid items-center gap-8 rounded-2xl p-6 sm:p-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:p-10 xl:grid-cols-[20rem_minmax(0,1fr)] xl:gap-10`;
  const actionCardClass = `${styles.actionCard} group flex min-w-0 cursor-pointer flex-col items-start rounded-2xl border p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`;

  return <section aria-labelledby="product-start-title" className="mx-auto w-full max-w-6xl py-2">
    <h2 id="product-start-title" className={hasHero ? 'sr-only' : 'mb-5 text-xl font-semibold tracking-tight'}>Start your product catalog</h2>

    {hasListings && <section aria-labelledby="recommended-product-start" className={heroClass}>
      <MasterIllustration pendingCount={pendingCount} sourceChannels={sourceChannels} />
      <div className="relative min-w-0">
        <p className={styles.recommended}><span aria-hidden="true" className={styles.recommendedDot} />Recommended</p>
        <h3 id="recommended-product-start" className={`${styles.heroTitle} mt-3 text-xl font-semibold leading-snug tracking-tight sm:text-2xl`}>{createdCount ? 'Continue building your product catalog' : 'Create your first Product Masters'}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{createdCount ? `${createdCount} Master${createdCount === 1 ? '' : 's'} created in this preview. ${pendingCount} listing${pendingCount === 1 ? '' : 's'} left to review.` : `Start with data from ${pendingCount} imported shop ${pendingCount === 1 ? 'listing' : 'listings'}. Review and create Masters without re-entering it.`}</p>
        <Button className={`${styles.reviewButton} mt-5 min-h-11 px-5`} onClick={onReview}>Review listings<ArrowRight aria-hidden="true" className="size-4" /></Button>
      </div>
    </section>}

    {hasNoChannels && <section aria-labelledby="connect-product-start" className={heroClass}>
      <div role="img" aria-label="Add your first shop connection" className="relative mx-auto grid min-h-40 w-full max-w-80 place-items-center">
        <div className={styles.connectIllustration}><Store aria-hidden="true" className="size-16" strokeWidth={1.25} /><span className={styles.connectPlus}><Plus aria-hidden="true" className="size-5" /></span></div>
      </div>
      <div className="relative min-w-0">
        <h3 id="connect-product-start" className={`${styles.heroTitle} text-xl font-semibold leading-snug tracking-tight sm:text-2xl`}>{state.title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{state.detail}</p>
        <Button className={`${styles.reviewButton} mt-5 min-h-11 px-5`} onClick={onConnect}>{state.action}<ArrowRight aria-hidden="true" className="size-4" /></Button>
      </div>
    </section>}

    <div className={hasHero ? 'mt-7' : ''}>
      <p className="mb-3 text-sm text-muted-foreground">{hasNoChannels ? 'Or start without a channel' : hasListings ? 'Or start another way' : 'Choose how to start'}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <button type="button" aria-labelledby="import-product-start" aria-describedby="import-product-description" onClick={onImport} className={actionCardClass}>
          <span className={`${styles.actionIcon} mb-4 grid size-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}><FileSpreadsheet aria-hidden="true" className="size-6" strokeWidth={1.5} /></span>
          <span id="import-product-start" className="text-lg font-semibold text-foreground">Import Excel / CSV</span>
          <span id="import-product-description" className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">Add products from an existing file.</span>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground">Upload file<ArrowRight aria-hidden="true" className="size-4" /></span>
        </button>
        <button type="button" aria-labelledby="create-product-start" aria-describedby="create-product-description" onClick={onCreate} className={actionCardClass}>
          <span className={`${styles.actionIcon} mb-4 grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300`}><PackagePlus aria-hidden="true" className="size-6" strokeWidth={1.5} /></span>
          <span id="create-product-start" className="text-lg font-semibold text-foreground">Create a new product</span>
          <span id="create-product-description" className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">Add a single product or variants.</span>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground">Create Product Master<ArrowRight aria-hidden="true" className="size-4" /></span>
        </button>
      </div>
    </div>

    {!hasHero && <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
      <div className="min-w-0 flex-1 basis-64" role="status">
        <p className="flex items-center gap-2 text-sm font-semibold">{state.kind === 'loading' && <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}{state.title}</p>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{state.detail}</p>
      </div>
      {state.action && <Button variant="outline" className="min-h-11" onClick={state.kind === 'error' ? onRetry : onShops}>{state.action}<ArrowRight aria-hidden="true" className="size-4" /></Button>}
    </div>}

    <div className="mt-6 border-t border-border pt-5">
      <ol aria-label="Product setup steps" className="flex flex-col flex-wrap gap-x-4 gap-y-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
        {[{ label: 'Add or review', Icon: ListChecks }, { label: 'Complete details', Icon: FilePenLine }, { label: 'Activate Master', Icon: CheckCircle2 }].map(({ label, Icon }, index) => <li key={label} className="flex items-center gap-2"><Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} /><span>{index + 1}. {label}</span>{index < 2 && <span aria-hidden="true" className="ml-2 hidden h-px w-8 bg-border sm:block" />}</li>)}
      </ol>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />Creating or activating a Master never publishes to your shops automatically.</p>
    </div>
  </section>;
}
