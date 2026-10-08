import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Lightbulb, Package, RotateCcw, Settings2, Store, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SellerSetupFields } from '@/components/seller-onboarding/SellerSetupFields';
import { freshSellerDemo, readSellerDemo, SELLER_DEMO_KEY, steps, stepError, type SellerDemo } from '@/components/seller-onboarding/demo-state';
import './seller-onboarding.css';

const stepDetails = [
  'Name, language & preferences',
  'Where you sell today',
  'Your business & contact details',
  'Where you keep your inventory',
  'How you want to add products',
];
const descriptions = [
  'Start with the essentials. Set up a space that feels right for your business and your team.',
  'Bring your sales channels together. Tell us where you sell so we can shape your workspace around you.',
  'Help us get to know your business. These details will be shared across your selected stores.',
  'Give your inventory a home. Add the place you use to store, pack, and fulfill your orders.',
  'Every catalog starts somewhere. Choose the path that works best for your business.',
];
const titles = ['Confirm your workspace', 'Where do you sell?', 'Set up your selling profile', 'Add your first stock location', 'Start your catalog'];
const guides = [
  { title: 'A workspace that grows with you', text: 'Your default currency keeps reports consistent. Connected stores can still use their own selling currencies.' },
  { title: 'Start with what you have', text: 'You can set up your workspace without a store. Connect a channel when you are ready to bring in your products and orders.' },
  { title: 'One identity, across every channel', text: 'Use a familiar selling name and a contact email you check regularly. More selling profiles can be added later.' },
  { title: 'Keep your stock organized', text: 'This becomes your default fulfillment location. You can add more warehouses and map them to individual stores later.' },
  { title: 'Your catalog, at your pace', text: 'Your products and stock stay empty until you add them. This choice simply sets your next step.' },
];

