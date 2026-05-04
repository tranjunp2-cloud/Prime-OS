// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { buildAuditEvent, prepareProductCreateDraftCommand, recordCopilotAuditEvent } from './command-gateway';

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

describe('copilot command gateway', () => {
  beforeEach(() => {
    installLocalStorageMock();
    window.localStorage.clear();
  });

  it('prepares product draft commands without committing writes', () => {
    const prepared = prepareProductCreateDraftCommand({ sku: 'PRIME-LAMP-001', title: 'Compact Lamp' });

    expect(prepared.request.commandName).toBe('product.prepare_create_draft');
    expect(prepared.request.requiresConfirmation).toBe(true);
    expect(prepared.request.policyTags).toContain('no-silent-save');
    expect(prepared.confirmAction.type).toBe('confirm_draft');
    expect(prepared.confirmAction.url).toContain('/products/new?');
  });

  it('builds immutable-shaped audit events for HITL decisions', () => {
    const prepared = prepareProductCreateDraftCommand({ sku: 'PRIME-LAMP-001' });
    const auditEvent = buildAuditEvent(prepared.request, 'confirmed');

    expect(auditEvent.commandId).toBe(prepared.request.commandId);
    expect(auditEvent.decision).toBe('confirmed');
    expect(auditEvent.policyTags).toContain('draft-before-commit');
  });

  it('persists only the latest 50 local UI audit events', () => {
    const prepared = prepareProductCreateDraftCommand({ sku: 'PRIME-LAMP-001' });

    for (let index = 0; index < 55; index += 1) {
      recordCopilotAuditEvent({
        ...buildAuditEvent(prepared.request, 'confirmed'),
        eventId: `event-${index}`,
      });
    }

    const events = JSON.parse(window.localStorage.getItem('prime.ai.audit-events') ?? '[]');

    expect(events).toHaveLength(50);
    expect(events[0].eventId).toBe('event-5');
    expect(events[49].eventId).toBe('event-54');
  });
});
