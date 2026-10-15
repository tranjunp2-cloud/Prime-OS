// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import PromotionsManagement from './PromotionsManagement';

afterEach(cleanup);
function mount() { return render(<MemoryRouter initialEntries={['/promotions/discount-codes']}><PromotionsManagement /></MemoryRouter>); }

describe('Promotion column explanations', () => {
  it.each([
    ['Discount Type', ['Fixed:', 'Percentage:', 'Buy X Get Y:', '₫200,000 off', '15% off', 'buy 2, get 1 free', 'below the promotion name']],
    ['Status', ['Active:', 'Scheduled:', 'Paused:', 'Expired:', 'waiting for its start date', 'Temporarily disabled', 'no longer be used', 'Usage limits and eligibility rules still apply']],
  ] as const)('explains %s from its column heading on hover, focus and tap', async (title, descriptions) => {
    mount();
    const trigger = screen.getByRole('button', { name: `About ${title}` });
    expect(trigger.closest('th')).toHaveAttribute('scope', 'col');
    expect(trigger.querySelector('.lucide-info')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
    const tooltip = await screen.findByRole('tooltip');
    for (const description of descriptions) expect(tooltip).toHaveTextContent(description);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    act(() => trigger.focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent(title);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    fireEvent.click(trigger);
    fireEvent.pointerLeave(trigger, { pointerType: 'touch' });
    expect(await screen.findByRole('tooltip')).toBeVisible();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    expect(screen.getAllByRole('row')).toHaveLength(6);
  });

  it('replaces pinned column help when another heading is hovered', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'About Discount Type' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('How the promotion gives a discount.');
    fireEvent.pointerMove(screen.getByRole('button', { name: 'About Status' }), { pointerType: 'mouse' });
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('Whether customers can currently use the promotion.'));
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
  });
});

describe('Promotion channel logos', () => {
  it('uses the correct embedded product logos without changing promotion eligibility', () => {
    mount();
    for (const [title, labels] of [
      ['Welcome to PrimeWeb', ['PrimeWeb', 'Prime CRM']],
      ['POS Weekend Bundle', ['PrimePOS']],
      ['Payday Member Voucher', ['PrimePOS', 'PrimeWeb']],
      ['Inbox Conversion Offer', ['Prime CRM']],
      ['Mid-Year Clearance', ['PrimePOS', 'PrimeWeb', 'Prime CRM']],
    ] as const) {
      const row = screen.getByRole('row', { name: new RegExp(title) });
      const cell = within(row).getAllByRole('cell')[2];
      expect(within(cell).getAllByRole('button')).toHaveLength(labels.length);
      for (const label of labels) {
        const logo = within(cell).getByRole('button', { name: label, exact: true });
        expect(logo.querySelector('svg')).toHaveAttribute('viewBox', '0 0 48 48');
        expect(logo.querySelector('img')).toBeNull();
        expect(logo.querySelector('.lucide')).toBeNull();
      }
    }
  });

  it.each(['PrimeWeb', 'PrimePOS', 'Prime CRM'])('shows %s on hover, focus and touch', async label => {
    mount();
    const trigger = screen.getAllByRole('button', { name: label, exact: true })[0];
    fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
    expect(await screen.findByRole('tooltip')).toHaveTextContent(label);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    act(() => trigger.focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent(label);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    fireEvent.click(trigger);
    fireEvent.pointerLeave(trigger, { pointerType: 'touch' });
    expect(await screen.findByRole('tooltip')).toHaveTextContent(label);
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });
});

describe('Compact promotion summary', () => {
  it('keeps exact totals, hides explanations until requested, and does not apply list filters to the summary', () => {
    mount();
    const summary = screen.getByRole('region', { name: 'Promotion summary' });
    expect(within(summary).getAllByRole('button')).toHaveLength(4);
    for (const value of ['2', '₫1,640,000,000', '2,254', '₫271,600,000']) {
      expect(within(summary).getByText(value)).toBeVisible();
    }
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.queryByText('Currently accepting redemptions')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search promotions'), { target: { value: 'PAYDAY200' } });
    expect(within(summary).getByText('₫1,640,000,000')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Search promotions'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Pause Welcome to PrimeWeb' }));
    expect(within(summary).getByRole('button', { name: 'About Active Promotions: 1' })).toBeVisible();
  });

  it.each([
    ['Active Promotions', 'Scheduled, paused and expired promotions are not included.'],
    ['Promo Revenue', 'This is not profit or the extra revenue caused by a promotion.'],
    ['Total Uses', 'this is not a unique-customer count.'],
    ['Discounts Given', 'not revenue or the value of unused codes.'],
  ])('explains %s on focus or tap and closes on Escape', async (label, explanation) => {
    mount();
    const trigger = screen.getByRole('button', { name: new RegExp(`^About ${label}:`) });
    act(() => trigger.focus());
    expect(await screen.findByRole('tooltip')).toHaveTextContent(explanation);
    expect(screen.getByRole('tooltip')).toHaveTextContent('List filters do not change this summary.');
    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    fireEvent.click(trigger);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(explanation);
    fireEvent.pointerLeave(trigger, { pointerType: 'touch' });
    expect(screen.getByRole('tooltip')).toBeVisible();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('shows only one explanation when hovering another card after pinning help', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /^About Active Promotions:/ }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Active Promotions');
    fireEvent.pointerMove(screen.getByRole('button', { name: /^About Promo Revenue:/ }), { pointerType: 'mouse' });
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('Promo Revenue'));
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
  });
});