export default function SellerOnboardingDemo() {
  const location = useLocation();
  const previousPage = location.state?.returnTo;
  const returnTo = typeof previousPage === 'string' && /^\/(?!\/)/.test(previousPage) && !previousPage.startsWith('/demo/') && !previousPage.startsWith('/auth') ? previousPage : '/overview';
  const [data, setData] = useState(() => ({ ...readSellerDemo(), view: 'setup' as SellerDemo['view'] }));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const homeHeading = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const update = (patch: Partial<SellerDemo>) => {
    setError('');
    setData(current => {
      const changesFields = Object.keys(patch).some(key => !['step', 'view', 'completed'].includes(key));
      return { ...current, ...patch, completed: changesFields ? current.completed.filter(step => step !== current.step) : patch.completed ?? current.completed };
    });
  };
  useEffect(() => {
    try { localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify(data)); setSaved(true); }
    catch { setSaved(false); }
  }, [data]);
  useEffect(() => { (data.view === 'setup' ? heading : homeHeading).current?.focus({ preventScroll: true }); }, [data.step, data.view]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const goTo = (step: number) => update({ step, view: 'setup' });
  const advance = () => {
    const message = stepError(data);
    if (message) { setError(message); return; }
    update({ completed: [...new Set([...data.completed, data.step])], ...(data.step === 4 ? { view: 'home' as const } : { step: data.step + 1 }) });
  };
  const toggleChannel = (channel: string) => {
    const selected = data.channels.includes(channel);
    update({ channels: selected ? data.channels.filter(value => value !== channel) : [...data.channels, channel], connected: selected ? data.connected.filter(value => value !== channel) : data.connected });
  };
  const complete = data.completed.length === 5;

  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    const previousScheme = root.style.colorScheme;
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = data.theme === 'Dark' || (data.theme === 'System' && media?.matches);
      root.classList.toggle('dark', Boolean(dark));
      root.classList.toggle('light', !dark);
      root.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    media?.addEventListener('change', apply);
    return () => {
      media?.removeEventListener('change', apply);
      root.classList.toggle('dark', wasDark);
      root.classList.toggle('light', !wasDark);
      root.style.colorScheme = previousScheme;
    };
  }, [data.theme]);

  return <div className="seller-onboarding-page">
    <header className="seller-page-header">
      <div className="seller-brand"><span className="seller-brand-icon"><Store aria-hidden="true" /></span><div><strong>PrimeOS</strong><span>Seller onboarding</span></div></div>
      <Link className="seller-return-link" to={returnTo}><ArrowLeft aria-hidden="true" /><span>Back to workspace with data</span></Link>
    </header>

    {data.view === 'setup' ? <main className="seller-setup-layout">
      <aside className="seller-setup-sidebar">
        <div className="seller-intro"><p className="seller-eyebrow">LET’S GET YOU STARTED</p><h2>Your business.<br />{' '}Your workspace.</h2><p>A few details now.<br className="hidden md:block" /> A smoother day of selling ahead.</p></div>
        <div className="seller-progress-summary"><span>{data.completed.length} of 5 completed</span><span>{data.completed.length * 20}%</span></div>
        <div role="progressbar" aria-label="Setup completion" aria-valuenow={data.completed.length} aria-valuemin={0} aria-valuemax={5} className="seller-progress-track"><span style={{ width: `${data.completed.length * 20}%` }} /></div>
        <nav aria-label="Setup steps" className="seller-step-nav"><ol>{steps.map((label, index) => <li key={label}>
          <button type="button" aria-current={data.step === index ? 'step' : undefined} onClick={() => goTo(index)} data-completed={data.completed.includes(index)}>
            <span className="seller-step-number">{data.completed.includes(index) ? <Check aria-label="Completed" /> : String(index + 1).padStart(2, '0')}</span>
            <span className="seller-step-copy"><strong>{label}</strong><span>{stepDetails[index]}</span></span>
            {data.step === index && <span className="seller-step-dot" />}
          </button>
        </li>)}</ol></nav>
        <div className="seller-sidebar-note"><Settings2 aria-hidden="true" /><div><strong>Make it yours, at your pace</strong><p>Every detail can be updated later. Your progress is saved as you go.</p></div></div>
      </aside>

      <div className="seller-setup-main">
        <div className="seller-page-meta"><span className="seller-step-count">STEP {String(data.step + 1).padStart(2, '0')} <span>/ 05</span></span><span className="seller-save-status" role="status" data-error={!saved}>{saved ? <CheckCircle2 aria-hidden="true" /> : <Clock3 aria-hidden="true" />}{saved ? 'Progress saved on this browser' : 'Unable to save. Keep this tab open.'}</span></div>
        <div className="seller-form-heading"><h1 ref={heading} tabIndex={-1}>{titles[data.step]}</h1><p>{descriptions[data.step]}</p></div>
        <form id="seller-setup-form" className="seller-form-card" onSubmit={event => { event.preventDefault(); advance(); }} noValidate>
          <div className="seller-form-content"><SellerSetupFields data={data} update={update} toggleChannel={toggleChannel} />
            {error && <p ref={errorRef} tabIndex={-1} role="alert" className="seller-form-error">{error}</p>}
          </div>
          <footer className="seller-form-footer"><Button type="button" variant="ghost" className="min-h-11" disabled={data.step === 0} onClick={() => goTo(data.step - 1)}><ArrowLeft />Back</Button><div><Button type="button" variant="ghost" className="min-h-11" onClick={() => update({ view: 'home' })}>Skip for now</Button><Button type="submit" className="seller-continue">{data.step === 4 ? 'Open workspace' : 'Continue'}<ArrowRight /></Button></div></footer>
        </form>
        <aside className="seller-guide"><Lightbulb aria-hidden="true" /><div><h2>{guides[data.step].title}</h2><p>{guides[data.step].text}</p></div></aside>
        <div className="seller-review-tools"><span>First-time seller preview</span><Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => setResetOpen(true)}><RotateCcw />Restart demo</Button></div>
      </div>
    </main> : <>
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">Your starting point</span><h1 ref={homeHeading} tabIndex={-1} className="mt-3 text-3xl font-semibold tracking-tight outline-none">Welcome to {data.name || 'your workspace'}</h1><p className="mt-3 text-muted-foreground">{complete ? 'Your setup is saved. Your workspace is ready for its first products and orders.' : 'Your workspace is empty. Continue setup whenever you are ready.'}</p>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/20 p-5"><div><p className="font-medium">{complete ? 'Initial setup complete' : 'Finish setting up your workspace'}</p><p className="mt-1 text-sm text-muted-foreground">{data.completed.length}/5 steps completed · {data.market} · {data.currency}</p></div><Button onClick={() => goTo(complete ? 0 : [0, 1, 2, 3, 4].find(step => !data.completed.includes(step)) ?? 0)}>{complete ? 'Review setup' : 'Resume setup'}<ArrowRight className="size-4" /></Button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">{['Products', 'Orders', 'Stock units'].map(label => <section key={label} className="rounded-xl border p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold">0</p><p className="mt-2 text-xs text-muted-foreground">No data yet</p></section>)}</div>
      <section className="mt-6 rounded-xl border px-6 py-10 text-center"><Package className="mx-auto size-9 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">A fresh start for your catalog</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{data.catalog === 'channel' ? 'Your channel import plan is saved. No products have been imported in this demo.' : data.catalog === 'manual' ? 'Your preference to add products manually is saved. Your catalog is still empty.' : 'No sample products, orders, or inventory. Choose how you want to get started.'}</p><Button className="mt-5" variant="outline" onClick={() => goTo(4)}>Review catalog setup<ArrowRight className="size-4" /></Button></section>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><section className="rounded-xl border p-5"><h2 className="flex items-center gap-2 font-medium"><Store className="size-4" />Sales channels</h2><p className="mt-3 text-sm text-muted-foreground">{data.connected.length ? `${data.connected.join(', ')} · Demo connections` : 'No channels connected'}</p><Button variant="ghost" className="mt-2" onClick={() => goTo(1)}>Manage demo channels<ArrowRight className="size-4" /></Button></section><section className="rounded-xl border p-5"><h2 className="flex items-center gap-2 font-medium"><Warehouse className="size-4" />Stock location</h2><p className="mt-3 text-sm text-muted-foreground">{data.completed.includes(3) ? data.warehouse : 'No location configured'}</p><Button variant="ghost" className="mt-2" onClick={() => goTo(3)}>Review stock location<ArrowRight className="size-4" /></Button></section></div>
    </main>
      <div className="mx-auto flex max-w-6xl justify-end px-5 pb-8 sm:px-8"><Button variant="ghost" onClick={() => setResetOpen(true)}><RotateCcw />Restart demo</Button></div>
    </>}
    <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Restart the seller demo?</AlertDialogTitle><AlertDialogDescription>This clears only the onboarding demo progress. You will return to the first step with an empty workspace.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep progress</AlertDialogCancel><AlertDialogAction onClick={() => { setData(freshSellerDemo()); setError(''); }}>Restart demo</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}
