import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GlobalCopilotFABProps {
  onClick: () => void;
  isOpen?: boolean;
  label?: string;
}

export function GlobalCopilotFAB({ onClick, isOpen = false, label = 'Prime AI' }: GlobalCopilotFABProps) {
  const actionLabel = isOpen ? `Close ${label}` : `Open ${label}`;

  return (
    <div className="fixed bottom-6 right-6 z-[70] md:bottom-7 md:right-7">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            size="lg"
            className="h-14 rounded-full border border-primary/30 bg-primary/95 px-4 shadow-floating transition-all hover:bg-primary"
            aria-label={actionLabel}
          >
            <Bot className="size-6" />
            <span className="ml-2 hidden text-sm font-semibold md:inline">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{isOpen ? `Hide ${label}` : `Open ${label}`}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
