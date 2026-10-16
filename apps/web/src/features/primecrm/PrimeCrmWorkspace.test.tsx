// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoDataModeProvider } from '@/components/shared/DemoDataModeProvider';
import { writeDemoDataMode } from '@/lib/demo-data-mode';
import PrimeCrmWorkspace from './PrimeCrmWorkspace';

const auth = vi.hoisted(() => ({ user: { id: 'test', workspace: 'test-workspace', fullName: 'Test Agent', role: 'admin' } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
beforeEach(() => { localStorage.clear(); writeDemoDataMode('with-data'); auth.user.role = 'admin'; });
afterEach(cleanup);
function mount(path = '/inbox/conversation') { return render(<MemoryRouter initialEntries={[path]}><DemoDataModeProvider><Routes><Route path="/inbox/*" element={<PrimeCrmWorkspace />} /><Route path="/customers" element={<h1>Main Customers</h1>} /></Routes></DemoDataModeProvider></MemoryRouter>); }

describe('Prime CRM workspace flows', () => {
  it('collapses navigation and edits a contact through the profile drawer without losing the reply draft', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Expand CRM menu' }));
    expect(screen.getByRole('button', { name: 'Collapse CRM menu' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.change(screen.getByLabelText('Reply'), { target: { value: 'Keep draft while editing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Customer profile' }));
    expect(screen.queryByLabelText('Guest phone')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit contact' }));
    fireEvent.change(screen.getByLabelText('Guest phone'), { target: { value: '0909999999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save guest details' }));
    expect(screen.getByText('0909999999')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
    expect(screen.getByLabelText('Reply')).toHaveValue('Keep draft while editing');
  });
  it('filters by channel, resets the dependent shop and preserves conversation drafts', () => {
    mount('/inbox/conversation?conversation=c1');
    fireEvent.change(screen.getByLabelText('Reply'), { target: { value: 'Draft for Anh' } });
    expect(screen.queryByLabelText('Page / Shop')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Channel'), { target: { value: 'Shopee' } });
    expect(screen.getByRole('heading', { name: 'Le Bao Chau' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Nguyen Minh Anh.*Prime Beauty/ })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('Page / Shop')).queryByRole('option', { name: 'Prime Beauty VN' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Page / Shop'), { target: { value: 'Shopee Flagship' } });
    fireEvent.change(screen.getByLabelText('Channel'), { target: { value: 'Facebook' } });
    expect(screen.getByLabelText('Page / Shop')).toHaveValue('all');
    expect(within(screen.getByLabelText('Page / Shop')).queryByRole('option', { name: 'Shopee Flagship' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Reply')).toHaveValue('Draft for Anh');
  });
  it('shows active secondary filters when collapsed and clears them without changing channel', () => {
    mount();
    fireEvent.change(screen.getByLabelText('Channel'), { target: { value: 'Shopee' } });
    expect(screen.getByLabelText('Unread only')).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Filters (1)' }));
    fireEvent.click(screen.getByLabelText('Unread only'));
    expect(screen.getByText('No matching conversations')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Filters (2)' }));
    expect(screen.getByLabelText('Active filters')).toHaveTextContent('Open · Unread only');
    fireEvent.click(screen.getByRole('button', { name: 'Filters (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByLabelText('Channel')).toHaveValue('Shopee');
    expect(screen.getByRole('heading', { name: 'Le Bao Chau' })).toBeVisible();
  });
  it('keeps each conversation independent and records a simulated reply in history', () => {
    mount();
    fireEvent.change(screen.getByLabelText('Reply'), { target: { value: 'Hello Anh' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simulate reply' }));
    expect(within(screen.getByRole('log')).getByText('Hello Anh')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Tran Gia Han.*Prime Beauty/ }));
    expect(within(screen.getByRole('log')).queryByText('Hello Anh')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Response History' }));
    expect(screen.getByText('Hello Anh')).toBeVisible();
    expect(screen.getByText('Reply simulated')).toBeVisible();
  });
  it('creates a reusable template that appears in conversations after navigation', () => {
    mount('/inbox/settings?section=templates');
    fireEvent.click(screen.getByRole('button', { name: 'Add template' }));
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: 'Thank you' } });
    fireEvent.change(screen.getByLabelText('Reply text'), { target: { value: 'Thank you for contacting us.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    fireEvent.click(screen.getByRole('link', { name: 'Conversations' }));
    fireEvent.click(screen.getByText('Quick replies'));
    fireEvent.click(screen.getByRole('button', { name: 'Thank you' }));
    expect(screen.getByLabelText('Reply')).toHaveValue('Thank you for contacting us.');
  });
  it('retains unlinked social guests and directs shared customer management to Main', () => {
    mount('/inbox/guests');
    expect(screen.getAllByText('Not linked')).toHaveLength(5); // filter plus four guests
    fireEvent.click(screen.getByRole('button', { name: 'Tran Gia Han' }));
    expect(screen.getByLabelText('Guest phone')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Internal notes'), { target: { value: 'Follow up tomorrow' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save guest details' }));
    fireEvent.click(screen.getByRole('link', { name: 'Main customer directory' }));
    expect(screen.getByRole('heading', { name: 'Main Customers' })).toBeVisible();
  });
  it('shows computed empty analytics and retains settings in no-data mode', () => {
    mount('/inbox/analytics?demo=no-data');
    expect(screen.getByRole('heading', { name: 'No CRM activity yet' })).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: 'CRM Settings' }));
    expect(screen.getByRole('button', { name: 'Add template' })).toBeEnabled();
    expect(screen.queryByText('Product availability')).not.toBeInTheDocument();
  });
  it('prevents non-admin configuration edits in the prototype UI', () => {
    auth.user.role = 'user'; mount('/inbox/settings');
    expect(screen.getByRole('button', { name: 'Add template' })).toBeDisabled();
  });
});

it('opens the unassigned queue from Home and lets the user clear it', () => {
  mount('/inbox/conversation?assignee=unassigned');
  expect(screen.getByLabelText('Active filters')).toHaveTextContent('Unassigned');
  fireEvent.click(screen.getByRole('button', { name: 'Filters (2)' }));
  expect(screen.getByLabelText('Assignee')).toHaveValue('unassigned');
  fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: 'mine' } });
  expect(screen.getByLabelText('Assignee')).toHaveValue('mine');
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByLabelText('Assignee')).toHaveValue('all');
});

it('opens unlinked contacts from Home and synchronizes its filter', () => {
  mount('/inbox/guests?linked=unlinked');
  expect(screen.getByLabelText('Customer link')).toHaveValue('unlinked');
  const table = screen.getByRole('table');
  expect(within(table).queryByText('Linked', { exact: true })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Customer link'), { target: { value: 'all' } });
  expect(screen.getByLabelText('Customer link')).toHaveValue('all');
});
