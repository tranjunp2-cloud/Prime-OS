import { useRef, useEffect } from 'react';
import { Bot, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalCopilotMessage } from './types';
import { GlobalCopilotActions } from './GlobalCopilotActions';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';

interface GlobalCopilotChatThreadProps {
  messages: GlobalCopilotMessage[];
  isProcessing: boolean;
  onPromptSelect: (prompt: string) => void;
  disabled?: boolean;
}

function getAssistantMessageTone(intent: GlobalCopilotMessage['intent']) {
  switch (intent) {
    case 'clarify':
      return {
        label: 'Cần làm rõ',
        bubbleClassName: 'border-amber-500/30 bg-amber-500/10',
        badgeClassName: 'border-amber-500/30 bg-amber-500/15 text-amber-100',
      };
    case 'write_draft':
      return {
        label: 'Draft an toàn',
        bubbleClassName: 'border-primary/30 bg-primary/10',
        badgeClassName: 'border-primary/20 bg-primary/15 text-primary',
      };
    case 'navigate':
      return {
        label: 'Điều hướng',
        bubbleClassName: 'border-emerald-500/25 bg-emerald-500/10',
        badgeClassName: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200',
      };
    default:
      return null;
  }
}

export function GlobalCopilotChatThread({
  messages,
  isProcessing,
  onPromptSelect,
  disabled,
}: GlobalCopilotChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const getVisibleCitations = (citations: string[] | undefined) => (
    citations?.filter((citation) => (
      !citation.startsWith('Current route:')
      && !citation.startsWith('Source:')
      && !citation.startsWith('Matched ')
    )) ?? []
  );

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((message) => (
        (() => {
          const tone = message.role === 'assistant' ? getAssistantMessageTone(message.intent) : null;
          const showInlineClarifyChoices = (
            message.role === 'assistant'
            && message.intent === 'clarify'
            && (message.followUpPrompts?.length ?? 0) > 0
          );

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div
                className={cn(
                  'size-8 rounded-full flex items-center justify-center flex-shrink-0',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {message.role === 'user' ? (
                  <User className="size-4" />
                ) : (
                  <Bot className="size-4" />
                )}
              </div>

              <div
                className={cn(
                  'max-w-[88%] rounded-2xl px-4 py-3 shadow-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border/70 bg-muted/70',
                  tone?.bubbleClassName,
                )}
              >
                {tone ? (
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium leading-none',
                      tone.badgeClassName,
                    )}>
                      <Sparkles className="size-3" />
                      {tone.label}
                    </span>
                  </div>
                ) : null}

                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="my-2 list-disc pl-4">{children}</ul>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      a: ({ href, children }) => (
                        <a href={href} className="text-primary underline hover:no-underline">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {showInlineClarifyChoices ? (
                  <div className="mt-3">
                    <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                      Chọn nhanh một hướng để mình đi tiếp
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {message.followUpPrompts?.map((prompt) => (
                        <Button
                          key={`${message.id}-${prompt.prompt}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto rounded-full border-border/70 bg-background/80 px-3 py-2 text-xs"
                          onClick={() => onPromptSelect(prompt.prompt)}
                          disabled={disabled}
                        >
                          {prompt.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {message.role === 'assistant' && getVisibleCitations(message.citations).length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {getVisibleCitations(message.citations).map((citation) => (
                      <span
                        key={citation}
                        className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[10px] leading-none text-muted-foreground"
                      >
                        {citation}
                      </span>
                    ))}
                  </div>
                ) : null}

                {message.role === 'assistant' && message.actions && (
                  <GlobalCopilotActions actions={message.actions} />
                )}
              </div>
            </div>
          );
        })()
      ))}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex gap-3">
          <div className="size-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Bot className="size-4" />
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/70 px-4 py-3">
            <div className="flex gap-1">
              <span className="size-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="size-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="size-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {messages.length === 0 && !isProcessing && (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
          <Bot className="size-12 mb-4 opacity-50" />
          <p className="text-sm">Bắt đầu hỏi để dùng ECH Assistant</p>
        </div>
      )}
    </div>
  );
}
