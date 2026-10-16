// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useRef } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductSetupNavigation } from './useProductSetupNavigation';

// Models independently rendered cards from a product schema / asynchronous listing response.
function Editor({ variants = false, listingTitle = '', hideListing = false, requested = null, extraCards = [] }: {
  variants?: boolean; listingTitle?: string; hideListing?: boolean; requested?: string | null; extraCards?: string[];
}) {
  const headerRef = useRef<HTMLElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const navigation = useProductSetupNavigation({ enabled: true, requested, headerRef, navigationRef, contentRef, onReveal: () => {}, onNavigate: () => {} });
  return <>
    <header ref={headerRef} />
    <nav ref={navigationRef} aria-label="Sections">{navigation.sections.map(section => <button key={section.id}
      aria-current={section.id === navigation.current ? 'location' : undefined} aria-controls={section.target}
      onClick={() => navigation.jump(section.id)}>{section.label}</button>)}</nav>
    <main ref={contentRef}>
      <section id="basic-card" data-setup-section="basic"><h2 data-setup-title>Basic information</h2><input aria-label="Draft title" /></section>
      <section id="sales-card" data-setup-section="sales"><h2 data-setup-title>Sales</h2><h3>Product structure</h3></section>
      {variants && <section id="variant-card" data-setup-section="variant-details"><h2 data-setup-title>Variant details</h2></section>}
      {listingTitle && <div style={{ display: hideListing ? 'none' : undefined }}><section id="listing-card" data-setup-section="listing-extra">
        <details data-setup-disclosure><summary><span data-setup-title>{listingTitle}</span></summary><p>Imported specifications</p></details>
      </section></div>}
      {extraCards.map((title, index) => <section key={index} id={`extra-card-${index}`} data-setup-section={`extra-${index}`}><h2 data-setup-title>{title}</h2></section>)}
      <section id="untitled-card" data-setup-section="untitled"><p>No heading yet</p></section>
      <aside><h2>Unrelated content</h2></aside>
    </main>
  </>;
}

const labels = () => within(screen.getByRole('navigation', { name: 'Sections' })).getAllByRole('button').map(item => item.textContent);
const frame = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 60)); });
beforeEach(() => { vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('navigation follows rendered Product setup cards', () => {
  it('adds, removes and renames cards in rendered order without extra menu configuration', async () => {
    const view = render(<Editor />);
    fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'Keep my edit' } });
    expect(labels()).toEqual(['Basic information', 'Sales']);
    view.rerender(<Editor variants listingTitle="Apparel" />);
    await waitFor(() => expect(labels()).toEqual(['Basic information', 'Sales', 'Variant details', 'Apparel']));
    fireEvent.click(screen.getByRole('button', { name: 'Apparel' }));
    await frame();
    expect(document.getElementById('listing-card')).toHaveFocus();
    expect(document.querySelector('#listing-card details')).toHaveAttribute('open');
    view.rerender(<Editor listingTitle="Technical details" />);
    await waitFor(() => expect(labels()).toEqual(['Basic information', 'Sales', 'Technical details']));
    expect(screen.getByRole('button', { name: 'Technical details' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByLabelText('Draft title')).toHaveValue('Keep my edit');
  });

  it('excludes unavailable cards and falls back when the active card disappears', async () => {
    const view = render(<Editor listingTitle="Apparel" />);
    fireEvent.click(screen.getByRole('button', { name: 'Apparel' }));
    await frame();
    view.rerender(<Editor listingTitle="Apparel" hideListing />);
    await waitFor(() => expect(labels()).toEqual(['Basic information', 'Sales']));
    expect(screen.getByRole('button', { name: 'Basic information' })).toHaveAttribute('aria-current', 'location');
    view.rerender(<Editor listingTitle="Apparel" />);
    await waitFor(() => expect(labels()).toEqual(['Basic information', 'Sales', 'Apparel']));
    view.rerender(<Editor />);
    await waitFor(() => expect(labels()).toEqual(['Basic information', 'Sales']));
  });

  it('has no fixed card count when a product schema exposes more sections', async () => {
    const extraCards = ['Measurements', 'Apparel', 'Care', 'Warranty', 'Safety', 'Packaging', 'Certificates'];
    render(<Editor extraCards={extraCards} />);
    expect(labels()).toEqual(['Basic information', 'Sales', ...extraCards]);
    fireEvent.click(screen.getByRole('button', { name: 'Certificates' }));
    await frame();
    expect(document.getElementById('extra-card-6')).toHaveFocus();
  });

  it('does not remove visible cards when an open popup hides background content from screen readers', async () => {
    const view = render(<Editor />);
    document.getElementById('sales-card')!.setAttribute('aria-hidden', 'true');
    view.rerender(<Editor listingTitle="Apparel" />);
    await waitFor(() => expect(labels()).toEqual(['Basic information', 'Sales', 'Apparel']));
  });

  it('resolves a direct link when a listing card arrives, without jumping again after later data updates', async () => {
    const view = render(<Editor requested="listing-extra" />);
    expect(labels()).toEqual(['Basic information', 'Sales']);
    view.rerender(<Editor requested="listing-extra" listingTitle="Apparel" />);
    await waitFor(() => expect(document.getElementById('listing-card')).toHaveFocus());
    const scrolls = vi.mocked(window.scrollTo).mock.calls.length;
    view.rerender(<Editor requested="listing-extra" listingTitle="Apparel details" variants />);
    await waitFor(() => expect(labels()).toEqual(['Basic information', 'Sales', 'Variant details', 'Apparel details']));
    await frame();
    expect(window.scrollTo).toHaveBeenCalledTimes(scrolls);
  });
});
