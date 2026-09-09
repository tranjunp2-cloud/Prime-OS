import { useEffect, useMemo, useState } from 'react';
import { Routes, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { PrimeCommandPalette } from './PrimeCommandPalette';
import { GlobalCopilotWorkspace } from '@/components/copilot/GlobalCopilotWorkspace';
import { Skeleton } from '@/components/ui/skeleton';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getShellDictionary } from '@/lib/i18n/shell-dictionaries';
import { cn } from '@/lib/utils';
import { PrimeRoutes } from '@/routes/PrimeRoutes';

export function AppLayout() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [workspaceSwitching, setWorkspaceSwitching] = useState(false);
  const { locale } = useI18n();
  const location = useLocation();
  const isInboxWorkspace = location.pathname.startsWith('/inbox/');
  const shellCopy = useMemo(() => getShellDictionary(locale), [locale]);
  const workspaceTheme = location.pathname.startsWith('/builder')
    ? 'workspace-theme-primeweb'
    : location.pathname.startsWith('/pos')
      ? 'workspace-theme-pos'
      : 'workspace-theme-main';

  useEffect(() => {
    let timeoutId: number | undefined;
    const handleWorkspaceSwitch = () => {
      setWorkspaceSwitching(true);
      timeoutId = window.setTimeout(() => setWorkspaceSwitching(false), 420);
    };
    window.addEventListener('workspace:switch-start', handleWorkspaceSwitch);
    return () => {
      window.removeEventListener('workspace:switch-start', handleWorkspaceSwitch);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapDemoData = async () => {
      setBootstrapping(true);

      try {
        await seedDemoData('prime-os-phase-1-demo');
      } catch {
        // Individual screens keep their own deterministic fallback data.
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    void bootstrapDemoData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleCommandShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    };

    window.addEventListener('keydown', handleCommandShortcut);
    return () => window.removeEventListener('keydown', handleCommandShortcut);
  }, []);

  if (bootstrapping && !isInboxWorkspace) {
    return (
      <div className="prime-stage flex h-screen overflow-hidden">
        <AppSidebar />
        <main id="main-content" className="flex-1 overflow-auto">
          <div className="flex flex-col gap-4 p-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-60 w-full rounded-lg" />
            <Skeleton className="h-60 w-full rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  if (isInboxWorkspace) {
    return <div className="h-screen overflow-hidden"><Routes>{PrimeRoutes()}</Routes></div>;
  }

  return (
    <div className={cn('prime-stage flex h-screen overflow-hidden', workspaceTheme)}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        {shellCopy.skipToMainContent}
      </a>
      <AppSidebar />
      <div className="min-w-0 flex-1 overflow-hidden">
        <GlobalCopilotWorkspace>
          <PrimeCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
          <div className="flex h-full min-h-0 flex-col">
            <AppHeader />
            <main id="main-content" className="scrollbar-visible flex min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto bg-background">
              <div className="relative min-h-full min-w-0 flex-1">
                {workspaceSwitching ? (
                  <div className="absolute inset-0 z-20 grid content-start gap-5 bg-background p-6" aria-label="Loading workspace">
                    <Skeleton className="h-12 w-72" />
                    <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
                    <Skeleton className="h-80 w-full" />
                  </div>
                ) : null}
                <Routes>{PrimeRoutes()}</Routes>
              </div>
            </main>
          </div>
        </GlobalCopilotWorkspace>
      </div>
    </div>
  );
}
