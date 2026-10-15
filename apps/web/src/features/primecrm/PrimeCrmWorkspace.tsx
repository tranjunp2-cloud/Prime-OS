import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BarChart3, History, MessageCircle, PanelLeftClose, PanelLeftOpen, Settings2, UsersRound } from 'lucide-react';
import { DemoDataModeToggle } from '@/components/shared/DemoDataModeToggle';
import { Button } from '@/components/ui/button';
import { CrmProvider, useCrm } from './context';
import { Conversations } from './Conversations';
import { Guests, CrmHistory, CrmAnalytics } from './Records';
import { CrmSettings } from './Settings';
import './primecrm.css';

const sections = [
  { href: '/inbox/conversation', label: 'Conversations', icon: MessageCircle },
  { href: '/inbox/guests', label: 'Contacts / Guests', icon: UsersRound },
  { href: '/inbox/history', label: 'Response History', icon: History },
  { href: '/inbox/analytics', label: 'CRM Analytics', icon: BarChart3 },
  { href: '/inbox/settings', label: 'CRM Settings', icon: Settings2 },
];

export default function PrimeCrmWorkspace() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1280);
  return <div className={`crm-workspace crm-shell bg-background text-foreground ${collapsed ? 'crm-menu-collapsed' : ''}`} data-testid="prime-inbox-workspace">
    <nav aria-label="Prime CRM navigation" className="crm-sidebar">
      <Button variant="ghost" className="crm-menu-toggle" aria-label={collapsed ? 'Expand CRM menu' : 'Collapse CRM menu'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}<span className="crm-menu-label">Collapse menu</span></Button>
      {sections.map(({ href, label, icon: Icon }) => <NavLink key={href} to={href} aria-label={label} title={label} className={({ isActive }) => `crm-menu-link ${href.endsWith('settings') ? 'crm-menu-settings' : ''} ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}><Icon className="size-4 shrink-0" aria-hidden="true" /><span className="crm-menu-label">{label}</span></NavLink>)}
    </nav>
    <div className="crm-main">
      <header className="crm-prototype-bar"><h1 className="sr-only">Prime CRM</h1><span>Prototype · Replies are simulated</span><details className="relative"><summary className="cursor-pointer py-2">Demo options</summary><div className="absolute right-0 top-full z-30 w-72 space-y-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md"><DemoDataModeToggle /><p>CRM changes are saved in this browser.</p><Link className="inline-flex min-h-9 items-center underline" to="/sales-channels/conversation-channels">Manage connections in Main</Link></div></details></header>
      <CrmProvider><Content /></CrmProvider>
    </div>
  </div>;
}

function Content() {
  const { pathname } = useLocation();
  const { error, clearError } = useCrm();
  const section = pathname.split('/')[2];
  return <div className="flex min-h-0 flex-1 flex-col">
    {error && <div role="alert" className="flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><span>{error}</span><button className="min-h-11 underline" onClick={clearError}>Dismiss</button></div>}
    <div className="min-h-0 flex-1 overflow-auto">{section === 'guests' ? <Guests /> : section === 'history' ? <CrmHistory /> : section === 'analytics' ? <CrmAnalytics /> : section === 'settings' ? <CrmSettings /> : section === 'conversation' ? <Conversations /> : <div className="p-6"><h2 className="font-semibold">CRM page not found</h2><Link className="inline-flex min-h-11 items-center underline" to="/inbox/conversation">Back to conversations</Link></div>}</div>
  </div>;
}
