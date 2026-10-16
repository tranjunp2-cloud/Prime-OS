// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet';

afterEach(cleanup);

describe('Sheet close button', () => {
  it('keeps the corner close button by default for existing drawers', () => {
    const onOpenChange = vi.fn();
    render(<Sheet open onOpenChange={onOpenChange}><SheetContent><SheetTitle>Default drawer</SheetTitle><SheetDescription>Drawer details</SheetDescription></SheetContent></Sheet>);
    fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('can omit the corner button without disabling Escape', () => {
    const onOpenChange = vi.fn();
    render(<Sheet open onOpenChange={onOpenChange}><SheetContent showCloseButton={false}><SheetTitle>Review drawer</SheetTitle><SheetDescription>Drawer details</SheetDescription></SheetContent></Sheet>);
    expect(screen.queryByRole('button', { name: 'Close', exact: true })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
