import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { CopilotTelemetry, GlobalCopilotMessage } from '@/components/copilot/types';
import {
  buildWelcomeMessage,
  resolveCopilotContext,
  resolveCopilotResponse,
} from '@/lib/copilot/context';

function deriveConversationState(messages: GlobalCopilotMessage[]) {
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant');

  return {
    lastDomain: lastAssistantMessage?.domain,
    lastIntent: lastAssistantMessage?.intent,
    lastEntityRef: lastAssistantMessage?.entityRef ?? null,
  };
}

export function useGlobalCopilotEngine() {
  const location = useLocation();
  const currentContext = useMemo(() => resolveCopilotContext(location.pathname), [location.pathname]);
  const [messages, setMessages] = useState<GlobalCopilotMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initialize = useCallback(() => {
    if (isInitialized) return;

    const welcome = buildWelcomeMessage(currentContext);
    const welcomeMessage: GlobalCopilotMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: welcome.content,
      timestamp: new Date(),
      domain: welcome.domain,
      intent: welcome.intent,
      actions: welcome.actions,
      citations: welcome.citations,
      followUpPrompts: welcome.followUpPrompts,
      entityRef: welcome.entityRef,
      debug: welcome.debug,
    };

    setMessages([welcomeMessage]);
    setIsInitialized(true);
  }, [currentContext, isInitialized]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: GlobalCopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    await new Promise((resolve) => setTimeout(resolve, 280 + Math.random() * 220));

    const response = resolveCopilotResponse(
      content,
      location.pathname,
      deriveConversationState([...messages, userMessage]),
    );

    const assistantMessage: GlobalCopilotMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      domain: response.domain,
      intent: response.intent,
      actions: response.actions?.length ? response.actions : undefined,
      citations: response.citations,
      followUpPrompts: response.followUpPrompts,
      entityRef: response.entityRef,
      debug: response.debug,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsProcessing(false);
  }, [location.pathname, messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setIsInitialized(false);
  }, []);

  const quickPrompts = useMemo(() => {
    const lastAssistantWithFollowUps = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant' && message.followUpPrompts?.length);

    if (!lastAssistantWithFollowUps?.followUpPrompts?.length) {
      return currentContext.quickPrompts;
    }

    if (
      lastAssistantWithFollowUps.domain
      && lastAssistantWithFollowUps.domain !== currentContext.domain
      && !lastAssistantWithFollowUps.entityRef
    ) {
      return currentContext.quickPrompts;
    }

    return lastAssistantWithFollowUps.followUpPrompts;
  }, [currentContext.domain, currentContext.quickPrompts, messages]);

  const telemetry = useMemo<CopilotTelemetry>(() => {
    const assistantMessages = messages.filter((message) => message.role === 'assistant');
    const lastAssistant = [...assistantMessages].reverse()[0];

    return {
      totalAssistantMessages: assistantMessages.length,
      clarifyCount: assistantMessages.filter((message) => message.intent === 'clarify').length,
      fallbackCount: assistantMessages.filter((message) => message.debug?.fellBack).length,
      lastIntent: lastAssistant?.intent,
      lastStrategy: lastAssistant?.debug?.selectedStrategy,
      lastConfidenceBucket: lastAssistant?.debug?.confidenceBucket,
    };
  }, [messages]);

  return {
    messages,
    isProcessing,
    isInitialized,
    initialize,
    sendMessage,
    clearMessages,
    quickPrompts,
    currentContext,
    telemetry,
  };
}
