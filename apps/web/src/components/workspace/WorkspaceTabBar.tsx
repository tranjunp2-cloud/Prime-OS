import { useState } from 'react';
import { MoreHorizontal, Pin, Plus, X } from 'lucide-react';
import {
  closeOtherTabs,
  closeRightTabs,
  closeTab,
  focusTab,
  getWorkspaceTabsState,
  moveTab,
  pinTab,
  useWorkspaceTabs,
} from '@/lib/workspace/workspace-tabs-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const MAX_INLINE_TABS = 4;

export function WorkspaceTabBar({ onNavigate, onOpenProductSettings }: { onNavigate: (url: string) => void; onOpenProductSettings: () => void }) {
  const { tabs, activeId } = useWorkspaceTabs();
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [menuState, setMenuState] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const menuTab = menuState ? tabs.find((tab) => tab.id === menuState.tabId) : undefined;
  const inlineTabs = getInlineTabs(tabs, activeId);
  const hiddenTabCount = Math.max(0, tabs.length - inlineTabs.length);

  if (tabs.length === 0) {
    return null;
  }

  function navigateActiveFallback() {
    const nextState = getWorkspaceTabsState();
    const nextActive = nextState.tabs.find((item) => item.id === nextState.activeId);
    onNavigate(nextActive?.url || '/overview');
  }

  function closeWorkspaceTab(tabId: string, dirty: boolean, title: string) {
    if (dirty && !window.confirm(`Close ${title}? Unsaved changes will stay only in this session.`)) {
      return;
    }

    closeTab(tabId);
    navigateActiveFallback();
  }

  function copyTabUrl(url: string) {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(`${window.location.origin}${url}`);
    }
  }

  return (
    <div className="relative z-[150] flex h-9 min-w-0 items-center gap-1 border-b border-border bg-surface-toolbar/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-surface-toolbar/85" role="tablist" aria-label="Open product tabs" onClick={() => setMenuState(null)}>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden">
        {inlineTabs.map((tab) => {
          const index = tabs.findIndex((item) => item.id === tab.id);
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={tab.pinned ? `${tab.title} pinned` : tab.title}
              draggable
              className={cn(
                'group flex h-7 items-center gap-2 rounded-md border px-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                tab.pinned ? 'min-w-8 max-w-8 justify-center px-0' : active ? 'min-w-[132px] max-w-[190px]' : 'min-w-[104px] max-w-[160px]',
                active ? 'border-primary/30 bg-primary/10 text-primary shadow-sm' : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground',
                draggingTabId === tab.id && 'opacity-50'
              )}
              onClick={() => {
                focusTab(tab.id);
                onNavigate(tab.url);
              }}
              onMouseDown={(event) => {
                if (event.button === 1) {
                  event.preventDefault();
                  closeWorkspaceTab(tab.id, tab.dirty, tab.title);
                }
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                setMenuState({ tabId: tab.id, x: event.clientX, y: event.clientY });
              }}
              onDragStart={() => setDraggingTabId(tab.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingTabId) {
                  moveTab(draggingTabId, index);
                }
                setDraggingTabId(null);
              }}
              onDragEnd={() => setDraggingTabId(null)}
            >
              <span className={cn('grid size-4 shrink-0 place-items-center rounded-sm text-[9px] font-bold', active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                {tab.pinned ? <Pin className="size-3" /> : tab.title.slice(0, 1).toUpperCase()}
              </span>
              {tab.pinned ? null : <span className="min-w-0 flex-1 truncate font-medium">{tab.title}</span>}
              {tab.dirty ? <span className="text-primary">●</span> : null}
              {tab.pinned ? null : (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Close ${tab.title}`}
                  className="grid size-5 shrink-0 place-items-center rounded-sm text-muted-foreground opacity-50 hover:bg-muted-foreground/10 hover:text-foreground group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeWorkspaceTab(tab.id, tab.dirty, tab.title);
                  }}
                >
                  <X className="size-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="size-8 shrink-0" aria-label="Open tabs menu">
            {hiddenTabCount > 0 ? <span className="font-identifier text-xs">+{hiddenTabCount}</span> : <MoreHorizontal className="size-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2">
          {tabs.map((tab) => (
            <DropdownMenuItem
              key={tab.id}
              className="gap-2 rounded-md"
              onSelect={() => {
                focusTab(tab.id);
                onNavigate(tab.url);
              }}
            >
              {tab.pinned ? <Pin className="size-3.5" /> : <span className="grid size-4 place-items-center text-[10px] font-bold">{tab.title.slice(0, 1).toUpperCase()}</span>}
              <span className="min-w-0 flex-1 truncate">{tab.title}</span>
              {tab.id === activeId ? <span className="text-primary">●</span> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        type="button"
        className="grid size-8 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open another product tab"
        onClick={onOpenProductSettings}
      >
        <Plus className="size-4" />
      </button>

      {menuTab && menuState ? (
        <div
          className="fixed z-[1000] w-48 rounded-md border bg-popover p-1 text-xs text-popover-foreground shadow-md"
          style={{ left: menuState.x, top: menuState.y }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button className="block w-full rounded-sm px-2.5 py-2 text-left hover:bg-muted" onClick={() => { pinTab(menuTab.id, !menuTab.pinned); setMenuState(null); }}>
            {menuTab.pinned ? 'Unpin tab' : 'Pin tab'}
          </button>
          <button className="block w-full rounded-sm px-2.5 py-2 text-left hover:bg-muted" onClick={() => { copyTabUrl(menuTab.url); setMenuState(null); }}>
            Copy URL
          </button>
          <button className="block w-full rounded-sm px-2.5 py-2 text-left hover:bg-muted" onClick={() => { closeOtherTabs(menuTab.id); focusTab(menuTab.id); onNavigate(menuTab.url); setMenuState(null); }}>
            Close others
          </button>
          <button className="block w-full rounded-sm px-2.5 py-2 text-left hover:bg-muted" onClick={() => { closeRightTabs(menuTab.id); navigateActiveFallback(); setMenuState(null); }}>
            Close tabs to right
          </button>
          <button className="block w-full rounded-sm px-2.5 py-2 text-left text-destructive hover:bg-destructive/10" onClick={() => { closeWorkspaceTab(menuTab.id, menuTab.dirty, menuTab.title); setMenuState(null); }}>
            Close tab
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getInlineTabs<T extends { id: string }>(tabs: T[], activeId: string | null) {
  if (tabs.length <= MAX_INLINE_TABS) {
    return tabs;
  }

  const tail = tabs.slice(-MAX_INLINE_TABS);

  if (!activeId || tail.some((tab) => tab.id === activeId)) {
    return tail;
  }

  const activeTab = tabs.find((tab) => tab.id === activeId);

  if (!activeTab) {
    return tail;
  }

  return [activeTab, ...tabs.filter((tab) => tab.id !== activeId).slice(-(MAX_INLINE_TABS - 1))];
}
