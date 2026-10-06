// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProductWorkspaceHelp } from './ProductWorkspaceHelp';

afterEach(cleanup);

describe.each([
  { scope: 'master' as const, label: 'Product Master', title: 'One product, shared across shops', benefit: 'Reuse this shared data across your shop listings.', boundary: 'Activating it does not publish a listing.' },
  { scope: 'listings' as const, label: 'Shop listings', title: 'Manage this product in each shop', benefit: 'each shop’s content, price, SKU mapping and sync settings.', boundary: 'Publishing is handled separately for each shop.' },
])('$label navigation help', ({ scope, label, title, benefit, boundary }) => {
  function mount() {
    render(<><ProductWorkspaceHelp scope={scope} /><button>Next control</button></>);
    return screen.getByRole('button', { name: `About ${label}` });
  }
  it('starts collapsed without adding an onboarding dialog', () => {
    const trigger = mount();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('explains purpose and scope on keyboard focus and dismisses with Escape', async () => {
    const trigger = mount();
    act(() => trigger.focus());
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(title);
    expect(tooltip).toHaveTextContent(benefit);
    expect(tooltip).toHaveTextContent(boundary);
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });
  it('opens on hover without stealing focus', async () => {
    const trigger = mount();
    const next = screen.getByRole('button', { name: 'Next control' });
    act(() => next.focus());
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
    expect(await screen.findByRole('tooltip')).toHaveTextContent(title);
    expect(next).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('pins on click/tap and closes with restored focus, without reopening the tooltip', async () => {
    const trigger = mount();
    act(() => trigger.focus());
    await screen.findByRole('tooltip');
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: `${label} explained` });
    expect(dialog).toHaveTextContent(title);
    expect(dialog).toHaveTextContent(boundary);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: `Close ${label} help` }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
  it('dismisses pinned help with Escape and opens again', async () => {
    const trigger = mount();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toHaveTextContent(benefit);
  });
});
