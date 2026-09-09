// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalCopilotWorkspace } from './GlobalCopilotWorkspace';

const mockEngine = {
  messages: [],
  isProcessing: false,
  isInitialized: false,
  initialize: vi.fn(),
  sendMessage: vi.fn(),
  clearMessages: vi.fn(),
  quickPrompts: [{ label: 'Pending Orders', prompt: 'Cho mình danh sách order đang pending' }],
  currentContext: {
    domain: 'orders' as const,
    title: 'Orders',
    description: 'Theo dõi intake, allocation, reservation, shipping và exception của order flow.',
    insight: 'Pending: 12 · Shipping: 4',
    citations: ['Current route: /orders'],
    quickPrompts: [{ label: 'Pending Orders', prompt: 'Cho mình danh sách order đang pending' }],
  },
};

let desktopMode = true;

vi.mock('@/hooks/use-global-copilot-engine', () => ({
  useGlobalCopilotEngine: () => mockEngine,
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => desktopMode,
}));

vi.mock('@/components/ui/resizable', async () => {
  const ReactModule = await import('react');

  return {
    ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="panel-group">{children}</div>,
    ResizableHandle: () => <div data-testid="panel-handle" />,
    ResizablePanel: ReactModule.forwardRef(function MockResizablePanel(
      { children }: { children: React.ReactNode },
      ref: React.Ref<{ isCollapsed: () => boolean; expand: () => void; collapse: () => void }>,
    ) {
      ReactModule.useImperativeHandle(ref, () => ({
        isCollapsed: () => false,
        expand: () => undefined,
        collapse: () => undefined,
      }));

      return <div data-testid="panel">{children}</div>;
    }),
  };
});

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./GlobalCopilotSurface', () => ({
  GlobalCopilotSurface: ({ context, onClose, onExpand }: { context: { title: string }; onClose: () => void; onExpand: () => void }) => (
    <div data-testid="assistant-surface">
      {context.title}
      <button type="button" onClick={onExpand}>Expand to full workspace</button>
      <button type="button" onClick={onClose}>Close Prime AI</button>
    </div>
  ),
}));

vi.mock('./GlobalCopilotDrawer', () => ({
  GlobalCopilotDrawer: ({ open, onExpand }: { open: boolean; onExpand: () => void }) => (
    <div data-testid="assistant-drawer">
      {open ? 'open' : 'closed'}
      {open ? <button type="button" onClick={onExpand}>Expand to full workspace</button> : null}
    </div>
  ),
}));

vi.mock('./GlobalCopilotFAB', () => ({
  GlobalCopilotFAB: ({ onClick }: { onClick: () => void }) => (
    <button type="button" data-testid="assistant-fab" onClick={onClick}>
      Open Assistant
    </button>
  ),
}));

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderWorkspace() {
  return render(
    <MemoryRouter initialEntries={['/orders']}>
      <GlobalCopilotWorkspace>
        <div>main content<LocationProbe /></div>
      </GlobalCopilotWorkspace>
    </MemoryRouter>,
  );
}

describe('GlobalCopilotWorkspace', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    const storage = (() => {
      let store = new Map<string, string>();

      return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, String(value));
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store = new Map<string, string>();
        },
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      value: storage,
      writable: true,
      configurable: true,
    });

    desktopMode = true;
    window.localStorage.clear();
    mockEngine.initialize.mockClear();
  });

  it('initializes the engine and opens the contextual desktop panel from the header event', () => {
    renderWorkspace();

    expect(screen.getByText('main content')).toBeInTheDocument();
    expect(mockEngine.initialize).toHaveBeenCalledTimes(1);

    act(() => window.dispatchEvent(new CustomEvent('prime-ai:open')));
    expect(screen.getByTestId('assistant-surface')).toHaveTextContent('Orders');
  });

  it('expands the contextual panel into the full Prime AI workspace', () => {
    renderWorkspace();

    act(() => window.dispatchEvent(new CustomEvent('prime-ai:open')));
    fireEvent.click(screen.getByRole('button', { name: 'Expand to full workspace' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/prime-ai');
    expect(screen.queryByTestId('assistant-surface')).not.toBeInTheDocument();
  });

  it('closes the desktop assistant without clearing the conversation', () => {
    renderWorkspace();

    act(() => window.dispatchEvent(new CustomEvent('prime-ai:open')));
    fireEvent.click(screen.getByRole('button', { name: 'Close Prime AI' }));

    expect(screen.queryByTestId('assistant-surface')).not.toBeInTheDocument();
    expect(mockEngine.clearMessages).not.toHaveBeenCalled();
  });

  it('uses an overlay drawer on mobile and can expand it to the workspace', () => {
    desktopMode = false;

    renderWorkspace();

    expect(screen.getByTestId('assistant-drawer')).toHaveTextContent('closed');
    act(() => window.dispatchEvent(new CustomEvent('prime-ai:open')));
    expect(screen.getByTestId('assistant-drawer')).toHaveTextContent('open');
    fireEvent.click(screen.getByRole('button', { name: 'Expand to full workspace' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/prime-ai');
    expect(screen.getByTestId('assistant-drawer')).toHaveTextContent('closed');
  });
});