describe('Discount type badges', () => {
  it('shows explicit types with icons and preserves the discount amount under the promotion name', () => {
    mount();
    for (const [title, type, icon, discount] of [
      ['Welcome to PrimeWeb', 'Percentage', 'percent', '15% OFF up to ₫250,000'],
      ['Payday Member Voucher', 'Fixed', 'banknote', '₫200,000 OFF'],
      ['POS Weekend Bundle', 'Buy X Get Y', 'gift', 'Buy 2 Get 1'],
    ]) {
      const row = screen.getByRole('row', { name: new RegExp(title) });
      const cells = within(row).getAllByRole('cell');
      expect(cells[1]).toHaveTextContent(type);
      expect(cells[1].querySelector(`.lucide-${icon}`)).toHaveAttribute('aria-hidden', 'true');
      expect(cells[1]).not.toHaveTextContent(discount);
      expect(within(cells[0]).getByText(discount)).toBeVisible();
      expect(within(cells[1]).getByText(type)).toHaveClass('rounded-full');
    }
  });

  it('preserves types while searching, filtering and pausing promotions', () => {
    mount();
    expect(screen.queryByRole('button', { name: 'Clear', exact: true })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search promotions'), { target: { value: 'PAYDAY200' } });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByRole('cell', { name: 'Fixed' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Clear', exact: true })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search promotions'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Pause Welcome to PrimeWeb' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Paused' }));
    expect(screen.getAllByRole('cell', { name: 'Percentage' })).toHaveLength(2);
  });

  it.each([
    ['Fixed amount', 'Fixed', '200000'],
    ['Percentage', 'Percentage', '20'],
  ])('retains the selected %s type when creating a promotion', (choice, label, amount) => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Create Promotion', exact: true }));
    fireEvent.change(screen.getByPlaceholderText('e.g. New Customer Welcome'), { target: { value: 'New demo offer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${choice}`) }));
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: amount } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create Promotion', exact: true }));
    const row = screen.getByRole('row', { name: /New demo offer/ });
    expect(within(row).getAllByRole('cell')[1]).toHaveTextContent(label);
    expect(within(row).getAllByRole('cell')[0]).toHaveTextContent(label === 'Fixed' ? '₫200,000 OFF' : '20% OFF');
    expect(within(within(row).getAllByRole('cell')[2]).getByRole('button', { name: 'PrimeWeb', exact: true })).toBeVisible();
  });
});
