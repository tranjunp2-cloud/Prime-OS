// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { getOrders } from '@/lib/order-store';
import { useGlobalCopilotEngine } from './use-global-copilot-engine';

beforeAll(async () => {
  await seedDemoData('assistant_engine_qa');
});

function createWrapper(route: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;
  };
}

describe('useGlobalCopilotEngine', () => {
  it('initializes with a route-aware welcome message', () => {
    const { result } = renderHook(() => useGlobalCopilotEngine(), {
      wrapper: createWrapper('/orders'),
    });

    act(() => {
      result.current.initialize();
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toContain('context của Orders');
    expect(result.current.messages[0].followUpPrompts?.length).toBeGreaterThan(0);
    expect(result.current.quickPrompts.some((item) => item.label === 'Đơn pending')).toBe(true);
  });

  it('returns safe draft actions for product-create prompts', async () => {
    const { result } = renderHook(() => useGlobalCopilotEngine(), {
      wrapper: createWrapper('/products'),
    });

    act(() => {
      result.current.initialize();
    });

    await act(async () => {
      await result.current.sendMessage('Tạo product mới tên "Compact Lamp" brand "PrimeOS" sku PRIME-LAMP-001');
    });

    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.intent).toBe('write_draft');
    expect(lastMessage.actions?.[0]?.url).toContain('/products/new?');
    expect(lastMessage.actions?.[0]?.url).toContain('sku=PRIME-LAMP-001');
    expect(lastMessage.content).toContain('product draft');
  });

  it('uses contextual navigation answers for pending-order requests', async () => {
    const { result } = renderHook(() => useGlobalCopilotEngine(), {
      wrapper: createWrapper('/orders'),
    });

    act(() => {
      result.current.initialize();
    });

    await act(async () => {
      await result.current.sendMessage('Cho mình danh sách order đang pending');
    });

    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.domain).toBe('orders');
    expect(lastMessage.actions?.[0]).toMatchObject({
      type: 'navigate',
      url: '/orders?status=pending',
    });
  });

  it('keeps lightweight memory for follow-up questions about the same order', async () => {
    const order = getOrders().find((candidate) => /prime-[a-z]{2,4}-\d{4}/i.test(candidate.order_id));
    if (!order) {
      throw new Error('Missing seeded assistant QA order');
    }

    const { result } = renderHook(() => useGlobalCopilotEngine(), {
      wrapper: createWrapper('/orders'),
    });

    act(() => {
      result.current.initialize();
    });

    await act(async () => {
      await result.current.sendMessage(`Cho mình xem đơn ${order.order_id}`);
    });

    await act(async () => {
      await result.current.sendMessage('Đơn này đang stuck ở đâu?');
    });

    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.domain).toBe('orders');
    expect(lastMessage.content).toContain(order.order_id);
    expect(result.current.quickPrompts.some((item) => item.label === 'Kho xử lý')).toBe(true);
  });

  it('tracks clarify telemetry for ambiguous requests', async () => {
    const { result } = renderHook(() => useGlobalCopilotEngine(), {
      wrapper: createWrapper('/orders'),
    });

    act(() => {
      result.current.initialize();
    });

    await act(async () => {
      await result.current.sendMessage('check ho');
    });

    expect(result.current.telemetry.clarifyCount).toBe(1);
    expect(result.current.telemetry.fallbackCount).toBe(0);
    expect(result.current.telemetry.lastStrategy).toBe('clarify');
    expect(result.current.telemetry.lastConfidenceBucket).toBe('low');
  });

  it('keeps inventory requests inside the dedicated inventory boundary', async () => {
    const { result } = renderHook(() => useGlobalCopilotEngine(), {
      wrapper: createWrapper('/inventory'),
    });

    act(() => {
      result.current.initialize();
    });

    await act(async () => {
      await result.current.sendMessage('ATS và tồn kho khả dụng đang như nào?');
    });

    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.domain).toBe('inventory_module_2');
    expect(lastMessage.intent).toBe('policy_qa');
    expect(lastMessage.actions?.[0]?.url).toBe('/inventory');
  });
});
