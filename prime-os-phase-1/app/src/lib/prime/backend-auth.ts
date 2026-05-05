export const primeAuthTokenStorageKey = 'prime-os-auth-token';

const defaultControlPlaneBase = import.meta.env.DEV ? 'http://127.0.0.1:8180' : '';
let primeAuthToken: string | null = null;

export interface PrimeAccount {
  id: string;
  role: 'admin' | 'user';
  fullName: string;
  email: string;
  workspace?: string;
  seatType?: string;
}

export interface PrimeSession {
  role: 'admin' | 'user';
  roleLabel: string;
  description: string;
  canReset: boolean;
  canWrite: boolean;
  visibleResources: string[];
  writableResources: string[];
  hiddenResources: string[];
  resourcePermissions: Record<string, { read: boolean; write: boolean }>;
  account: PrimeAccount | null;
  token?: string;
  expiresAt?: string;
}

export interface PrimeLoginResponse {
  token: string;
  expiresAt: string;
  session: PrimeSession;
}

export function resolvePrimeBackendBase() {
  const configured = import.meta.env.VITE_PRIME_ADMIN_API_BASE?.trim();
  return (configured || defaultControlPlaneBase).replace(/\/$/, '');
}

export function getPrimeAuthToken() {
  if (primeAuthToken) return primeAuthToken;
  if (typeof window === 'undefined') return null;
  primeAuthToken = window.sessionStorage.getItem(primeAuthTokenStorageKey);
  return primeAuthToken;
}

export function setPrimeAuthToken(token: string) {
  primeAuthToken = token;
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(primeAuthTokenStorageKey, token);
  }
}

export function clearPrimeAuthToken() {
  primeAuthToken = null;
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(primeAuthTokenStorageKey);
  }
}

export function createPrimeAuthHeaders(token = getPrimeAuthToken()) {
  const headers = new Headers();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}
