// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ControlTowerKpiCard } from './ControlTowerKpiRow';

describe('ControlTowerKpiCard', () => {
  it('shows explicit zero-state copy instead of leaving a bare zero without context', () => {
    render(
      <ControlTowerKpiCard
        title="Pending Orders"
        value={0}
        zeroStateLabel="No pending orders right now"
        icon={<span aria-hidden="true">KPI</span>}
      />,
    );

    expect(screen.getByText('Pending Orders')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('No pending orders right now')).toBeInTheDocument();
  });
});
