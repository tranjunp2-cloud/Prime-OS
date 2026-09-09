import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  PrimeAccount,
  PrimeLoginResponse,
  PrimeSession,
  clearPrimeAuthToken,
  createPrimeAuthHeaders,
  getPrimeAuthToken,
  resolvePrimeBackendBase,
  setPrimeAuthToken
} from '@/lib/prime/backend-auth';

interface AuthContextType {
  user: PrimeAccount | null;
  session: PrimeSession | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; session: PrimeSession | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const prototypeAccount: PrimeAccount = {
  id: 'prototype-admin',
  role: 'admin',
  fullName: 'PrimeOS Admin',
  email: 'admin@primeos.local',
  workspace: 'Main Workspace',
  seatType: 'full_admin',
};

const prototypeSession: PrimeSession = {
  role: 'admin',
  roleLabel: 'Admin',
  description: 'Prototype administrator',
  canReset: true,
  canWrite: true,
  visibleResources: ['*'],
  writableResources: ['*'],
  hiddenResources: [],
  resourcePermissions: {},
  account: prototypeAccount,
  token: 'primeos-prototype-token',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const prototypeMode = import.meta.env.VITE_PRIME_PROTOTYPE === 'true';
  const [user, setUser] = useState<PrimeAccount | null>(prototypeMode ? prototypeAccount : null);
  const [session, setSession] = useState<PrimeSession | null>(prototypeMode ? prototypeSession : null);
  const [token, setToken] = useState<string | null>(prototypeMode ? 'primeos-prototype-token' : null);
  const [loading, setLoading] = useState(!prototypeMode);

  const applySession = useCallback((nextToken: string, nextSession: PrimeSession) => {
    setPrimeAuthToken(nextToken);
    setToken(nextToken);
    setSession(nextSession);
    setUser(nextSession.account);
  }, []);

  const clearSession = useCallback(() => {
    clearPrimeAuthToken();
    setToken(null);
    setSession(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (prototypeMode) return;
    const restoreSession = async () => {
      const storedToken = getPrimeAuthToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${resolvePrimeBackendBase()}/api/session`, {
          headers: createPrimeAuthHeaders(storedToken),
        });
        if (!response.ok) throw new Error('Stored PrimeOS session is no longer valid.');
        const restoredSession = await response.json() as PrimeSession;
        applySession(storedToken, restoredSession);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    void restoreSession();
  }, [applySession, clearSession, prototypeMode]);

  const signIn = async (email: string, password: string) => {
    if (prototypeMode) return { error: null, session: prototypeSession };
    try {
      const response = await fetch(`${resolvePrimeBackendBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Unable to sign in.');

      const login = body as PrimeLoginResponse;
      applySession(login.token, login.session);
      return { error: null, session: login.session };
    } catch (error) {
      clearSession();
      return { error: error instanceof Error ? error : new Error('Unable to sign in.'), session: null };
    }
  };

  const signOut = async () => {
    if (prototypeMode) return;
    const currentToken = token || getPrimeAuthToken();
    if (currentToken) {
      await fetch(`${resolvePrimeBackendBase()}/api/auth/logout`, {
        method: 'POST',
        headers: createPrimeAuthHeaders(currentToken),
      }).catch(() => undefined);
    }
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, session, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
