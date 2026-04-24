import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Search } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { GlobalCopilotWorkspace } from '@/components/copilot/GlobalCopilotWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { seedDemoData } from '@/lib/demo-data-seeder';

export function AppLayout() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const bootstrapDemoData = async () => {
      setBootstrapping(true);

      try {
        await seedDemoData('prime-os-phase-1-demo');
      } catch (error) {
        console.error('[PrimeOS] Failed to bootstrap linked demo data', error);
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    };

    void bootstrapDemoData();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
    } finally {
      setSigningOut(false);
      navigate('/auth', { replace: true });
    }
  }

  if (bootstrapping) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <main id="main-content" className="flex-1 overflow-auto">
          <div className="flex flex-col gap-4 p-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-60 w-full rounded-xl" />
            <Skeleton className="h-60 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:shadow-lg"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <div className="flex-1 min-w-0 overflow-hidden">
        <GlobalCopilotWorkspace>
          <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b bg-background/92 px-4 backdrop-blur md:px-6">
            <div className="relative min-w-0 flex-1 md:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Global entity search"
                className="h-9 rounded-lg pl-9 text-sm"
                placeholder="Search product, SKU, order, lead, customer, alert..."
              />
            </div>
            <div className="hidden min-w-0 flex-col text-right md:flex">
              <span className="text-[11px] font-medium text-muted-foreground">PrimeOS session</span>
              <span className="max-w-[180px] truncate text-xs font-semibold text-foreground">
                {user?.email || 'Demo workspace'}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              className="shrink-0 rounded-lg"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">{signingOut ? 'Signing out...' : 'Logout'}</span>
            </Button>
          </header>
          <main
            id="main-content"
            className="h-[calc(100%-3.5rem)] min-w-0 overflow-y-auto overflow-x-auto animate-in fade-in-5 duration-200"
          >
            <Outlet />
          </main>
        </GlobalCopilotWorkspace>
      </div>
    </div>
  );
}
