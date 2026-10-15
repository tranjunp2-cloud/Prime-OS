// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { Editor } from './Editor';
import { addWebsite, createWebsite } from './store';

it('shows Save only for content changes and restores Saved after saving', () => {
  const site = createWebsite('Save test');
  addWebsite(site);
  const view = (value: typeof site) => <MemoryRouter><Editor site={value} onPublish={() => {}} /></MemoryRouter>;
  const { rerender } = render(view(site));
  expect(screen.queryByRole('button', { name: 'Save', exact: true })).not.toBeInTheDocument();
  const edited = structuredClone(site);
  edited.draft.name = 'Changed name';
  rerender(view(edited));
  expect(screen.queryByText('Saved', { exact: true })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(screen.queryByRole('button', { name: 'Save', exact: true })).not.toBeInTheDocument();
  expect(screen.getByText('Saved', { exact: true })).toBeInTheDocument();
  rerender(view(site));
  expect(screen.getByRole('button', { name: 'Save', exact: true })).toBeInTheDocument();
  rerender(view(edited));
  expect(screen.queryByRole('button', { name: 'Save', exact: true })).not.toBeInTheDocument();
});
