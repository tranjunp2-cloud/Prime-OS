// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Docs from './Docs';

describe('Prime OS Docs', () => {
  it('filters demo documentation and opens an article', () => {
    render(<MemoryRouter><Docs /></MemoryRouter>);

    expect(screen.getByText('8 articles')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search documentation' }), { target: { value: 'ATP' } });
    expect(screen.getByRole('button', { name: /Read On Hand, Reserved, Safety Stock, and ATP/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Understand the order lifecycle/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Read On Hand, Reserved, Safety Stock, and ATP/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Available to Promise')).toBeInTheDocument();
  });

  it('opens a linked documentation article from the URL', () => {
    render(<MemoryRouter initialEntries={['/docs?article=order-lifecycle']}><Docs /></MemoryRouter>);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Understand the order lifecycle' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View troubleshooting/i })).toHaveAttribute('href', '/faq/understand-order-sync-statuses?from_workspace=main');
  });
});
