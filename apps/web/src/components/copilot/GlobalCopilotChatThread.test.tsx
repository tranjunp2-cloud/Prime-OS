// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GlobalCopilotChatThread } from './GlobalCopilotChatThread';

describe('GlobalCopilotChatThread', () => {
  it('renders inline clarify choices and forwards the selected follow-up prompt', () => {
    const onPromptSelect = vi.fn();

    render(
      <GlobalCopilotChatThread
        messages={[
          {
            id: 'assistant-clarify',
            role: 'assistant',
            content: 'I need a little more detail.',
            timestamp: new Date(),
            intent: 'clarify',
            followUpPrompts: [
              { label: 'Explain this page', prompt: 'What is this page used for?' },
              { label: 'Open Orders', prompt: 'Open Orders' },
            ],
          },
        ]}
        isProcessing={false}
        onPromptSelect={onPromptSelect}
      />
    );

    expect(screen.getByText('Needs clarification')).toBeInTheDocument();
    expect(screen.getByText('Choose a direction to continue')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Explain this page' }));
    expect(onPromptSelect).toHaveBeenCalledWith('What is this page used for?');
  });
});
