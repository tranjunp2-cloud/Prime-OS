import { Routes, useLocation, type Location } from 'react-router-dom';
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
  const location = useLocation();
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;

  if (tabs.length === 0) {
    return null;
  }

  const currentRouteTab = tabs.find((tab) => tab.url === currentUrl);
  const activeTab = currentRouteTab ?? tabs.find((tab) => tab.id === activeId);
  const contentUrl = currentRouteTab?.url ?? currentUrl;
  const contentTitle = activeTab?.title ?? 'PrimeOS';

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
      <section
        key={contentUrl}
        role="tabpanel"
        aria-label={contentTitle}
        className={cn(
          'scrollbar-visible relative z-10 block h-full min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-auto bg-background animate-in fade-in-5 duration-200'
        )}
      >
        <Routes location={toTabLocation(contentUrl)}>{PrimeRoutes()}</Routes>
      </section>
    </div>
  );
}
