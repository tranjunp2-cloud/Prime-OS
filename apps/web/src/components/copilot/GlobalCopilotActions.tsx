import { useNavigate } from 'react-router-dom';
import { ExternalLink, Copy, Check, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GlobalCopilotAction } from './types';
import { buildAuditEvent, recordCopilotAuditEvent } from '@/lib/copilot/command-gateway';
import { useState } from 'react';

interface GlobalCopilotActionsProps {
  actions: GlobalCopilotAction[];
}

export function GlobalCopilotActions({ actions }: GlobalCopilotActionsProps) {
  const navigate = useNavigate();
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAction = async (action: GlobalCopilotAction) => {
    switch (action.type) {
      case 'navigate':
      case 'open_module':
        if (action.url) {
          navigate(action.url);
        }
        break;
      case 'copy':
        if (action.value) {
          try {
            await navigator.clipboard.writeText(action.value);
            setCopiedValue(action.value);
            toast({
              title: 'Copied',
              description: action.description ?? 'Content copied from Prime AI.',
            });
            setTimeout(() => setCopiedValue(null), 2000);
          } catch {
            toast({
              title: 'Copy failed',
              description: 'Unable to copy the content. Please try again.',
              variant: 'destructive',
            });
          }
        }
        break;
      case 'confirm_draft':
        if (!action.command) return;
        if (!window.confirm('Review draft product? This only opens a prefilled form. Nothing is saved or published.')) {
          recordCopilotAuditEvent(buildAuditEvent(action.command, 'cancelled'));
          return;
        }
        recordCopilotAuditEvent(buildAuditEvent(action.command, 'confirmed'));
        toast({
          title: 'Draft confirmed',
          description: 'Opening prefilled form. No data has been saved yet.',
        });
        if (action.url) navigate(action.url);
        break;
      case 'cancel_draft':
        if (action.command) {
          recordCopilotAuditEvent(buildAuditEvent(action.command, 'cancelled'));
        }
        toast({
          title: 'Draft cancelled',
          description: 'Copilot suggestion cancelled for this session.',
        });
        break;
    }
  };

  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.emphasis === 'primary' ? 'default' : 'outline'}
          size="sm"
          className="h-auto min-h-9 px-3 py-2 text-left text-xs"
          onClick={() => handleAction(action)}
          title={action.description}
        >
          {action.type === 'navigate' || action.type === 'open_module' ? (
            <ExternalLink className="size-3 mr-1" />
          ) : action.type === 'confirm_draft' ? (
            <ShieldCheck className="size-3 mr-1" />
          ) : action.type === 'cancel_draft' ? (
            <XCircle className="size-3 mr-1" />
          ) : action.type === 'copy' ? (
            copiedValue === action.value ? (
              <Check className="size-3 mr-1 text-primary" />
            ) : (
              <Copy className="size-3 mr-1" />
            )
          ) : null}
          <span className="leading-4">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
