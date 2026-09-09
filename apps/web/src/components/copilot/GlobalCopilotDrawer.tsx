import type { CopilotContextSummary, CopilotQuickPrompt, CopilotTelemetry, GlobalCopilotMessage } from './types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { GlobalCopilotSurface } from './GlobalCopilotSurface';

interface GlobalCopilotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: CopilotContextSummary;
  messages: GlobalCopilotMessage[];
  isProcessing: boolean;
  quickPrompts: CopilotQuickPrompt[];
  telemetry?: CopilotTelemetry;
  onPromptSelect: (prompt: string) => void;
  onSend: (message: string) => void;
  onClear: () => void;
  onExpand: () => void;
}

export function GlobalCopilotDrawer({
  open,
  onOpenChange,
  context,
  messages,
  isProcessing,
  quickPrompts,
  telemetry,
  onPromptSelect,
  onSend,
  onClear,
  onExpand,
}: GlobalCopilotDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:w-[460px] sm:max-w-[460px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Prime AI</SheetTitle>
          <SheetDescription>{context.description}</SheetDescription>
        </SheetHeader>
        <GlobalCopilotSurface
          context={context}
          messages={messages}
          isProcessing={isProcessing}
          quickPrompts={quickPrompts}
          telemetry={telemetry}
          onPromptSelect={onPromptSelect}
          onSend={onSend}
          onClear={onClear}
          onExpand={onExpand}
        />
      </SheetContent>
    </Sheet>
  );
}
