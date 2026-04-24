import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  clearPrimeAuthToken,
  createPrimeAuthHeaders,
  getPrimeAuthToken,
  PrimeAccount,
  PrimeLoginResponse,
  PrimeSession,
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

async function parseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return new Error(body?.message || fallback);
}

function withToken(session: PrimeSession, token: string, expiresAt?: string): PrimeSession {
  return {
    ...session,
    token,
    expiresAt,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PrimeAccount | null>(null);
  const [session, setSession] = useState<PrimeSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const storedToken = getPrimeAuthToken();

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${resolvePrimeBackendBase()}/api/session`, {
          headers: createPrimeAuthHeaders(storedToken),
        });

        if (!response.ok) {
          throw await parseError(response, 'Session expired. Please sign in again.');
        }

        const restoredSession = withToken(await response.json() as PrimeSession, storedToken);

        if (!cancelled) {
          setToken(storedToken);
          setSession(restoredSession);
          setUser(restoredSession.account);
        }
      } catch {
        clearPrimeAuthToken();

        if (!cancelled) {
          setToken(null);
          setSession(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${resolvePrimeBackendBase()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw await parseError(response, 'Invalid email or password.');
      }

      const login = await response.json() as PrimeLoginResponse;
      const nextSession = withToken(login.session, login.token, login.expiresAt);

      setPrimeAuthToken(login.token);
      setToken(login.token);
      setSession(nextSession);
      setUser(nextSession.account);

      return { error: null, session: nextSession };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unable to sign in. Please try again.'),
        session: null,
      };
    }
  };

  const signOut = async () => {
    const currentToken = token;

    clearPrimeAuthToken();
    setToken(null);
    setSession(null);
    setUser(null);

    if (currentToken) {
      await fetch(`${resolvePrimeBackendBase()}/api/auth/logout`, {
        method: 'POST',
        headers: createPrimeAuthHeaders(currentToken),
      }).catch(() => undefined);
    }
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
