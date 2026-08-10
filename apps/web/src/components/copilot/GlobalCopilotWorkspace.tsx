import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const hideFloatingAssistant = location.pathname === '/overview' || location.pathname === '/crm/mdec';
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
        {hideFloatingAssistant ? null : <GlobalCopilotFAB onClick={() => setMobileOpen((value) => !value)} isOpen={mobileOpen} label={fabLabel} />}
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

      {hideFloatingAssistant ? null : <GlobalCopilotFAB onClick={() => setIsAssistantOpen((value) => !value)} isOpen={isAssistantOpen} label={fabLabel} />}

      {isAssistantOpen && !hideFloatingAssistant ? (
        <div className="fixed bottom-24 right-6 z-[65] hidden h-[min(78vh,760px)] w-[440px] overflow-hidden rounded-lg border bg-card shadow-lg xl:block">
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
