import { Routes, type Location } from 'react-router-dom';
import { PrimeRoutes } from '@/routes/PrimeRoutes';
import { useWorkspaceTabs } from '@/lib/workspace/workspace-tabs-store';
import { cn } from '@/lib/utils';

function toTabLocation(url: string): Partial<Location> {
  const parsed = new URL(url || '/overview', 'http://primeos.local');

  return {
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
    state: null,
    key: parsed.pathname,
  };
}

export function TabContentHost() {
  const { tabs, activeId } = useWorkspaceTabs();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
      {tabs.map((tab) => {
        const active = tab.id === activeId;

        return (
          <section
            key={tab.id}
            role="tabpanel"
            aria-label={tab.title}
            aria-hidden={!active}
            className={cn(
              'min-h-0 min-w-0 overflow-y-auto overflow-x-auto bg-background animate-in fade-in-5 duration-200',
              active ? 'relative z-10 block h-full' : 'absolute inset-0 z-0 hidden pointer-events-none'
            )}
          >
            <Routes location={toTabLocation(tab.url)}>{PrimeRoutes()}</Routes>
          </section>
        );
      })}
    </div>
  );
}
