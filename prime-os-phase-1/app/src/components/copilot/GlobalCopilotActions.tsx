import { useNavigate } from 'react-router-dom';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GlobalCopilotAction } from './types';
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
              description: action.description ?? 'Đã copy nội dung từ assistant.',
            });
            setTimeout(() => setCopiedValue(null), 2000);
          } catch (error) {
            console.error('[GlobalCopilotActions] Clipboard copy failed', error);
            toast({
              title: 'Copy failed',
              description: 'Không thể copy nội dung. Bạn thử lại giúp mình nhé.',
              variant: 'destructive',
            });
          }
        }
        break;
      case 'confirm_draft':
      case 'cancel_draft':
        // Phase 1: Draft operations not implemented yet
        console.log('Draft action:', action.type, action.draftId);
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
