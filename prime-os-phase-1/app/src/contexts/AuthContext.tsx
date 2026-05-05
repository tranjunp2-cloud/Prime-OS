import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  PrimeAccount,
  PrimeSession,
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

const localBypassToken = 'prime-local-bypass-token';

const localBypassSession: PrimeSession = {
  role: 'admin',
  roleLabel: 'Admin',
  description: 'Local bypass session while backend auth is disabled.',
  canReset: true,
  canWrite: true,
  visibleResources: [],
  writableResources: [],
  hiddenResources: [],
  resourcePermissions: {},
  token: localBypassToken,
  account: {
    id: 'prime-local-user',
    role: 'admin',
    fullName: 'Prime Local',
    email: 'local@primeos.local',
    workspace: 'PrimeOS main',
    seatType: 'admin',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PrimeAccount | null>(localBypassSession.account);
  const [session, setSession] = useState<PrimeSession | null>(localBypassSession);
  const [token, setToken] = useState<string | null>(localBypassToken);
  const [loading, setLoading] = useState(true);

  const applyLocalBypass = useCallback(() => {
    setPrimeAuthToken(localBypassToken);
    setToken(localBypassToken);
    setSession(localBypassSession);
    setUser(localBypassSession.account);
  }, []);

  useEffect(() => {
    applyLocalBypass();
    setLoading(false);
  }, [applyLocalBypass]);

  const signIn = async () => {
    applyLocalBypass();
    return { error: null, session: localBypassSession };
  };

  const signOut = async () => {
    applyLocalBypass();
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
