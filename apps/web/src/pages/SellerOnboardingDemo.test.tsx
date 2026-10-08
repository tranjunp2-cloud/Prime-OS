// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import SellerOnboardingDemo from './SellerOnboardingDemo';
import { freshSellerDemo, readSellerDemo, SELLER_DEMO_KEY } from '@/components/seller-onboarding/demo-state';
const mount = () => render(<MemoryRouter initialEntries={['/demo/no-data']}><TooltipProvider><SellerOnboardingDemo /></TooltipProvider></MemoryRouter>);
beforeEach(() => localStorage.clear());
afterEach(cleanup);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name, exact: true }));
const fill = (label: string, value: string) => fireEvent.change(screen.getByRole('textbox', { name: label, exact: true }), { target: { value } });

describe('Seller first-time demo', () => {
  it('validates, completes all five steps and keeps the workspace empty', () => {
    mount();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: /Welcome to/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to workspace with data' })).toHaveAttribute('href', '/overview');
    click('Continue');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a workspace name');
    fill('Workspace name', 'Review store');
    click('Continue');
    fireEvent.click(screen.getByLabelText('Shopee'));
    click('Continue');
    expect(screen.getByRole('alert')).toHaveTextContent('Connect each selected channel');
    click('Connect demo store');
    click('Continue');
    fill('Selling name', 'Review seller');
    fill('Contact email', 'review@example.com');
    click('Continue');
    fill('Stock location name', 'Main warehouse');
    fill('Address', 'Demo address');
    click('Continue');
    click('Open workspace');
    expect(screen.getByText('Initial setup complete')).toBeVisible();
    expect(screen.getAllByText('No data yet')).toHaveLength(3);
    expect(readSellerDemo().completed).toHaveLength(5);
  });
  it('resumes after a remount and resets only its own storage', () => {
    localStorage.setItem('existing-product-data', 'unchanged');
    const first = mount();
    fill('Workspace name', 'Saved workspace');
    click('Continue');
    first.unmount();
    mount();
    expect(screen.getByRole('heading', { name: 'Where do you sell?' })).toBeVisible();
    click('Skip for now');
    click('Resume setup');
    expect(screen.getByRole('heading', { name: 'Where do you sell?' })).toBeVisible();
    click('Restart demo');
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Restart demo' }));
    expect(screen.getByRole('textbox', { name: 'Workspace name' })).toHaveValue('');
    expect(localStorage.getItem('existing-product-data')).toBe('unchanged');
  });
  it('invalidates a completed step when required fields are cleared', () => {
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), name: 'Shop', completed: [0] }));
    mount();
    fill('Workspace name', '');
    click('Skip for now');
    expect(screen.getByText(/0\/5 steps completed/)).toBeVisible();
    click('Resume setup');
    expect(screen.getByRole('heading', { name: 'Confirm your workspace' })).toBeVisible();
  });
  it('recovers safely from invalid saved progress', () => {
    localStorage.setItem(SELLER_DEMO_KEY, '{broken');
    expect(readSellerDemo()).toEqual(freshSellerDemo());
    localStorage.setItem(SELLER_DEMO_KEY, JSON.stringify({ ...freshSellerDemo(), step: 12 }));
    expect(readSellerDemo()).toEqual(freshSellerDemo());
  });
});
