export interface WorkspaceTab {
  id: string;
  productId: string;
  rootProductId: string;
  url: string;
  title: string;
  iconKey?: string;
  pinned: boolean;
  dirty: boolean;
  openedAt: number;
  lastActiveAt: number;
}

export interface WorkspaceTabInput {
  productId: string;
  rootProductId?: string;
  url: string;
  title: string;
  iconKey?: string;
  reuseIfOpen?: boolean;
  reuseScope?: 'product' | 'exact' | 'none';
  rootProductMatchPaths?: string[];
  pinned?: boolean;
}

export interface WorkspaceTabsState {
  tabs: WorkspaceTab[];
  activeId: string | null;
  lastClosed: WorkspaceTab[];
}

export const WORKSPACE_TABS_STORAGE_KEY = 'prime-workspace-tabs-v1';

export function normalizeWorkspaceUrl(url: string) {
  return url || '/overview';
}

export function createWorkspaceTab(input: WorkspaceTabInput, now = Date.now()): WorkspaceTab {
  const rootProductId = input.rootProductId || input.productId;

  return {
    id: `${rootProductId}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    productId: input.productId,
    rootProductId,
    url: normalizeWorkspaceUrl(input.url),
    title: input.title,
    iconKey: input.iconKey,
    pinned: Boolean(input.pinned),
    dirty: false,
    openedAt: now,
    lastActiveAt: now,
  };
}

function findReusableWorkspaceTab(state: WorkspaceTabsState, input: WorkspaceTabInput) {
  if (input.reuseIfOpen === false || input.reuseScope === 'none') {
    return undefined;
  }

  const rootProductId = input.rootProductId || input.productId;

  if (input.reuseScope === 'product') {
    const rootMatchPaths = new Set(input.rootProductMatchPaths || []);
    const matchesRoot = (tab: WorkspaceTab) => tab.rootProductId === rootProductId || rootMatchPaths.has(tab.url);
    const activeTab = state.tabs.find((tab) => tab.id === state.activeId);

    if (activeTab && matchesRoot(activeTab)) {
      return activeTab;
    }

    return state.tabs.find(matchesRoot);
  }

  return state.tabs.find((tab) => tab.productId === input.productId || tab.url === input.url);
}

export function openWorkspaceTab(state: WorkspaceTabsState, input: WorkspaceTabInput, now = Date.now()): WorkspaceTabsState {
  const existing = findReusableWorkspaceTab(state, input);
  const rootProductId = input.rootProductId || input.productId;

  if (existing) {
    return {
      ...state,
      activeId: existing.id,
      tabs: state.tabs.map((tab) => tab.id === existing.id ? {
        ...tab,
        productId: input.productId,
        rootProductId,
        url: normalizeWorkspaceUrl(input.url),
        title: input.title,
        iconKey: input.iconKey ?? tab.iconKey,
        pinned: input.pinned ?? tab.pinned,
        lastActiveAt: now,
      } : tab),
    };
  }

  const tab = createWorkspaceTab(input, now);

  return {
    ...state,
    activeId: tab.id,
    tabs: [...state.tabs, tab],
  };
}

export function closeWorkspaceTab(state: WorkspaceTabsState, tabId: string): WorkspaceTabsState {
  const closingIndex = state.tabs.findIndex((tab) => tab.id === tabId);

  if (closingIndex < 0) {
    return state;
  }

  const closingTab = state.tabs[closingIndex];
  const tabs = state.tabs.filter((tab) => tab.id !== tabId);
  const activeId = state.activeId === tabId
    ? tabs[Math.max(0, closingIndex - 1)]?.id || tabs[0]?.id || null
    : state.activeId;

  return {
    ...state,
    activeId,
    tabs,
    lastClosed: [closingTab, ...state.lastClosed].slice(0, 8),
  };
}

export function focusWorkspaceTab(state: WorkspaceTabsState, tabId: string, now = Date.now()): WorkspaceTabsState {
  if (!state.tabs.some((tab) => tab.id === tabId)) {
    return state;
  }

  return {
    ...state,
    activeId: tabId,
    tabs: state.tabs.map((tab) => tab.id === tabId ? { ...tab, lastActiveAt: now } : tab),
  };
}

export function updateWorkspaceTabUrl(state: WorkspaceTabsState, tabId: string, url: string): WorkspaceTabsState {
  return {
    ...state,
    tabs: state.tabs.map((tab) => tab.id === tabId ? { ...tab, url: normalizeWorkspaceUrl(url) } : tab),
  };
}

export function markWorkspaceTabDirty(state: WorkspaceTabsState, tabId: string, dirty: boolean): WorkspaceTabsState {
  return {
    ...state,
    tabs: state.tabs.map((tab) => tab.id === tabId ? { ...tab, dirty } : tab),
  };
}

export function closeOtherWorkspaceTabs(state: WorkspaceTabsState, tabId: string): WorkspaceTabsState {
  const keepTab = state.tabs.find((tab) => tab.id === tabId);

  if (!keepTab) {
    return state;
  }

  const closedTabs = state.tabs.filter((tab) => tab.id !== tabId);

  return {
    ...state,
    activeId: tabId,
    tabs: [keepTab],
    lastClosed: [...closedTabs, ...state.lastClosed].slice(0, 8),
  };
}

export function closeRightWorkspaceTabs(state: WorkspaceTabsState, tabId: string): WorkspaceTabsState {
  const index = state.tabs.findIndex((tab) => tab.id === tabId);

  if (index < 0) {
    return state;
  }

  const tabs = state.tabs.slice(0, index + 1);
  const closedTabs = state.tabs.slice(index + 1);
  const activeId = tabs.some((tab) => tab.id === state.activeId) ? state.activeId : tabId;

  return {
    ...state,
    activeId,
    tabs,
    lastClosed: [...closedTabs, ...state.lastClosed].slice(0, 8),
  };
}

export function reopenLastClosedWorkspaceTab(state: WorkspaceTabsState, now = Date.now()): WorkspaceTabsState {
  const [lastClosed, ...restClosed] = state.lastClosed;

  if (!lastClosed) {
    return state;
  }

  const reopenedTab: WorkspaceTab = {
    ...lastClosed,
    rootProductId: lastClosed.rootProductId || lastClosed.productId,
    dirty: false,
    lastActiveAt: now,
  };

  return {
    ...state,
    activeId: reopenedTab.id,
    tabs: [...state.tabs, reopenedTab],
    lastClosed: restClosed,
  };
}

export function pinWorkspaceTab(state: WorkspaceTabsState, tabId: string, pinned: boolean): WorkspaceTabsState {
  const tabs = state.tabs.map((tab) => tab.id === tabId ? { ...tab, pinned } : tab);

  return {
    ...state,
    tabs: sortPinnedTabs(tabs),
  };
}

export function moveWorkspaceTab(state: WorkspaceTabsState, tabId: string, toIndex: number): WorkspaceTabsState {
  const fromIndex = state.tabs.findIndex((tab) => tab.id === tabId);

  if (fromIndex < 0 || toIndex < 0 || toIndex >= state.tabs.length || fromIndex === toIndex) {
    return state;
  }

  const tabs = [...state.tabs];
  const [tab] = tabs.splice(fromIndex, 1);
  tabs.splice(toIndex, 0, tab);

  return {
    ...state,
    tabs: sortPinnedTabs(tabs),
  };
}

function sortPinnedTabs(tabs: WorkspaceTab[]) {
  return [...tabs].sort((left, right) => Number(right.pinned) - Number(left.pinned));
}
