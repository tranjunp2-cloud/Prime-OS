// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GlobalCopilotWorkspace } from './GlobalCopilotWorkspace';

const breakpoint = vi.hoisted(() => ({ desktop: true }));
vi.mock('@/hooks/use-media-query', () => ({ useMediaQuery: () => breakpoint.desktop }));
vi.mock('@/hooks/use-global-copilot-engine', () => ({ useGlobalCopilotEngine: () => ({
  messages: [], isProcessing: false, isInitialized: true, initialize: vi.fn(),
  sendMessage: vi.fn(), clearMessages: vi.fn(), quickPrompts: [], currentContext: {}, telemetry: {},
}) }));
vi.mock('./GlobalCopilotDrawer', () => ({ GlobalCopilotDrawer: () => null }));
vi.mock('./GlobalCopilotSurface', () => ({ GlobalCopilotSurface: () => null }));
afterEach(() => { cleanup(); breakpoint.desktop = true; });

function DraftEditor() {
  const [value, setValue] = useState('Saved product');
  return <input aria-label="Product draft" value={value} onChange={event => setValue(event.target.value)} />;
}

it('preserves unsaved page state and the input element when crossing the assistant breakpoint both ways', () => {
  const app = () => <MemoryRouter><GlobalCopilotWorkspace><DraftEditor /></GlobalCopilotWorkspace></MemoryRouter>;
  const { rerender } = render(app());
  const input = screen.getByRole('textbox', { name: 'Product draft' });
  fireEvent.change(input, { target: { value: 'Unsaved product changes' } });
  for (const desktop of [false, true, false]) {
    breakpoint.desktop = desktop;
    rerender(app());
    expect(screen.getByRole('textbox', { name: 'Product draft' })).toBe(input);
    expect(input).toHaveValue('Unsaved product changes');
  }
});
