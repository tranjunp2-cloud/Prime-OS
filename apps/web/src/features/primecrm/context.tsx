import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoDataMode } from '@/hooks/use-demo-data-mode';
import { readCrmState, saveCrmState, type CrmState } from './model';

interface CrmContextValue {
  state: CrmState;
  update: (change: (state: CrmState) => CrmState) => boolean;
  actor: string;
  scope: string;
  canConfigure: boolean;
  error: string;
  clearError: () => void;
}
const Context = createContext<CrmContextValue | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { noData } = useDemoDataMode();
  const scope = JSON.stringify([user?.workspace || '', user?.id || '']);
  return <ScopedProvider key={`${scope}:${noData}`} scope={scope} empty={noData} actor={user?.fullName || 'Current agent'} canConfigure={user?.role === 'admin'}>{children}</ScopedProvider>;
}

function ScopedProvider({ children, scope, empty, actor, canConfigure }: { children: ReactNode; scope: string; empty: boolean; actor: string; canConfigure: boolean }) {
  const [initial] = useState(() => {
    try { return { state: readCrmState(scope, empty), error: '' }; }
    catch (error) { return { state: null, error: error instanceof Error ? error.message : 'Unable to read saved CRM data.' }; }
  });
  const [state, setState] = useState(initial.state);
  const [error, setError] = useState(initial.error);
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && !event.key.startsWith('prime.crm.prototype.v1:')) return;
      try { const next = readCrmState(scope, empty); setState(next); setError(''); }
      catch { setError('Unable to reload saved CRM data. Refresh to try again.'); }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [scope, empty]);
  const update = (change: (state: CrmState) => CrmState) => {
    try {
      // Re-read to avoid overwriting changes made in another browser tab.
      const next = change(readCrmState(scope, empty));
      saveCrmState(scope, empty, next);
      setState(next); setError(''); return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save. Please try again.'); return false; }
  };
  if (!state) return <div className="p-6" role="alert"><p>{error}</p><button className="mt-4 min-h-11 underline" onClick={() => window.location.reload()}>Reload CRM</button></div>;
  return <Context.Provider value={{ state, update, actor, scope, canConfigure, error, clearError: () => setError('') }}>{children}</Context.Provider>;
}

// Context and provider intentionally share a module.
// eslint-disable-next-line react-refresh/only-export-components
export function useCrm() {
  const value = useContext(Context);
  if (!value) throw new Error('CRM context is required.');
  return value;
}
