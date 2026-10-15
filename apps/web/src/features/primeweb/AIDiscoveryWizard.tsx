import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import './discovery.css';

// Media, copy and layout adapted from ech-prime-web-v2 AIDiscoveryWizard.
const slides = [
  { title: 'AI editor', file: 'ai-editor-demo.gif', description: 'Edit your website by chatting — no coding needed. AI understands your requests and updates the design in real time.' },
  { title: 'AI content', file: 'ai-content-writing-demo.gif', description: 'Write product descriptions and SEO blog posts automatically. AI creates professional content that draws in customers and ranks well on search engines.' },
  { title: 'AI SEO', file: 'ai-seo-optimization-demo.gif', description: 'Improve your search rankings automatically. AI checks and boosts your SEO so customers find your website on Google more easily.' },
];
export function AIDiscoveryWizard({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const key = `primeweb.ai-guide.seen:${siteId}`;
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(key) !== 'true'; } catch { return true; } });
  const [step, setStep] = useState(0); const [zoom, setZoom] = useState(false); const [failed, setFailed] = useState(false);
  const slide = slides[step];
  const src = `${import.meta.env.BASE_URL}primeweb/wizard/${slide.file}`;
  const close = (permanent = false) => {
    if (permanent) { try { localStorage.setItem(key, 'true'); } catch { /* Dismiss for this visit if storage is unavailable. */ } }
    setOpen(false); onClose();
  };
  const move = (next: number) => { setStep(next); setFailed(false); };
  return <Dialog.Root open={open} onOpenChange={value => !value && close()}><Dialog.Portal><Dialog.Overlay className="pw-guide-overlay" /><Dialog.Content className="pw-guide"><header><Dialog.Title><Sparkles size={21} />Discover the power of AI</Dialog.Title><Dialog.Close aria-label="Close instructions"><X size={20} /></Dialog.Close></header><Dialog.Description className="sr-only">A three-step introduction to the AI website tools.</Dialog.Description><div className="pw-guide-body"><button className="pw-guide-media" aria-label={`Zoom ${slide.title} demo`} disabled={failed} onClick={() => setZoom(true)}>{failed ? <span>Preview unavailable. {slide.title}</span> : <img key={src} src={src} alt={`${slide.title} walkthrough`} onError={() => setFailed(true)} />}</button>{!failed && <span className="pw-guide-hint">Click to zoom</span>}<h3>{slide.title}</h3><p>{slide.description}</p><div className="pw-guide-dots" aria-label={`Step ${step + 1} of 3`}>{slides.map((item, index) => <button key={item.title} aria-label={`Show ${item.title}`} aria-current={step === index ? 'step' : undefined} onClick={() => move(index)} />)}</div></div><footer><button className="pw-guide-skip" onClick={() => close(true)}>Skip instructions</button><div>{step > 0 && <button className="pw-guide-back" onClick={() => move(step - 1)}>← Go back</button>}<button className="pw-guide-next" onClick={() => step === 2 ? close(true) : move(step + 1)}>{step === 2 ? 'Explore CMS' : 'Continue'}{step < 2 && <ChevronRight size={16} />}</button></div></footer>
    <Dialog.Root open={zoom} onOpenChange={setZoom}><Dialog.Portal><Dialog.Overlay className="pw-guide-zoom-overlay" /><Dialog.Content className="pw-guide-zoom"><Dialog.Title className="sr-only">{slide.title} demo</Dialog.Title><Dialog.Description className="sr-only">Expanded walkthrough. Press Escape to close.</Dialog.Description><Dialog.Close aria-label="Close zoom"><X /></Dialog.Close><img src={src} alt={`${slide.title} expanded walkthrough`} /></Dialog.Content></Dialog.Portal></Dialog.Root>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
