// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ListingReviewHelp } from './ListingReviewHelp';

afterEach(cleanup);
const description = 'Units sold by this shop divided by total units sold across fully synced shops.';
function mount() {
  render(<><ListingReviewHelp label="Source mapping">{description}</ListingReviewHelp><button>Next control</button></>);
  return screen.getByRole('button', { name: 'About Source mapping' });
}

describe('Listing review tooltips', () => {
  it('starts collapsed and preserves the visible label as its accessible name', () => {
    const trigger = mount();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('explains on keyboard focus and dismisses with Escape without losing focus', async () => {
    const trigger = mount();
    act(() => trigger.focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent(description);
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
  it('previews on hover without moving keyboard focus', async () => {
    const trigger = mount();
    const next = screen.getByRole('button', { name: 'Next control' });
    act(() => next.focus());
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
    expect(await screen.findByRole('tooltip')).toHaveTextContent(description);
    expect(next).toHaveFocus();
  });
  it('pins on click/tap and restores focus without reopening a hover preview', async () => {
    const trigger = mount();
    act(() => trigger.focus());
    await screen.findByRole('tooltip');
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Source mapping help' });
    expect(dialog).toHaveTextContent(description);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close Source mapping help' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
