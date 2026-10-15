import { LayoutGrid, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Action } from '../ui';
const presets = [
  { label: 'Default', left: true, right: true },
  { label: 'Focus', left: false, right: false },
  { label: 'Structure', left: true, right: false },
  { label: 'Content', left: false, right: true },
];
// Ported from ech-prime-web-v2 EditorToolbar workspace presets.
export function WorkspaceLayoutControls({ layout, onChange }: { layout: { left: boolean; right: boolean }; onChange: (layout: { left: boolean; right: boolean }) => void }) {
  return <div className="pw-layout-controls"><Popover><PopoverTrigger asChild><button type="button" className="pw-button" aria-label="Layout presets" title="Layout presets"><LayoutGrid size={17} /></button></PopoverTrigger><PopoverContent align="start" className="pw-layout-popover"><h3>WORKSPACE</h3><div>{presets.map(preset => <button key={preset.label} type="button" aria-pressed={layout.left === preset.left && layout.right === preset.right} onClick={() => onChange({ left: preset.left, right: preset.right })}><span className="pw-layout-thumb">{preset.left && <i />}<b />{preset.right && <i />}</span><span>{preset.label}</span></button>)}</div></PopoverContent></Popover><Action aria-label="Toggle left panel" title="Show/hide structure panel" aria-pressed={layout.left} onClick={() => onChange({ ...layout, left: !layout.left })}><PanelLeftClose size={17} /></Action><Action aria-label="Toggle right panel" title="Show/hide settings panel" aria-pressed={layout.right} onClick={() => onChange({ ...layout, right: !layout.right })}><PanelRightClose size={17} /></Action></div>;
}
