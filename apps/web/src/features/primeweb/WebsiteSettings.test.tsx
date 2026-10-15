// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { WebsiteSettings } from './WebsiteSettings';
import { createWebsite } from './store';

it('resets dependent location fields and filters schema types when the category changes', () => {
  render(<MemoryRouter><WebsiteSettings site={createWebsite('Test store')} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('State / Federal territory'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('City / District'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Postcode'), { target: { value: '82100' } });
  fireEvent.change(screen.getByLabelText('State / Federal territory'), { target: { value: '2' } });
  expect(screen.getByLabelText('City / District')).toHaveValue('');
  expect(screen.getByLabelText('Postcode')).toHaveValue('');
  expect(screen.getByLabelText('Postcode')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Business category'), { target: { value: 'restaurant' } });
  expect(screen.getByLabelText('Schema subtype')).toHaveValue('Restaurant');
  fireEvent.change(screen.getByLabelText('Business category'), { target: { value: 'store' } });
  expect(screen.getByLabelText('Schema subtype')).toHaveValue('Store');
});
