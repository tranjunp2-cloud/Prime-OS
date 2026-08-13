import { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, UsersRound } from 'lucide-react';
import { NavLink, Routes, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { PrimeCommandPalette } from './PrimeCommandPalette';
import { GlobalCopilotWorkspace } from '@/components/copilot/GlobalCopilotWorkspace';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getShellDictionary } from '@/lib/i18n/shell-dictionaries';
import { cn } from '@/lib/utils';
import { PrimeRoutes } from '@/routes/PrimeRoutes';
import { CrmJourneyOverviewContent } from '@/pages/prime/PrimeCrmOverviewPage';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';

const CRM_ONBOARDING_HIDDEN_KEY = 'primeos.crm-onboarding.hidden';
const CRM_ONBOARDING_SESSION_KEY = 'primeos.crm-onboarding.seen-this-session';

const crmJourneyItems = [
  { id: 'sources', label: 'Sources', href: '/crm/sources', matchPath: '/crm/sources' },
  { id: 'campaigns', label: 'Campaigns', href: '/crm/campaigns', matchPath: '/crm/campaigns' },
  { id: 'leads-rfqs', label: 'Leads & RFQs', href: '/crm/leads-rfqs', matchPath: '/crm/leads-rfqs' },
  { id: 'contact-leads', label: 'Contact Leads', href: '/crm/contact-leads', matchPath: '/crm/contact-leads' },
  { id: 'customers', label: 'Customers', href: '/crm/customers', matchPath: '/crm/customers' },
  { id: 'segments', label: 'Segments & Tags', href: '/crm/segments', matchPath: '/crm/segments' },
  { id: 'quick-replies', label: 'Quick Replies', href: '/crm/quick-replies', matchPath: '/crm/quick-replies' },
  { id: 'cs-analytics', label: 'CS Analytics', href: '/crm/cs-analytics', matchPath: '/crm/cs-analytics' },
  { id: 're-engagement', label: 'Re-engagement', href: '/crm/re-engage', matchPath: '/crm/re-engage' },
] as const;

export function AppLayout() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [crmOnboardingOpen, setCrmOnboardingOpen] = useState(false);
  const [hideCrmOnboarding, setHideCrmOnboarding] = useState(true);
  const [workspaceSwitching, setWorkspaceSwitching] = useState(false);
  const { locale } = useI18n();
  const location = useLocation();
  const isInboxWorkspace = location.pathname.startsWith('/inbox/');
  const shellCopy = useMemo(() => getShellDictionary(locale), [locale]);
  const activeCrmJourneyItem = crmJourneyItems.find((item) => location.pathname.startsWith(item.matchPath));
  const isCrmOverview = location.pathname.startsWith('/crm/overview');
  const isCrmArea = Boolean(activeCrmJourneyItem) || isCrmOverview;
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
    if (!activeCrmJourneyItem) return;
    try {
      const permanentlyHidden = window.localStorage.getItem(CRM_ONBOARDING_HIDDEN_KEY) === 'true';
      const seenThisSession = window.sessionStorage.getItem(CRM_ONBOARDING_SESSION_KEY) === 'true';
      if (!permanentlyHidden && !seenThisSession) setCrmOnboardingOpen(true);
    } catch {
      // Storage can be unavailable in privacy-restricted browsers; CRM remains usable.
    }
  }, [activeCrmJourneyItem]);

  const dismissCrmOnboarding = () => {
    try {
      window.sessionStorage.setItem(CRM_ONBOARDING_SESSION_KEY, 'true');
      if (hideCrmOnboarding) window.localStorage.setItem(CRM_ONBOARDING_HIDDEN_KEY, 'true');
    } catch {
      // Dismiss the modal even when preferences cannot be persisted.
    }
    setCrmOnboardingOpen(false);
  };

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
          <Dialog open={crmOnboardingOpen} onOpenChange={(open) => { if (!open) dismissCrmOnboarding(); else setCrmOnboardingOpen(true); }}>
            <DialogContent className="flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-[1180px] flex-col gap-0 overflow-hidden p-0">
              <DialogHeader className="border-b px-6 py-5 text-left">
                <DialogTitle className="text-xl">Welcome to CRM &amp; Customers</DialogTitle>
                <DialogDescription>Start with the big picture. You can reopen this guide anytime from Journey overview.</DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto px-6 py-5"><CrmJourneyOverviewContent onboarding onNavigate={dismissCrmOnboarding} /></div>
              <DialogFooter className="flex-row items-center justify-between gap-4 border-t bg-background px-6 py-4 sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={hideCrmOnboarding} onChange={(event) => setHideCrmOnboarding(event.target.checked)} className="size-4 rounded border-border accent-primary" />Don’t show this guide again</label>
                <Button asChild><NavLink to="/crm/sources" onClick={dismissCrmOnboarding}>Start working with Sources</NavLink></Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="flex h-full min-h-0 flex-col">
            <AppHeader />
            {isCrmArea ? (
              <div className="shrink-0 border-b bg-background">
                <div className="px-4 pt-4 md:px-6">
                  <WorkspacePageHeader
                    title="CRM & Customers"
                    description="Manage acquisition, sales opportunities, customer relationships, and retention in one workspace."
                    icon={UsersRound}
                    className="border-b-0"
                  />
                </div>
                <div className="border-t bg-muted/20 px-3 py-2 md:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <nav aria-label="CRM customer journey" className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 lg:pb-0">
                    {crmJourneyItems.map((item) => (
                      <NavLink
                        key={item.id}
                        to={item.href}
                        className={cn(
                          'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          activeCrmJourneyItem?.id === item.id
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background hover:text-foreground'
                        )}
                        aria-current={activeCrmJourneyItem?.id === item.id ? 'page' : undefined}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </nav>
                  <NavLink
                    to="/crm/overview"
                    className={cn(
                      'ml-auto flex min-h-9 w-fit shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                      isCrmOverview
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700'
                    )}
                    aria-current={isCrmOverview ? 'page' : undefined}
                  >
                    <LayoutDashboard className="size-4" />Customer conversion journey
                  </NavLink>
                </div>
                </div>
              </div>
            ) : null}
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
