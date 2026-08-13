import type { GlobalCopilotAction, RiskLevel } from '@/components/copilot/types';

export type CopilotCommandName = 'product.prepare_create_draft';

export interface CopilotCommandRequest {
  commandId: string;
  commandName: CopilotCommandName;
  target: {
    entityType: 'product';
  };
  payload: Record<string, string>;
  risk: RiskLevel;
  requiresConfirmation: true;
  idempotencyKey: string;
  policyTags: string[];
}

export interface CopilotAuditEvent {
  eventId: string;
  commandId: string;
  commandName: CopilotCommandName;
  targetEntityType: string;
  decision: 'prepared' | 'confirmed' | 'cancelled';
  risk: RiskLevel;
  policyTags: string[];
  occurredAt: string;
}

export interface PreparedCopilotCommand {
  request: CopilotCommandRequest;
  auditEvent: CopilotAuditEvent;
  confirmAction: GlobalCopilotAction;
  cancelAction: GlobalCopilotAction;
}

export function prepareProductCreateDraftCommand(input: Record<string, string>): PreparedCopilotCommand {
  const commandId = createStableCommandId('product.prepare_create_draft', input);
  const policyTags = ['command-gateway-required', 'draft-before-commit', 'no-silent-save'];
  const request: CopilotCommandRequest = {
    commandId,
    commandName: 'product.prepare_create_draft',
    target: { entityType: 'product' },
    payload: input,
    risk: 'medium',
    requiresConfirmation: true,
    idempotencyKey: commandId,
    policyTags,
  };

  return {
    request,
    auditEvent: buildAuditEvent(request, 'prepared'),
    confirmAction: {
      type: 'confirm_draft',
      label: 'Review draft product',
      description: 'Human confirmation: open the prefilled form without saving or publishing.',
      url: `/products/new?${new URLSearchParams(input).toString()}`,
      draftId: commandId,
      command: request,
      emphasis: 'primary',
    },
    cancelAction: {
      type: 'cancel_draft',
      label: 'Cancel draft',
      description: 'Cancel the draft suggestion in this Prime AI session.',
      draftId: commandId,
      command: request,
    },
  };
}

export function buildAuditEvent(
  request: CopilotCommandRequest,
  decision: CopilotAuditEvent['decision'],
): CopilotAuditEvent {
  return {
    eventId: `${request.commandId}:${decision}`,
    commandId: request.commandId,
    commandName: request.commandName,
    targetEntityType: request.target.entityType,
    decision,
    risk: request.risk,
    policyTags: request.policyTags,
    occurredAt: new Date().toISOString(),
  };
}


export function recordCopilotAuditEvent(event: CopilotAuditEvent) {
  if (typeof window === 'undefined') return;

  const storageKey = 'prime.ai.audit-events';
  const existing = window.localStorage.getItem(storageKey);
  const events = existing ? JSON.parse(existing) as CopilotAuditEvent[] : [];
  window.localStorage.setItem(storageKey, JSON.stringify([...events, event].slice(-50)));
}

function createStableCommandId(commandName: CopilotCommandName, input: Record<string, string>) {
  const normalizedPayload = Object.keys(input)
    .sort()
    .map((key) => `${key}:${input[key]}`)
    .join('|');
  return `${commandName}:${hashString(normalizedPayload)}`;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}
