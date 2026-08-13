import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown, Globe2, MessageCircle, Store } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function WorkspaceSwitcher() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const activeWorkspaceId = location.pathname.startsWith('/builder')
    ? 'primeweb'
    : location.pathname.startsWith('/pos')
      ? 'pos'
      : location.pathname.startsWith('/inbox')
        ? 'inbox'
        : 'main';
  const workspaces = [
    { id: 'main', name: 'Main Workspace', shortName: 'Main', detail: 'Back-office Operations', role: user?.role === 'admin' ? 'Admin' : 'Operator', href: '/admin/dashboard', icon: Building2, accent: 'bg-indigo-600 text-white', accessGranted: true },
    { id: 'inbox', name: 'Prime Inbox Workspace', shortName: 'Prime Inbox', detail: 'Conversation & Social Commerce Desk', role: user?.role === 'admin' ? 'Admin' : 'CS Agent', href: '/inbox/conversation', icon: MessageCircle, accent: 'bg-violet-100 text-violet-700', accessGranted: true },
    { id: 'primeweb', name: 'PrimeWeb Workspace', shortName: 'PrimeWeb', detail: 'Storefront Builder', role: user?.role === 'admin' ? 'Admin' : 'Editor', href: '/builder/theme', icon: Globe2, accent: 'bg-emerald-100 text-emerald-700', accessGranted: true },
    { id: 'pos', name: 'POS Workspace', shortName: 'POS', detail: 'Register Mode', role: user?.role === 'admin' ? 'Admin' : 'Cashier', href: '/pos/register', icon: Store, accent: 'bg-amber-100 text-amber-700', accessGranted: true },
  ].filter((workspace) => workspace.accessGranted);
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0];
  const ActiveIcon = activeWorkspace.icon;

  const switchWorkspace = (workspace: typeof workspaces[number]) => {
    if (workspace.id === activeWorkspaceId) return;
    setSwitchingTo(workspace.id);
    window.dispatchEvent(new CustomEvent('workspace:switch-start', { detail: { workspaceId: workspace.id } }));
    navigate(workspace.href);
    window.setTimeout(() => setSwitchingTo(null), 450);
  };

  return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="group flex h-11 min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800" aria-label={`Switch workspace. Current workspace: ${activeWorkspace.name}`}><span className={cn('grid size-7 shrink-0 place-items-center rounded-md', activeWorkspace.accent)}><ActiveIcon className="size-3.5" /></span><span className="hidden min-w-0 sm:block"><span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Workspace</span><span className="block max-w-28 truncate text-[13px] font-semibold">{activeWorkspace.shortName}</span></span><ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" /></button></DropdownMenuTrigger><DropdownMenuContent align="start" sideOffset={8} className="w-[310px] p-1.5"><DropdownMenuLabel className="px-2.5 py-2"><span className="block text-xs font-semibold">Switch workspace</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Choose where you want to work.</span></DropdownMenuLabel><DropdownMenuSeparator />{workspaces.map((workspace) => { const Icon = workspace.icon; const active = workspace.id === activeWorkspaceId; return <DropdownMenuItem key={workspace.id} onSelect={() => switchWorkspace(workspace)} className={cn('min-h-16 gap-3 rounded-md px-2.5', active && 'bg-primary/5')}><span className={cn('grid size-9 shrink-0 place-items-center rounded-md', workspace.accent)}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{workspace.name}</span><span className="block text-xs text-muted-foreground">{workspace.detail} · Role: {workspace.role}</span></span>{active ? <Check className="size-4 text-primary" /> : switchingTo === workspace.id ? <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : null}</DropdownMenuItem>; })}</DropdownMenuContent></DropdownMenu>;
}
