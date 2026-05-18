import { useSyncExternalStore } from 'react';
import {
  closeWorkspaceTab,
  closeOtherWorkspaceTabs,
  closeRightWorkspaceTabs,
  focusWorkspaceTab,
  markWorkspaceTabDirty,
  moveWorkspaceTab,
  pinWorkspaceTab,
  reopenLastClosedWorkspaceTab,
  openWorkspaceTab,
  updateWorkspaceTabUrl,
  WORKSPACE_TABS_STORAGE_KEY,
  MAX_WORKSPACE_TABS,
  type WorkspaceTabInput,
  type WorkspaceTabsState,
} from './workspace-tabs';

const initialState: WorkspaceTabsState = {
  tabs: [],
  activeId: null,
  lastClosed: [],
};

let state = readPersistedState();
const listeners = new Set<() => void>();

function readPersistedState(): WorkspaceTabsState {
  if (typeof window === 'undefined') {
    return initialState;
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_TABS_STORAGE_KEY);
    if (!raw) {
      return initialState;
    }

    const parsed = JSON.parse(raw) as WorkspaceTabsState;
    const tabs = Array.isArray(parsed.tabs)
      ? parsed.tabs.map((tab) => ({ ...tab, rootProductId: tab.rootProductId || tab.productId, dirty: false })).slice(-MAX_WORKSPACE_TABS)
      : [];

    const activeId = tabs.some((tab) => tab.id === parsed.activeId) ? parsed.activeId : tabs.at(-1)?.id ?? null;

    return {
      tabs,
      activeId,
      lastClosed: Array.isArray(parsed.lastClosed) ? parsed.lastClosed : [],
    };
  } catch {
    return initialState;
  }
}

function persistState(nextState: WorkspaceTabsState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(WORKSPACE_TABS_STORAGE_KEY, JSON.stringify({
    ...nextState,
    tabs: nextState.tabs.map((tab) => ({ ...tab, dirty: false })),
  }));
}

function emit(nextState: WorkspaceTabsState) {
  state = nextState;
  persistState(nextState);
  listeners.forEach((listener) => listener());
}

export function getWorkspaceTabsState() {
  return state;
}

export function subscribeWorkspaceTabs(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWorkspaceTabs() {
  return useSyncExternalStore(subscribeWorkspaceTabs, getWorkspaceTabsState, () => initialState);
}

export function openTab(input: WorkspaceTabInput) {
  emit(openWorkspaceTab(state, input));
}

export function closeTab(tabId: string) {
  emit(closeWorkspaceTab(state, tabId));
}

export function closeOtherTabs(tabId: string) {
  emit(closeOtherWorkspaceTabs(state, tabId));
}

export function closeRightTabs(tabId: string) {
  emit(closeRightWorkspaceTabs(state, tabId));
}

export function reopenLastClosedTab() {
  emit(reopenLastClosedWorkspaceTab(state));
}

export function pinTab(tabId: string, pinned: boolean) {
  emit(pinWorkspaceTab(state, tabId, pinned));
}

export function moveTab(tabId: string, toIndex: number) {
  emit(moveWorkspaceTab(state, tabId, toIndex));
}

export function focusTab(tabId: string) {
  emit(focusWorkspaceTab(state, tabId));
}

export function updateTabUrl(tabId: string, url: string) {
  emit(updateWorkspaceTabUrl(state, tabId, url));
}

export function markTabDirty(tabId: string, dirty: boolean) {
  emit(markWorkspaceTabDirty(state, tabId, dirty));
}

export function resetWorkspaceTabsForTests(nextState = initialState) {
  emit(nextState);
}
