// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <GlobalCopilotWorkspace>
        <div>main content</div>
      </GlobalCopilotWorkspace>
    </MemoryRouter>,
  );
}

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
  GlobalCopilotSurface: ({ context }: { context: { title: string } }) => (
    <div data-testid="assistant-surface">{context.title}</div>
  ),
}));

vi.mock('./GlobalCopilotDrawer', () => ({
  GlobalCopilotDrawer: ({ open }: { open: boolean }) => (
    <div data-testid="assistant-drawer">{open ? 'open' : 'closed'}</div>
  ),
}));

vi.mock('./GlobalCopilotFAB', () => ({
  GlobalCopilotFAB: ({ onClick }: { onClick: () => void }) => (
    <button type="button" data-testid="assistant-fab" onClick={onClick}>
      Open Assistant
    </button>
  ),
}));

function renderWorkspace() {
  return render(
    <MemoryRouter initialEntries={['/orders']}>
      <GlobalCopilotWorkspace>
        <div>main content</div>
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

  it('initializes the engine and opens the desktop assistant when toggled', () => {
    renderWorkspace();

    expect(screen.getByText('main content')).toBeInTheDocument();
    expect(mockEngine.initialize).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('assistant-fab'));
    expect(screen.getByTestId('assistant-surface')).toHaveTextContent('Orders');
  });

  it('persists desktop assistant preference in local storage', () => {
    renderWorkspace();

    expect(window.localStorage.getItem('prime.assistant.floating-open')).toBe('closed');

    fireEvent.click(screen.getByTestId('assistant-fab'));
    expect(window.localStorage.getItem('prime.assistant.floating-open')).toBe('open');
  });

  it('falls back to FAB + drawer on mobile and opens the drawer on click', () => {
    desktopMode = false;

    renderWorkspace();

    expect(screen.getByTestId('assistant-drawer')).toHaveTextContent('closed');
    fireEvent.click(screen.getByTestId('assistant-fab'));
    expect(screen.getByTestId('assistant-drawer')).toHaveTextContent('open');
  });
});
