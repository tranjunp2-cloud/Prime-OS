import { ArrowLeft, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export function AppHeader({ showBackToMain = false }: { showBackToMain?: boolean }) {
  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 sm:px-4 md:px-6" aria-label="Application scope toolbar">
      <div className="flex min-w-0 items-center gap-2">
        {showBackToMain && (
          <Button asChild variant="ghost" size="sm" className="min-h-11 shrink-0">
            <Link to="/admin/dashboard" aria-label="Back to Main Workspace">
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span>Main<span className="hidden sm:inline"> Workspace</span></span>
            </Link>
          </Button>
        )}
        <WorkspaceSwitcher />
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('prime-ai:open'))}
        className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:ring-offset-zinc-950 sm:px-4"
        aria-label="Open Prime AI"
      >
        <Bot className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Prime AI</span>
      </button>
    </header>
  );
}
