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

export function WorkspaceTabBar({ onNavigate, onOpenProductSettings }: { onNavigate: (url: string) => void; onOpenProductSettings: () => void }) {
  const { tabs, activeId } = useWorkspaceTabs();
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [menuState, setMenuState] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const menuTab = menuState ? tabs.find((tab) => tab.id === menuState.tabId) : undefined;

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
    <div className="relative z-[150] flex h-11 min-w-0 items-center gap-1 border-b border-border bg-card/70 px-2 backdrop-blur-xl" role="tablist" aria-label="Open product tabs" onClick={() => setMenuState(null)}>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden">
        {tabs.map((tab, index) => {
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
                'group flex h-8 items-center gap-2 rounded-lg border px-2.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                tab.pinned ? 'min-w-10 max-w-10 justify-center px-0' : 'min-w-[138px] max-w-[240px]',
                active ? 'border-primary/25 bg-background text-foreground shadow-sm' : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
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
              <span className={cn('grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-bold', active ? 'bg-primary/10 text-primary' : 'bg-background/70 text-muted-foreground')}>
                {tab.pinned ? <Pin className="size-3" /> : tab.title.slice(0, 1).toUpperCase()}
              </span>
              {tab.pinned ? null : <span className="min-w-0 flex-1 truncate font-medium">{tab.title}</span>}
              {tab.dirty ? <span className="text-primary">●</span> : null}
              {tab.pinned ? null : (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Close ${tab.title}`}
                  className="grid size-5 shrink-0 place-items-center rounded-md text-muted-foreground opacity-70 hover:bg-muted-foreground/10 hover:text-foreground group-hover:opacity-100"
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
          <Button type="button" variant="outline" size="icon" className="size-8 shrink-0 rounded-lg" aria-label="Open tabs menu">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
          {tabs.map((tab) => (
            <DropdownMenuItem
              key={tab.id}
              className="gap-2 rounded-lg"
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
        className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-background/80 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        aria-label="Open another product tab"
        onClick={onOpenProductSettings}
      >
        <Plus className="size-4" />
      </button>

      {menuTab && menuState ? (
        <div
          className="fixed z-[1000] w-48 rounded-xl border border-border bg-popover p-1 text-xs text-popover-foreground shadow-xl"
          style={{ left: menuState.x, top: menuState.y }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-muted" onClick={() => { pinTab(menuTab.id, !menuTab.pinned); setMenuState(null); }}>
            {menuTab.pinned ? 'Unpin tab' : 'Pin tab'}
          </button>
          <button className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-muted" onClick={() => { copyTabUrl(menuTab.url); setMenuState(null); }}>
            Copy URL
          </button>
          <button className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-muted" onClick={() => { closeOtherTabs(menuTab.id); focusTab(menuTab.id); onNavigate(menuTab.url); setMenuState(null); }}>
            Close others
          </button>
          <button className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-muted" onClick={() => { closeRightTabs(menuTab.id); navigateActiveFallback(); setMenuState(null); }}>
            Close tabs to right
          </button>
          <button className="block w-full rounded-lg px-2.5 py-2 text-left text-destructive hover:bg-destructive/10" onClick={() => { closeWorkspaceTab(menuTab.id, menuTab.dirty, menuTab.title); setMenuState(null); }}>
            Close tab
          </button>
        </div>
      ) : null}
    </div>
  );
}
