import { Bot, Trash2 } from 'lucide-react';
import type { CopilotContextSummary, CopilotQuickPrompt, CopilotTelemetry, GlobalCopilotMessage } from './types';
import { Button } from '@/components/ui/button';
import { GlobalCopilotQuickPrompts } from './GlobalCopilotQuickPrompts';
import { GlobalCopilotChatThread } from './GlobalCopilotChatThread';
import { GlobalCopilotComposer } from './GlobalCopilotComposer';

interface GlobalCopilotSurfaceProps {
  context: CopilotContextSummary;
  messages: GlobalCopilotMessage[];
  isProcessing: boolean;
  quickPrompts: CopilotQuickPrompt[];
  telemetry?: CopilotTelemetry;
  onPromptSelect: (prompt: string) => void;
  onSend: (message: string) => void;
  onClear: () => void;
}

export function GlobalCopilotSurface({
  context,
  messages,
  isProcessing,
  quickPrompts,
  telemetry,
  onPromptSelect,
  onSend,
  onClear,
}: GlobalCopilotSurfaceProps) {
  const isAccountContext = context.title === 'Account Center';
  const isOperatingHomeContext = context.title === 'Operating Home';
  const assistantLabel = isAccountContext ? 'Admin AI' : 'Prime AI';
  const assistantBadge = isAccountContext ? 'IAM Guardrail' : isOperatingHomeContext ? 'Mission Control' : 'Growth Advisor';
  const assistantDescription = isAccountContext
    ? 'Access, permission, audit.'
    : isOperatingHomeContext
      ? 'Action queue, risk radar, evidence.'
      : 'Insight, recommendation, action.';
  const showDebug = (
    import.meta.env.DEV
    && typeof window !== 'undefined'
    && window.localStorage.getItem('ech.assistant.debug') === '1'
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[30px] bg-card/95 backdrop-blur-xl">
      <div className="border-b border-border/60 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold tracking-[0.01em] text-foreground">{assistantLabel}</h2>
                <span className="rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] text-primary">
                  {assistantBadge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {assistantDescription}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl border border-transparent hover:border-border/60 hover:bg-muted/70"
              onClick={onClear}
              aria-label="Clear Prime AI conversation"
              title="Clear Prime AI conversation"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {showDebug && telemetry ? (
          <div className="mt-2 rounded-xl border border-dashed border-primary/25 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
            Debug: {telemetry.lastStrategy ?? 'welcome'} · {telemetry.lastConfidenceBucket ?? 'high'} · clarify {telemetry.clarifyCount} · fallback {telemetry.fallbackCount}
          </div>
        ) : null}
      </div>

      <GlobalCopilotQuickPrompts
        prompts={quickPrompts}
        onSelect={onPromptSelect}
        disabled={isProcessing}
      />

      <GlobalCopilotChatThread
        messages={messages}
        isProcessing={isProcessing}
        onPromptSelect={onPromptSelect}
        disabled={isProcessing}
      />

      <GlobalCopilotComposer
        onSend={onSend}
        disabled={isProcessing}
      />
    </div>
  );
}
