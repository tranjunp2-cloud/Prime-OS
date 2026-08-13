import { useEffect, useState } from 'react';
import { useGlobalCopilotEngine } from '@/hooks/use-global-copilot-engine';
import { useMediaQuery } from '@/hooks/use-media-query';
import { GlobalCopilotDrawer } from './GlobalCopilotDrawer';
import { GlobalCopilotSurface } from './GlobalCopilotSurface';

interface GlobalCopilotWorkspaceProps {
  children: React.ReactNode;
}

export function GlobalCopilotWorkspace({ children }: GlobalCopilotWorkspaceProps) {
  const isDesktopAssistant = useMediaQuery('(min-width: 1280px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const {
    messages,
    isProcessing,
    isInitialized,
    initialize,
    sendMessage,
    clearMessages,
    quickPrompts,
    currentContext,
    telemetry,
  } = useGlobalCopilotEngine();
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  useEffect(() => {
    const openAssistant = () => {
      if (isDesktopAssistant) {
        setIsAssistantOpen(true);
        return;
      }

      setMobileOpen(true);
    };

    window.addEventListener('prime-ai:open', openAssistant);

    return () => {
      window.removeEventListener('prime-ai:open', openAssistant);
    };
  }, [isDesktopAssistant]);

  if (!isDesktopAssistant) {
    return (
      <>
        {children}
        <GlobalCopilotDrawer
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          context={currentContext}
          messages={messages}
          isProcessing={isProcessing}
          quickPrompts={quickPrompts}
          onPromptSelect={sendMessage}
          onSend={sendMessage}
          onClear={clearMessages}
        />
      </>
    );
  }

  return (
    <div className="flex h-full min-w-0">
      <div className="h-full min-w-0 flex-1 overflow-hidden">
        {children}
      </div>
      {isAssistantOpen ? (
        <aside className="hidden h-full w-[420px] shrink-0 overflow-hidden border-l border-border bg-card xl:block" aria-label="Prime AI panel">
          <GlobalCopilotSurface
            context={currentContext}
            messages={messages}
            isProcessing={isProcessing}
            quickPrompts={quickPrompts}
            telemetry={telemetry}
            onPromptSelect={sendMessage}
            onSend={sendMessage}
            onClose={() => setIsAssistantOpen(false)}
          />
        </aside>
      ) : null}
    </div>
  );
}
