// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Account from './Account';

const accountEnvelope = {
  principal: {
    id: 'login_admin_001',
    email: 'admin@primeos.local',
    display_name: 'PrimeOS Admin',
    status: 'active',
    auth_methods: ['password'],
  },
  membership: {
    id: 'wm_login_admin_001',
    workspace_id: 'ws_primeos_local',
    principal_id: 'login_admin_001',
    role_key: 'admin',
    seat_type: 'full_admin',
    status: 'active',
    last_active_at: null,
  },
  workspace: {
    id: 'ws_primeos_local',
    name: 'PrimeOS main workspace',
    slug: 'primeos-main',
    default_locale: 'vi-VN',
    default_timezone: 'Asia/Ho_Chi_Minh',
    markets: ['VN', 'JP'],
  },
  capabilities: ['iam.members.read', 'iam.members.invite', 'iam.members.suspend', 'iam.members.reactivate', 'iam.audit.read', 'iam.roles.read', 'account.profile.update_self'],
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: {
      id: 'login_admin_001',
      role: 'admin',
      fullName: 'PrimeOS Admin',
      email: 'admin@primeos.local',
      workspace: 'Global control room',
      seatType: 'full_admin',
    },
    session: {
      role: 'admin',
      roleLabel: 'Admin',
      canWrite: true,
    },
  }),
}));

describe('Account page', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/api/v1/me')) {
        return Response.json({ data: accountEnvelope });
      }
      if (url.endsWith('/api/v1/role-definitions')) {
        return Response.json({ data: [{ role_key: 'admin', label: 'Admin', description: 'Admin access', permissions: [] }] });
      }
      if (url.endsWith('/api/v1/workspace-members')) {
        return Response.json({ data: [{ principal: accountEnvelope.principal, membership: accountEnvelope.membership }] });
      }
      if (url.endsWith('/api/v1/audit-events')) {
        return Response.json({ data: [] });
      }
      return Response.json({ data: null });
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('renders the account center from IAM APIs and current session', async () => {
    render(<Account />);

    expect(screen.getByRole('heading', { name: /account center/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('PrimeOS main workspace').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('tab', { name: /overview/i })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText(/Backend IAM is authoritative/i)).toBeInTheDocument();
  });

  it('exposes roles and security as compact admin tabs', async () => {
    render(<Account />);

    await waitFor(() => {
      expect(screen.getAllByText('PrimeOS main workspace').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('tab', { name: /roles/i }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /roles/i })).toHaveAttribute('data-state', 'active');
    });
    expect(screen.getByText(/Capability Groups/i)).toBeInTheDocument();
    expect(screen.getByText(/Organization -> Workspace/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /security/i }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /security/i })).toHaveAttribute('data-state', 'active');
    });
    expect(screen.getByText(/Security Posture/i)).toBeInTheDocument();
    expect(screen.getByText(/Demo credentials are local\/private only/i)).toBeInTheDocument();
  });

  it('opens workspace access from the legacy members hash', async () => {
    window.history.replaceState(null, '', '/account#members');

    render(<Account />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /members/i })).toHaveAttribute('data-state', 'active');
    });

    expect(screen.getByText(/Workspace access/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Invite member email/i)).toBeInTheDocument();
  });

  it('shows a local backend recovery hint when Account Center cannot fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    render(<Account />);

    await waitFor(() => {
      expect(screen.getByText(/Cannot reach Prime OS backend/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/prime-os-phase-1\/backend/i)).toBeInTheDocument();
  });
});
