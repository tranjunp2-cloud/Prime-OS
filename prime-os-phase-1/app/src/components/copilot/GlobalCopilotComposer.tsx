import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface GlobalCopilotComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function GlobalCopilotComposer({
  onSend,
  disabled,
}: GlobalCopilotComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border/60 bg-background/95 px-5 py-4">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Hỏi Prime AI...'
          disabled={disabled}
          className="min-h-[52px] max-h-[120px] resize-none rounded-2xl border-border/60 bg-muted/20 px-4 py-3 text-sm leading-6 shadow-none placeholder:text-muted-foreground/70"
          rows={1}
          aria-label="Prime AI message"
        />
        <Button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          size="icon"
          className="size-12 flex-shrink-0 rounded-2xl shadow-sm"
          aria-label="Send message to Prime AI"
        >
          <Send className="size-4" />
        </Button>
      </div>

      <div className="mt-2 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 flex-shrink-0 text-primary" />
        <p>
          Draft trước khi thực thi.
        </p>
      </div>
    </div>
  );
}
