import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ChevronDown,
  LogOut,
  Languages,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  Moon,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme, type Theme } from '@/components/theme-provider';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getLocaleMeta, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils';
import { UserFeedbackWidget } from '@/components/system/UserFeedbackWidget';

const localeCodes: Record<Locale, string> = { 'en-US': 'EN', 'ja-JP': 'JA', 'vi-VN': 'VI' };
const themes: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'UN';
}

export function SidebarUserFooter({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useI18n();
  const displayName = user?.fullName?.trim() || user?.email?.split('@')[0] || 'User';
  const email = user?.email || 'user@unifi.business';
  const close = () => setOpen(false);
  const menuLinkClass = 'flex min-h-11 items-center gap-3 rounded-md px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-zinc-200 dark:hover:bg-zinc-800';

  return (
    <footer className="sticky bottom-0 z-20 mt-auto border-t border-slate-200 bg-white px-2 py-2 dark:border-zinc-800 dark:bg-zinc-900 md:px-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className={cn('flex min-h-12 items-center gap-1', collapsed ? 'justify-center' : 'md:justify-between')}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onClick={() => setOpen((value) => !value)} className={cn('flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-1.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-zinc-800', !collapsed && 'md:justify-start')} aria-label={`Open user menu for ${displayName}`} aria-expanded={open}>
                  <Avatar className="size-8 shrink-0 border border-slate-200 dark:border-zinc-700"><AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">{getInitials(displayName)}</AvatarFallback></Avatar>
                  <span className={cn('hidden min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-zinc-100', !collapsed && 'md:block')} title={displayName}>{displayName}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className={cn(!collapsed && 'md:hidden')}>{displayName}</TooltipContent>
            </Tooltip>

            <div className={cn('hidden shrink-0 items-center gap-1', !collapsed && 'md:flex')}>
              <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => setOpen((value) => !value)} className="grid size-11 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100" aria-label="More user options" aria-expanded={open}><MoreHorizontal className="size-4" /></button></TooltipTrigger><TooltipContent>More options</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('notifications:open'))} className="relative grid size-11 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100" aria-label="Notifications, 1 unread"><Bell className="size-4" /><span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-red-500 text-[9px] font-bold leading-none text-white">1</span></button></TooltipTrigger><TooltipContent>Notifications</TooltipContent></Tooltip>
            </div>
          </div>
        </PopoverAnchor>

        <PopoverContent side="top" align="start" sideOffset={10} className="w-[min(330px,calc(100vw-1rem))] overflow-hidden rounded-lg border-slate-200 bg-white p-0 shadow-xl data-[state=open]:animate-in data-[side=top]:slide-in-from-bottom-2 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start gap-3 border-b border-slate-200 p-3 dark:border-zinc-800">
            <Avatar className="size-9 shrink-0"><AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{getInitials(displayName)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">{displayName}</p><p className="truncate text-xs text-slate-500 dark:text-zinc-400">{email}</p></div>
            <Tooltip><TooltipTrigger asChild><NavLink to="/account" onClick={close} className="grid size-11 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100" aria-label="Account Settings"><Settings className="size-4" /></NavLink></TooltipTrigger><TooltipContent>Account Settings</TooltipContent></Tooltip>
          </div>

          <div className="space-y-0.5 p-1.5">
            <button type="button" onClick={() => { close(); setFeedbackOpen(true); }} className={cn(menuLinkClass, 'w-full')}><MessageSquare className="size-4 text-slate-500 dark:text-zinc-400" />Feedback</button>
            <div className="rounded-md px-3 py-2">
              <div className="mb-2 flex items-center gap-3 text-[13px] font-medium text-slate-700 dark:text-zinc-200"><Sun className="size-4 text-slate-500 dark:text-zinc-400" />Theme</div>
              <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1 dark:bg-zinc-800" role="radiogroup" aria-label="Theme">
                {themes.map(({ value, label, icon: Icon }) => <button key={value} type="button" role="radio" aria-checked={theme === value} onClick={() => setTheme(value)} className={cn('flex min-h-11 items-center justify-center gap-1.5 rounded px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', theme === value ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100')}><Icon className="size-3.5" />{label}</button>)}
              </div>
            </div>
            <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className={cn(menuLinkClass, 'w-full')}><Languages className="size-4 text-slate-500 dark:text-zinc-400" /><span className="flex-1 text-left">Language</span><span className="text-xs text-slate-500 dark:text-zinc-400">{getLocaleMeta(locale).nativeName}</span><ChevronDown className="size-3.5" /></button></DropdownMenuTrigger><DropdownMenuContent side="right" align="start" className="w-52"><DropdownMenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as Locale)}>{SUPPORTED_LOCALES.map((code) => <DropdownMenuRadioItem key={code} value={code} className="min-h-11 gap-2 pl-8"><span className="w-6 text-[10px] font-bold text-muted-foreground">{localeCodes[code]}</span><span>{getLocaleMeta(code).nativeName}</span></DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
            <NavLink to="/docs" onClick={close} className={menuLinkClass}><BookOpen className="size-4 text-slate-500 dark:text-zinc-400" />Docs</NavLink>
          </div>

          <div className="border-t border-slate-200 p-2 dark:border-zinc-800">
            <NavLink to="/account?section=billing&plan=enterprise" onClick={close} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-[13px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><Sparkles className="size-4" />Upgrade to Enterprise / Pro</NavLink>
            <button type="button" onClick={() => void signOut()} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-[13px] font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"><LogOut className="size-4" />Log Out</button>
          </div>

          <NavLink to="/overview?module=system&view=health" onClick={close} className="flex min-h-10 items-center justify-center gap-2 border-t border-slate-200 px-3 text-[11px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span>All systems normal.</NavLink>
        </PopoverContent>
      </Popover>
      <UserFeedbackWidget open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </footer>
  );
}
