import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

type SetupCard = { id: string; label: string; target: string };
const CARD_SELECTOR = '[data-setup-section]';
const LEGACY_SECTIONS: Record<string, string> = { images: 'media', structure: 'sales', attributes: 'sales', pricing: 'sales', compliance: 'trade' };

function isShown(card: HTMLElement, main: HTMLElement) {
  for (let element: HTMLElement | null = card; element; element = element.parentElement) {
    const style = getComputedStyle(element);
    // Modal menus set aria-hidden on background content without visually removing its cards.
    if (element.hidden || style.display === 'none' || style.visibility === 'hidden') return false;
    if (element === main) break;
  }
  return true;
}

/** Cards own their title and availability; category/listing-specific cards need no separate menu entry. */
function readCards(main: HTMLElement): SetupCard[] {
  const seen = new Set<string>();
  return Array.from(main.querySelectorAll<HTMLElement>(CARD_SELECTOR)).flatMap(card => {
    const id = card.dataset.setupSection;
    const label = Array.from(card.querySelectorAll('[data-setup-title]'))
      .find(title => title.closest(CARD_SELECTOR) === card)?.textContent?.trim();
    if (!id || !card.id || !label || seen.has(id) || !isShown(card, main)) return [];
    seen.add(id);
    return [{ id, label, target: card.id }];
  });
}

/** In-page navigation: preserves the mounted form, accounts for sticky UI, and never saves data. */
export function useProductSetupNavigation({ enabled, requested, headerRef, navigationRef, contentRef, onReveal, onNavigate }: {
  enabled: boolean; requested: string | null;
  headerRef: RefObject<HTMLElement>; navigationRef: RefObject<HTMLElement>; contentRef: RefObject<HTMLElement>;
  onReveal: (section: string) => void;
  onNavigate: (section: string) => void;
}) {
  const [sections, setSections] = useState<SetupCard[]>([]);
  const [current, setCurrent] = useState('basic');
  const callbacks = useRef({ onReveal, onNavigate });
  callbacks.current = { onReveal, onNavigate };
  const pendingFrame = useRef(0);
  const revealedRequest = useRef<string | null>(null);
  const intent = useRef<{ id: string; top: number; settled: boolean; until: number } | null>(null);

  useLayoutEffect(() => {
    const main = contentRef.current;
    if (!enabled || !main) { setSections([]); return; }
    let frame = 0;
    const refresh = () => {
      frame = 0;
      const next = readCards(main);
      setSections(previous => previous.length === next.length && previous.every((card, index) =>
        card.id === next[index].id && card.label === next[index].label && card.target === next[index].target) ? previous : next);
      setCurrent(previous => next.some(card => card.id === previous) ? previous : next[0]?.id ?? '');
      if (intent.current && !next.some(card => card.id === intent.current?.id)) intent.current = null;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(refresh); };
    refresh();
    // React can add/remove/relabel cards after product type or imported listing data changes.
    const observer = new MutationObserver(schedule);
    observer.observe(main, { childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['hidden', 'class', 'style', 'data-setup-section', 'data-setup-title', 'id'] });
    window.addEventListener('resize', schedule);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('resize', schedule); };
  }, [enabled, contentRef]);

  const offset = useCallback(() => {
    const header = headerRef.current;
    const nav = navigationRef.current;
    const compact = nav?.querySelector<HTMLElement>('[data-workspace-mobile]');
    const headerHeight = header && getComputedStyle(header).position === 'sticky' ? header.offsetHeight : 0;
    const navHeight = compact && getComputedStyle(compact).display !== 'none' && nav && getComputedStyle(nav).position === 'sticky' ? nav.offsetHeight : 0;
    return headerHeight + navHeight + 12;
  }, [headerRef, navigationRef]);

  const reveal = useCallback((id: string) => {
    const section = sections.find(item => item.id === id);
    if (!section) return;
    callbacks.current.onReveal(id);
    setCurrent(id);
    cancelAnimationFrame(pendingFrame.current);
    pendingFrame.current = requestAnimationFrame(() => {
      const target = document.getElementById(section.target);
      if (!target) return;
      target.querySelectorAll<HTMLDetailsElement>('details[data-setup-disclosure]').forEach(details => { details.open = true; });
      const root = document.getElementById('main-content');
      const scrollTop = root?.scrollTop ?? window.scrollY;
      const rootTop = root?.getBoundingClientRect().top ?? 0;
      const maxTop = root ? root.scrollHeight - root.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
      const top = Math.max(0, Math.min(maxTop, scrollTop + target.getBoundingClientRect().top - rootTop - offset()));
      intent.current = { id, top, settled: false, until: performance.now() + 1200 };
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      (root ?? window).scrollTo({ top, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }, [offset, sections]);

  const jump = useCallback((id: string) => {
    if (!sections.some(section => section.id === id)) return;
    reveal(id);
    callbacks.current.onNavigate(id);
  }, [reveal, sections]);

  useEffect(() => () => cancelAnimationFrame(pendingFrame.current), [enabled]);

  useEffect(() => {
    if (!enabled) { intent.current = null; revealedRequest.current = null; return; }
    if (!requested) { revealedRequest.current = null; return; }
    if (revealedRequest.current === requested) return;
    const id = sections.some(item => item.id === requested) ? requested : LEGACY_SECTIONS[requested];
    if (id && sections.some(item => item.id === id)) { revealedRequest.current = requested; reveal(id); }
  }, [enabled, requested, reveal, sections]);

  useEffect(() => {
    if (!enabled) return;
    const root = document.getElementById('main-content');
    const source = root ?? window;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = root?.scrollTop ?? window.scrollY;
      const requestedPosition = intent.current;
      if (requestedPosition) {
        if (Math.abs(top - requestedPosition.top) <= 2) { requestedPosition.settled = true; setCurrent(requestedPosition.id); return; }
        if (!requestedPosition.settled && performance.now() < requestedPosition.until) return;
        intent.current = null;
      }
      const line = (root?.getBoundingClientRect().top ?? 0) + offset() + 24;
      const visible = sections.map(section => ({ ...section, element: document.getElementById(section.target) })).filter(section => section.element?.getClientRects().length);
      let selected = visible[0];
      for (const section of visible) if (section.element!.getBoundingClientRect().top <= line) selected = section;
      if (visible.length && root && top > 0 && top + root.clientHeight >= root.scrollHeight - 2) selected = visible[visible.length - 1];
      if (selected) setCurrent(selected.id);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const interrupt = () => { intent.current = null; schedule(); };
    const onKey = (event: KeyboardEvent) => { if (['PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp'].includes(event.key)) interrupt(); };
    source.addEventListener('scroll', schedule, { passive: true });
    source.addEventListener('wheel', interrupt, { passive: true });
    source.addEventListener('touchstart', interrupt, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('keydown', onKey);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    const main = contentRef.current;
    if (main) observer?.observe(main);
    if (navigationRef.current) observer?.observe(navigationRef.current);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      source.removeEventListener('scroll', schedule);
      source.removeEventListener('wheel', interrupt);
      source.removeEventListener('touchstart', interrupt);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('keydown', onKey);
      observer?.disconnect();
    };
  }, [enabled, navigationRef, contentRef, offset, sections]);

  return { sections, current, jump };
}
