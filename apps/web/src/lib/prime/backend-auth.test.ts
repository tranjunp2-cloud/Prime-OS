// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  clearPrimeAuthToken,
  createPrimeAuthHeaders,
  getPrimeAuthToken,
  primeAuthTokenStorageKey,
  setPrimeAuthToken
} from './backend-auth';

describe('Prime backend auth token handling', () => {
  it('persists bearer tokens so protected routes survive reloads', () => {
    window.sessionStorage.clear();

    setPrimeAuthToken('token_123');

    expect(getPrimeAuthToken()).toBe('token_123');
    expect(window.sessionStorage.getItem(primeAuthTokenStorageKey)).toBe('token_123');
    expect(createPrimeAuthHeaders().get('Authorization')).toBe('Bearer token_123');

    clearPrimeAuthToken();
    expect(getPrimeAuthToken()).toBeNull();
  });
});
