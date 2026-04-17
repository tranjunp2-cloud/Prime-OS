import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GlobalCopilotFABProps {
  onClick: () => void;
}

export function GlobalCopilotFAB({ onClick }: GlobalCopilotFABProps) {
  return (
    <div className="fixed right-7 bottom-7 z-50">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            size="lg"
            className="size-14 rounded-full border border-primary/30 bg-primary/92 shadow-floating hover:bg-primary"
            aria-label="Open ECH Assistant"
          >
            <Bot className="size-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>ECH Assistant</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
