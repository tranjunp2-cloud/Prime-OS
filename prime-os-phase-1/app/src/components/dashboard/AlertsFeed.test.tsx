// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AlertsFeed } from './AlertsFeed';
import { I18nProvider } from '@/lib/i18n/I18nContext';

describe('AlertsFeed', () => {
  it('renders severity badges with icon + label + context metadata', () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <AlertsFeed
            alerts={[
              {
                id: 'alert-1',
                tower: 'OMS',
                severity: 'CRITICAL',
                title: 'Allocation blocked for KR region',
                detail: 'Routing rule is missing for KR region orders.',
                entityRef: 'ECH-KR-1001',
                createdAt: '2026-04-14T10:00:00.000Z',
                actionLink: '/orders?status=pending',
              },
            ]}
          />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('OMS')).toBeInTheDocument();
    expect(screen.getByText('ECH-KR-1001')).toBeInTheDocument();
    expect(screen.getByText('Allocation blocked for KR region')).toBeInTheDocument();
  });

  it('renders a healthy empty state when no alerts are present', () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <AlertsFeed alerts={[]} />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(screen.getByText('No priority alerts matching criteria.')).toBeInTheDocument();
    expect(screen.getByText('No escalated action is required right now.')).toBeInTheDocument();
  });
});
