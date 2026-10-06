import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, BookOpen, Check, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const preferenceKey = 'prime-listing-review-guide-dismissed-v1';

function shouldShowGuide(hasListings: boolean) {
  if (!hasListings) return false;
  try { return localStorage.getItem(preferenceKey) !== '1'; }
  catch { return true; }
}

export function ListingReviewGuide({ hasListings, actionContainer }: { hasListings: boolean; actionContainer?: HTMLElement | null }) {
  // Prototype preference is local to this browser, not a change to any listing or Master.
  const [expanded, setExpanded] = useState(() => shouldShowGuide(hasListings));
  const contentId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const toggle = () => {
    if (expanded) {
      try { localStorage.setItem(preferenceKey, '1'); }
      catch { /* The guide can still be collapsed when browser storage is unavailable. */ }
    }
    setExpanded(value => !value);
    requestAnimationFrame(() => trigger.current?.focus());
  };

  const headerAction = actionContainer && createPortal(
    <Button ref={trigger} variant="ghost" className="h-11 shrink-0 aria-expanded:bg-muted" aria-expanded={expanded} aria-controls={contentId} onClick={toggle}><BookOpen className="size-4" aria-hidden="true" />How this works</Button>,
    actionContainer,
  );

  return <>{headerAction}{!expanded && actionContainer ? <div id={contentId} hidden /> : <section aria-label="Listing review guide" className={expanded ? 'rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5' : 'flex justify-end'}>
    <div className={expanded ? 'flex items-start justify-between gap-4' : ''}>
      {expanded && <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="size-4 shrink-0" aria-hidden="true" />One product, all its shop listings</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">A listing is a product in a shop. A Product Master is its shared record in Prime OS. Link them to manage the same product across shops in one place.</p>
      </div>}
      <Button ref={actionContainer ? undefined : trigger} variant="ghost" className="h-11 shrink-0" aria-expanded={expanded} aria-controls={contentId} onClick={toggle}>
        {expanded ? <><Check className="size-4" aria-hidden="true" />Got it</> : <><BookOpen className="size-4" aria-hidden="true" />How this works</>}
      </Button>
    </div>
    <div id={contentId} hidden={!expanded}>
      <ol className="my-4 grid gap-4 sm:grid-cols-3 sm:gap-6" aria-label="Listing review steps">
        <li className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs">1</span>Choose listings</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Start with one row, or tick listings for the <span className="font-medium text-foreground">same product</span> to link them to one Master.</p>
        </li>
        <li className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs">2</span>Check the match</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Click <span className="font-medium text-foreground">Review suggestion</span> or <span className="font-medium text-foreground">Choose Master</span>. Check the product, pack size and variants—not just its name or SKU.</p>
        </li>
        <li className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs">3</span>Link or create</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Existing Master:</span> confirm the link; its status and details stay unchanged.<br /><span className="font-medium text-foreground">No match?</span> Choose another Master, or create one and complete required details to make it Active.</p>
        </li>
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-primary/10 pt-3 text-xs leading-5">
        <p className="flex min-w-0 items-start gap-2 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Nothing is published automatically. Shop data, stock and sync stay unchanged.</span></p>
        {hasListings && <p className="flex items-center gap-1.5 font-medium">Start with a listing below<ArrowRight className="size-3.5 rotate-90" aria-hidden="true" /></p>}
      </div>
    </div>
  </section>}</>;
}
