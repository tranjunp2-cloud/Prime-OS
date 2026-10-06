/** Adapted from ech-prime-web-v2/src/components/editor/EditorSidebar.tsx.
 * Preserves the original underline tab bar and panel anatomy; Next/i18n/store
 * dependencies are replaced by controlled React props for the PrimeOS prototype.
 */
import type { ReactNode } from 'react';
export function EditorSidebar({ tabs, activeTab, onTabChange, children }: { tabs: { id: string; label: string; icon: ReactNode }[]; activeTab: string; onTabChange: (id: string) => void; children: ReactNode }) {
  return <aside className="pw-editor-sidebar"><div className="pw-tabs" aria-label="Editor tools">{tabs.map(tab => <button type="button" key={tab.id} aria-pressed={activeTab === tab.id} onClick={() => onTabChange(tab.id)}>{tab.icon}{tab.label}</button>)}</div><div className="pw-editor-sidebar-body">{children}</div></aside>;
}
