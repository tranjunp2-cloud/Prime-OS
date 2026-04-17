import { useEffect, useRef, useState } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useGlobalCopilotEngine } from '@/hooks/use-global-copilot-engine';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { GlobalCopilotDrawer } from './GlobalCopilotDrawer';
import { GlobalCopilotFAB } from './GlobalCopilotFAB';
import { GlobalCopilotSurface } from './GlobalCopilotSurface';

interface GlobalCopilotWorkspaceProps {
  children: React.ReactNode;
}

const ASSISTANT_PREFERENCE_KEY = 'prime.assistant.desktop-open';

function readDesktopPreference() {
  return false;
}

export function GlobalCopilotWorkspace({ children }: GlobalCopilotWorkspaceProps) {
  const isDesktopAssistant = useMediaQuery('(min-width: 1280px)');
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(readDesktopPreference);
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
    if (!isDesktopAssistant) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    if (isAssistantExpanded && panel.isCollapsed()) {
      panel.expand();
      return;
    }

    if (!isAssistantExpanded && !panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isAssistantExpanded, isDesktopAssistant]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      ASSISTANT_PREFERENCE_KEY,
      isAssistantExpanded ? 'expanded' : 'collapsed',
    );
  }, [isAssistantExpanded]);

  const toggleDesktopAssistant = () => {
    const panel = panelRef.current;
    if (!panel) {
      setIsAssistantExpanded(true);
      return;
    }

    if (panel.isCollapsed()) {
      panel.expand();
      setIsAssistantExpanded(true);
      return;
    }

    panel.collapse();
    setIsAssistantExpanded(false);
  };

  if (!isDesktopAssistant) {
    return (
      <>
        {children}
        <GlobalCopilotFAB onClick={() => setMobileOpen(true)} />
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

  if (!isAssistantExpanded) {
    return (
      <div className="flex h-full min-w-0">
        <div className="min-w-0 flex-1">
          {children}
        </div>
        <div className="flex h-full w-[72px] shrink-0 flex-col items-center justify-between border-l border-border/70 bg-card/90 px-2 py-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 rounded-2xl"
                onClick={toggleDesktopAssistant}
                aria-label="Expand assistant panel"
                title="Expand assistant panel"
              >
                <PanelRightOpen className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Mở ECH Assistant</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex flex-col items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <PanelRightOpen className="size-5" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Context
              </p>
              <p className="mt-1 text-xs font-medium text-foreground">{currentContext.title}</p>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 rounded-2xl"
                onClick={toggleDesktopAssistant}
                aria-label="Expand assistant"
                title="Expand assistant"
              >
                <PanelRightOpen className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Route-aware assistant</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={74} minSize={48} className="min-w-0">
        {children}
      </ResizablePanel>
      <ResizableHandle withHandle className="bg-border/70" />
      <ResizablePanel
        ref={panelRef}
        defaultSize={26}
        minSize={20}
        maxSize={40}
        collapsible
        collapsedSize={5}
        onCollapse={() => setIsAssistantExpanded(false)}
        className="min-w-[72px]"
      >
        <GlobalCopilotSurface
          context={currentContext}
          messages={messages}
          isProcessing={isProcessing}
          quickPrompts={quickPrompts}
          telemetry={telemetry}
          onPromptSelect={sendMessage}
          onSend={sendMessage}
          onClear={clearMessages}
          headerActions={(
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={toggleDesktopAssistant}
              aria-label="Collapse assistant panel"
              title="Collapse assistant panel"
            >
              <PanelRightClose className="size-4" />
            </Button>
          )}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
