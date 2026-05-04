import { useEffect, useState } from 'react';
import { useGlobalCopilotEngine } from '@/hooks/use-global-copilot-engine';
import { useMediaQuery } from '@/hooks/use-media-query';
import { GlobalCopilotDrawer } from './GlobalCopilotDrawer';
import { GlobalCopilotFAB } from './GlobalCopilotFAB';
import { GlobalCopilotSurface } from './GlobalCopilotSurface';

interface GlobalCopilotWorkspaceProps {
  children: React.ReactNode;
}

const ASSISTANT_PREFERENCE_KEY = 'prime.assistant.floating-open';

function readDesktopPreference() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(ASSISTANT_PREFERENCE_KEY) === 'open';
}

export function GlobalCopilotWorkspace({ children }: GlobalCopilotWorkspaceProps) {
  const isDesktopAssistant = useMediaQuery('(min-width: 1280px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(readDesktopPreference);
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
  const fabLabel = currentContext.title === 'Account Center' ? 'Admin AI' : 'Prime AI';

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      ASSISTANT_PREFERENCE_KEY,
      isAssistantOpen ? 'open' : 'closed',
    );
  }, [isAssistantOpen]);

  if (!isDesktopAssistant) {
    return (
      <>
        {children}
        <GlobalCopilotFAB onClick={() => setMobileOpen((value) => !value)} isOpen={mobileOpen} label={fabLabel} />
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
    <>
      <div className="min-w-0 h-full">
        {children}
      </div>

      <GlobalCopilotFAB onClick={() => setIsAssistantOpen((value) => !value)} isOpen={isAssistantOpen} label={fabLabel} />

      {isAssistantOpen ? (
        <div className="fixed bottom-24 right-6 z-[65] hidden h-[min(78vh,760px)] w-[440px] overflow-hidden rounded-[32px] border border-border/70 bg-card/95 shadow-2xl xl:block">
          <GlobalCopilotSurface
            context={currentContext}
            messages={messages}
            isProcessing={isProcessing}
            quickPrompts={quickPrompts}
            telemetry={telemetry}
            onPromptSelect={sendMessage}
            onSend={sendMessage}
            onClear={clearMessages}
          />
        </div>
      ) : null}
    </>
  );
}
