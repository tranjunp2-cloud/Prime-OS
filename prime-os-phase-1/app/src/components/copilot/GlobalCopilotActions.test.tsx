// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalCopilotActions } from './GlobalCopilotActions';
import type { GlobalCopilotAction } from './types';


function installLocalStorageMock() {
  let store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => { store = new Map<string, string>(); },
    },
    writable: true,
    configurable: true,
  });
}

const navigate = vi.fn();
const toast = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

const command = {
  commandId: 'product.prepare_create_draft:test',
  commandName: 'product.prepare_create_draft',
  target: { entityType: 'product' },
  payload: { sku: 'PRIME-LAMP-001' },
  risk: 'medium' as const,
  requiresConfirmation: true as const,
  idempotencyKey: 'product.prepare_create_draft:test',
  policyTags: ['draft-before-commit', 'no-silent-save'],
};

const confirmAction: GlobalCopilotAction = {
  type: 'confirm_draft',
  label: 'Review draft product',
  url: '/products/new?sku=PRIME-LAMP-001',
  draftId: command.commandId,
  command,
  emphasis: 'primary',
};

const cancelAction: GlobalCopilotAction = {
  type: 'cancel_draft',
  label: 'Cancel draft',
  draftId: command.commandId,
  command,
};

describe('GlobalCopilotActions HITL draft actions', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    navigate.mockClear();
    toast.mockClear();
    installLocalStorageMock();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('confirms a draft before navigating to the prefilled form', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<GlobalCopilotActions actions={[confirmAction]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review draft product' }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Nothing is saved or published'));
    expect(navigate).toHaveBeenCalledWith('/products/new?sku=PRIME-LAMP-001');
    expect(JSON.parse(window.localStorage.getItem('prime.ai.audit-events') ?? '[]')[0]).toMatchObject({
      commandId: command.commandId,
      decision: 'confirmed',
    });
  });

  it('records cancelled when confirmation is rejected', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<GlobalCopilotActions actions={[confirmAction]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review draft product' }));

    expect(navigate).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem('prime.ai.audit-events') ?? '[]')[0]).toMatchObject({
      commandId: command.commandId,
      decision: 'cancelled',
    });
  });

  it('cancels a draft suggestion without navigation', () => {
    render(<GlobalCopilotActions actions={[cancelAction]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel draft' }));

    expect(navigate).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Draft cancelled' }));
    expect(JSON.parse(window.localStorage.getItem('prime.ai.audit-events') ?? '[]')[0]).toMatchObject({
      decision: 'cancelled',
    });
  });
});
