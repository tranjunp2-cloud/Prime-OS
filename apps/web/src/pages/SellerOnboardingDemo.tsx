import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Lightbulb, RotateCcw, Settings2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SellerSetupFields } from '@/components/seller-onboarding/SellerSetupFields';
import { freshSellerDemo, readSellerDemo, rememberOverviewDemoMode, SELLER_DEMO_KEY, steps, stepError, type SellerDemo } from '@/components/seller-onboarding/demo-state';
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
  const navigate = useNavigate();
  const previousPage = location.state?.returnTo;
  const previousPath = typeof previousPage === 'string' && /^\/(?!\/)/.test(previousPage) && !previousPage.startsWith('/demo/') && !previousPage.startsWith('/auth') ? previousPage : '/overview';
  const [returnPath, returnQuery = ''] = previousPath.split('?');
  const returnParams = new URLSearchParams(returnQuery);
  if (returnParams.get('demo') === 'no-data') returnParams.delete('demo');
  const returnTo = `${returnPath}${returnParams.size ? `?${returnParams}` : ''}`;
  const [data, setData] = useState(() => {
    const savedData = readSellerDemo();
    const requestedStep = new URLSearchParams(location.search).get('step');
    const step = requestedStep && /^[1-5]$/.test(requestedStep) ? Number(requestedStep) - 1 : savedData.step;
    return { ...savedData, step: savedData.name.trim() ? step : 0, view: 'setup' as SellerDemo['view'] };
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const update = (patch: Partial<SellerDemo>) => {
    setError('');
    setData(current => {
      const changesFields = Object.keys(patch).some(key => !['step', 'view', 'completed', 'deferred'].includes(key));
      return { ...current, ...patch, completed: changesFields ? current.completed.filter(step => step !== current.step) : patch.completed ?? current.completed };
    });
  };
  useEffect(() => {
    try { localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify(data)); setSaved(true); }
    catch { setSaved(false); }
    if (data.view === 'home') {
      rememberOverviewDemoMode(true);
      navigate('/admin/dashboard?demo=no-data', { replace: true });
    }
  }, [data, navigate]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [data.step]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (data.view !== 'setup' || !params.has('step') || params.get('step') === String(data.step + 1)) return;
    params.set('step', String(data.step + 1));
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true, state: location.state });
  }, [data.step, data.view, location, navigate]);
  const requireWorkspace = () => {
    const message = stepError({ ...data, step: 0 });
    if (!message) return true;
    update({ step: 0 });
    setError(message);
    return false;
  };
  const goTo = (step: number) => {
    if (step > 0 && !requireWorkspace()) return;
    update({ step, view: 'setup' });
  };
  const openWorkspace = (completed = data.completed) => {
    if (!requireWorkspace()) return;
    const confirmed = [...new Set([0, ...completed])];
    update({
      completed: confirmed,
      deferred: steps.flatMap((_, step) => step > 0 && !confirmed.includes(step) ? [step] : []),
      view: 'home',
    });
  };
  const deferStep = () => {
    if (data.step === 0 || !requireWorkspace()) return;
    const completed = data.completed.filter(step => step !== data.step);
    if (data.step === 4) { openWorkspace(completed); return; }
    update({ completed, deferred: [...new Set([...data.deferred, data.step])], step: data.step + 1 });
  };
  const advance = () => {
    if (!requireWorkspace()) return;
    const message = stepError(data);
    if (message) { setError(message); return; }
    const completed = [...new Set([...data.completed, data.step])];
    if (data.step === 4) { openWorkspace(completed); return; }
    update({ completed, deferred: data.deferred.filter(step => step !== data.step), step: data.step + 1 });
  };
  const toggleChannel = (channel: string) => {
    const selected = data.channels.includes(channel);
    update({ channels: selected ? data.channels.filter(value => value !== channel) : [...data.channels, channel], connected: selected ? data.connected.filter(value => value !== channel) : data.connected });
  };

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
      <div className="seller-header-actions">
        <Link className="seller-return-link" to={returnTo} onClick={() => rememberOverviewDemoMode(false)}><ArrowLeft aria-hidden="true" /><span>Back to workspace with data</span></Link>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => openWorkspace()}>Go to workspace<ArrowRight aria-hidden="true" /></Button>
      </div>
    </header>

    <main className="seller-setup-layout">
      <aside className="seller-setup-sidebar">
        <div className="seller-intro"><p className="seller-eyebrow">LET’S GET YOU STARTED</p><h2>Your business.<br />{' '}Your workspace.</h2><p>A few details now.<br className="hidden md:block" /> A smoother day of selling ahead.</p></div>
        <div className="seller-progress-summary"><span>{data.completed.length} of 5 completed</span><span>{data.completed.length * 20}%</span></div>
        <div role="progressbar" aria-label="Setup completion" aria-valuenow={data.completed.length} aria-valuemin={0} aria-valuemax={5} className="seller-progress-track"><span style={{ width: `${data.completed.length * 20}%` }} /></div>
        {data.deferred.length > 0 && <p className="seller-deferred-summary">{data.deferred.length} {data.deferred.length === 1 ? 'step' : 'steps'} set up later</p>}
        <nav aria-label="Setup steps" className="seller-step-nav"><ol>{steps.map((label, index) => <li key={label}>
          <button type="button" aria-current={data.step === index ? 'step' : undefined} onClick={() => goTo(index)} data-completed={data.completed.includes(index)}>
            <span className="seller-step-number">{data.completed.includes(index) ? <Check aria-label="Completed" /> : data.deferred.includes(index) ? <Clock3 aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span>
            <span className="seller-step-copy"><strong>{label}</strong><span>{stepDetails[index]}</span>{data.deferred.includes(index) && <small className="seller-deferred-badge">Set up later</small>}</span>
            {data.step === index && <span className="seller-step-dot" />}
          </button>
        </li>)}</ol></nav>
        <div className="seller-sidebar-note"><Settings2 aria-hidden="true" /><div><strong>Make it yours, at your pace</strong><p>Only your workspace details are needed to get started. Everything else can be set up later.</p></div></div>
      </aside>

      <div className="seller-setup-main">
        <div className="seller-page-meta"><span className="seller-step-count">STEP {String(data.step + 1).padStart(2, '0')} <span>/ 05</span></span><span className="seller-save-status" role="status" data-error={!saved}>{saved ? <CheckCircle2 aria-hidden="true" /> : <Clock3 aria-hidden="true" />}{saved ? 'Progress saved on this browser' : 'Unable to save. Keep this tab open.'}</span></div>
        <div className="seller-form-heading"><h1 ref={heading} tabIndex={-1}>{titles[data.step]}</h1><p>{descriptions[data.step]}</p><span className="seller-step-requirement">{data.step === 0 ? 'Required to create your workspace' : 'Optional · Set this up now or come back later'}</span></div>
        <form id="seller-setup-form" className="seller-form-card" onSubmit={event => { event.preventDefault(); advance(); }} noValidate>
          <div className="seller-form-content"><SellerSetupFields data={data} update={update} toggleChannel={toggleChannel} />
            {error && <p ref={errorRef} tabIndex={-1} role="alert" className="seller-form-error">{error}</p>}
          </div>
          <footer className="seller-form-footer"><Button type="button" variant="ghost" className="min-h-11" disabled={data.step === 0} onClick={() => goTo(data.step - 1)}><ArrowLeft />Back</Button><div>{data.step > 0 && <Button type="button" variant="ghost" className="min-h-11" onClick={deferStep}>Set up later</Button>}<Button type="submit" className="seller-continue">{data.step === 4 ? 'Open workspace' : 'Continue'}<ArrowRight /></Button></div></footer>
        </form>
        <aside className="seller-guide"><Lightbulb aria-hidden="true" /><div><h2>{guides[data.step].title}</h2><p>{guides[data.step].text}</p></div></aside>
        <div className="seller-review-tools"><span>First-time seller preview</span><Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => setResetOpen(true)}><RotateCcw />Restart demo</Button></div>
      </div>
    </main>
    <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Restart the seller demo?</AlertDialogTitle><AlertDialogDescription>This clears only the onboarding demo progress. You will return to the first step with an empty workspace.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep progress</AlertDialogCancel><AlertDialogAction onClick={() => { setData(freshSellerDemo()); setError(''); }}>Restart demo</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}
