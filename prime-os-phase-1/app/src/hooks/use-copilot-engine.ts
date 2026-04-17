// Hook for the inventory copilot engine
// Manages messages, intent parsing, and response generation

import { useState, useCallback, useMemo } from 'react';
import { CopilotMessage, CopilotFilters, WarehouseOption } from '@/components/inventory/copilot/types';
import { parseIntent } from '@/components/inventory/copilot/intent-parser';
import { generateResponse } from '@/components/inventory/copilot/response-generator';
import { InventoryPositionRow } from '@/components/inventory/InventorySummaryTable';

interface UseCopilotEngineParams {
  items: InventoryPositionRow[];
  currentFilters: CopilotFilters;
  warehouseOptions: WarehouseOption[];
}

export function useCopilotEngine({
  items,
  currentFilters,
  warehouseOptions,
}: UseCopilotEngineParams) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Enhance warehouse options with codes from items
  const enhancedWarehouseOptions = useMemo(() => {
    const warehouseMap = new Map<string, WarehouseOption>();
    
    // Start with existing options
    warehouseOptions.forEach(wh => {
      warehouseMap.set(wh.id, wh);
    });

    // Enhance with codes from items
    items.forEach(item => {
      // Find matching warehouse and add code
      for (const wh of warehouseOptions) {
        if (item.warehouse_name.includes(wh.name) || wh.name.includes(item.warehouse_name.split(' ')[0])) {
          warehouseMap.set(wh.id, {
            ...wh,
            code: item.warehouse_code,
          });
        }
      }
    });

    return Array.from(warehouseMap.values());
  }, [warehouseOptions, items]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    // Simulate processing delay for realism
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 400));

    // Parse intent
    const parsedIntent = parseIntent(content, enhancedWarehouseOptions);

    // Generate response
    const response = generateResponse({
      intent: parsedIntent,
      allItems: items,
      currentFilters,
      warehouseOptions: enhancedWarehouseOptions,
    });

    const assistantMessage: CopilotMessage = {
      id: `assistant-${Date.now()}`,
      ...response,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsProcessing(false);
  }, [items, currentFilters, enhancedWarehouseOptions]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isProcessing,
    sendMessage,
    clearMessages,
    warehouseOptions: enhancedWarehouseOptions,
  };
}
