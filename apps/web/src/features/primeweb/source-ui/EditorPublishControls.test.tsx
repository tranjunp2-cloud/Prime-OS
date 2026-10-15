// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { addWebsite, createWebsite, publishSnapshot, updateDraft, updateWebsite, usePrimeWeb } from '../store';
import { EditorPublishControls } from './EditorPublishControls';

it('shows Update only for unpublished changes and hides it after publishing', () => {
  const site = publishSnapshot(createWebsite('Update test'));
  addWebsite(site);
  function Harness() {
    const state = usePrimeWeb();
    return <EditorPublishControls site={state.sites.find(item => item.id === site.id)!} onPublish={() => {}} />;
  }
  render(<MemoryRouter><Harness /></MemoryRouter>);
  expect(screen.queryByRole('button', { name: 'Update', exact: true })).not.toBeInTheDocument();
  act(() => updateDraft(site.id, draft => ({ ...draft, name: 'Changed website' })));
  expect(screen.getByRole('button', { name: 'Update', exact: true })).toBeInTheDocument();
  act(() => updateWebsite(site.id, current => ({ ...current, savedAt: new Date().toISOString() })));
  expect(screen.getByRole('button', { name: 'Update', exact: true })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Update', exact: true }));
  expect(screen.queryByRole('button', { name: 'Update', exact: true })).not.toBeInTheDocument();
  expect(screen.getByText('LIVE', { exact: true })).toBeInTheDocument();
});
