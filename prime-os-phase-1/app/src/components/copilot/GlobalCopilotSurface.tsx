import { Bot, Sparkles, Trash2 } from 'lucide-react';
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
  headerActions?: React.ReactNode;
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
  headerActions,
}: GlobalCopilotSurfaceProps) {
  const showDebug = (
    import.meta.env.DEV
    && typeof window !== 'undefined'
    && window.localStorage.getItem('ech.assistant.debug') === '1'
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-card/95">
      <div className="border-b border-border/70 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Bot className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-[0.01em] text-foreground">ECH Assistant</h2>
                <span className="rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] text-primary">
                  Theo ngữ cảnh hiện tại
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Hỏi tự nhiên để hiểu dữ liệu, mở đúng màn hình hoặc chuẩn bị draft an toàn.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {headerActions}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={onClear}
              aria-label="Clear assistant conversation"
              title="Clear conversation"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-border/70 bg-background/70 p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 text-primary" />
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">
                Bối cảnh hiện tại
              </p>
              <p className="text-sm font-medium text-foreground">{context.title}</p>
              <p className="text-xs leading-5 text-muted-foreground">{context.description}</p>
              {context.insight ? (
                <p className="text-xs text-foreground/85">Snapshot: {context.insight}</p>
              ) : null}
            </div>
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
