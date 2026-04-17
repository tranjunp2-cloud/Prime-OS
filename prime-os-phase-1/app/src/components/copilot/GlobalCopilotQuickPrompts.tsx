import { Button } from '@/components/ui/button';

interface GlobalCopilotQuickPromptsProps {
  prompts: Array<{ label: string; prompt: string }>;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function GlobalCopilotQuickPrompts({ prompts, onSelect, disabled }: GlobalCopilotQuickPromptsProps) {
  return (
    <div className="border-b border-border/70 bg-muted/20 px-4 py-3">
      <p className="mb-2 text-[11px] font-medium text-muted-foreground">Thử một hướng tiếp theo</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {prompts.map((item, index) => (
          <Button
            key={index}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto shrink-0 rounded-full border-border/60 bg-background/70 px-3 py-2 text-xs hover:bg-accent/60"
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
