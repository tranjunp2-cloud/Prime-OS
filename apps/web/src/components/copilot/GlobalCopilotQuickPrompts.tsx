import { Button } from '@/components/ui/button';

interface GlobalCopilotQuickPromptsProps {
  prompts: Array<{ label: string; prompt: string }>;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function GlobalCopilotQuickPrompts({ prompts, onSelect, disabled }: GlobalCopilotQuickPromptsProps) {
  return (
    <div className="border-b border-border/60 bg-background/90 px-5 py-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {prompts.map((item, index) => (
          <Button
            key={index}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto shrink-0 rounded-full border-border/60 bg-muted/30 px-3 py-2 text-xs text-foreground/90 hover:bg-accent/60"
            onClick={() => !disabled && onSelect(item.prompt)}
            disabled={disabled}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
