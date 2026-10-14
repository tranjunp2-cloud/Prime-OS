import type { ReactNode } from 'react';
import { DemoDataModeContext, useDemoDataMode } from '@/hooks/use-demo-data-mode';

// Interpret a demo deep link once at the router boundary, not each time a page
// mounts. Otherwise a stale URL could undo a newer change from another tab.
export function DemoDataModeProvider({ children }: { children: ReactNode }) {
  const { mode } = useDemoDataMode();
  return <DemoDataModeContext.Provider value={mode}>{children}</DemoDataModeContext.Provider>;
}
