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
            content: 'Mình cần bạn nói rõ hơn một chút.',
            timestamp: new Date(),
            intent: 'clarify',
            followUpPrompts: [
              { label: 'Giải thích trang', prompt: 'Trang này dùng để làm gì?' },
              { label: 'Mở orders', prompt: 'Mở orders' },
            ],
          },
        ]}
        isProcessing={false}
        onPromptSelect={onPromptSelect}
      />
    );

    expect(screen.getByText('Cần làm rõ')).toBeInTheDocument();
    expect(screen.getByText('Chọn nhanh một hướng để mình đi tiếp')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Giải thích trang' }));
    expect(onPromptSelect).toHaveBeenCalledWith('Trang này dùng để làm gì?');
  });
});
