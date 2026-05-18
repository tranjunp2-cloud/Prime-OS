import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgPlan } from './use-org-plan';
import { toast } from 'sonner';

interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  timestamp: Date;
}

interface CopilotResponse {
  response: string;
  toolsUsed: string[];
  error?: string;
}

export function useInventoryCopilot() {
  const { user } = useAuth();
  const { plan } = useOrgPlan();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    if (!user?.id) {
      toast.error('Please sign in to use the AI Copilot');
      return null;
    }

    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage: CopilotMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inventory-copilot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            message,
            conversationHistory: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            userPlan: plan,
            userId: user.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please wait a moment before trying again.');
          throw new Error('Rate limit exceeded');
        }
        if (response.status === 402) {
          toast.error('AI credits exhausted. Please add credits to continue.');
          throw new Error('Credits exhausted');
        }
        
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const data: CopilotResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Add assistant message
      const assistantMessage: CopilotMessage = {
        role: 'assistant',
        content: data.response,
        toolsUsed: data.toolsUsed,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response';
      setError(errorMessage);
      
      // Add error message to chat
      const errorAssistantMessage: CopilotMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorAssistantMessage]);
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, plan, messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
