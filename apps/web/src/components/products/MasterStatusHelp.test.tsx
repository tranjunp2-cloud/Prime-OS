// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MasterStatusHelp } from './MasterStatusHelp';

afterEach(cleanup);
function mount() {
  render(<TooltipProvider><MasterStatusHelp /><button>Next control</button></TooltipProvider>);
  return screen.getByRole('button', { name: 'About Master status' });
}

describe('Master status help', () => {
  it('starts collapsed with a single labelled help trigger', () => {
    const trigger = mount();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveClass('focus-visible:ring-2');
  });

  it('explains all three statuses on keyboard focus and dismisses with Escape', async () => {
    const trigger = mount();
    act(() => trigger.focus());
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Draft');
    expect(tooltip).toHaveTextContent('Active');
    expect(tooltip).toHaveTextContent('Archived');
    expect(tooltip).toHaveTextContent('This does not mean it is live on a sales channel.');
    expect(tooltip).toHaveTextContent('Existing channel listings are not automatically removed.');
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('opens on hover without moving focus or opening a dialog', async () => {
    const trigger = mount();
    act(() => screen.getByRole('button', { name: 'Next control' }).focus());
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Not published yet.');
    expect(screen.getByRole('button', { name: 'Next control' })).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pins help on click/tap, removes the tooltip and restores focus without reopening it', async () => {
    const trigger = mount();
    act(() => trigger.focus());
    await screen.findByRole('tooltip');
    fireEvent.click(trigger);
    const help = await screen.findByRole('dialog', { name: 'Master status explained' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(within(help).getByText('Active')).toBeVisible();
    fireEvent.click(within(help).getByRole('button', { name: 'Close Master status help' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    act(() => { trigger.blur(); trigger.focus(); });
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('dismisses pinned help with Escape and can reopen it', async () => {
    const trigger = mount();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toBeVisible();
  });
});
