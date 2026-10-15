import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Copy, ExternalLink, Eye, EyeOff, Globe, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Action, Modal } from '../ui';
import { hasChanges, publishWebsite, updateWebsite, websiteHref, type Website } from '../store';

// Mirrors source EditorToolbar: draft → Publish; live-dirty → Update + View live; live → View live.
export function EditorPublishControls({ site, onPublish, disabled = false, unsaved = false }: { site: Website; onPublish: () => void; disabled?: boolean; unsaved?: boolean }) {
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false);
  const live = site.status === 'published' && !!site.published;
  const pending = live && hasChanges(site);
  const path = `${websiteHref('preview', site.id)}&version=live`;
  const url = new URL(window.location.hash.startsWith('#/') ? `${window.location.pathname}#${path}` : path, window.location.origin).href;
  function update() {
    setBusy(true);
    try { publishWebsite(site.id); toast.success('Published snapshot updated in the demo.'); }
    catch { toast.error('Unable to update. Your published snapshot is unchanged.'); }
    finally { setBusy(false); }
  }
  return <><div className="pw-publish-state" role="status">{!unsaved && <><span className="pw-saved-dot" />Saved</>}<span className={`pw-publish-badge ${pending ? 'pending' : ''}`}>{pending ? 'CHANGES PENDING' : live ? 'LIVE' : 'DRAFT'}</span></div><Link className="pw-button" to={websiteHref('preview', site.id)}><Eye size={16} />Preview</Link>{live ? <>{pending && <Action className="pw-editor-update" disabled={disabled || busy} onClick={update}><RefreshCw size={15} />{busy ? 'Updating…' : 'Update'}</Action>}<DropdownMenu.Root><DropdownMenu.Trigger asChild><button type="button" className="pw-button pw-editor-live"><Globe size={16} />View live<ChevronDown size={14} /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={8} className="pw-live-menu"><DropdownMenu.Item asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink size={15} />Open website</a></DropdownMenu.Item><DropdownMenu.Item onSelect={async () => { try { await navigator.clipboard.writeText(url); toast.success('Link copied.'); } catch { toast.error('Unable to copy. Open the website and copy the address.'); } }}><Copy size={15} />Copy link</DropdownMenu.Item><DropdownMenu.Separator /><DropdownMenu.Item className="pw-live-unpublish" disabled={busy || disabled} onSelect={() => setConfirm(true)}><EyeOff size={15} />Unpublish</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root></> : <Action primary disabled={disabled} onClick={onPublish}>Publish</Action>}
  <Modal open={confirm} onClose={() => setConfirm(false)} title="Unpublish website?" description="The published demo link will become unavailable. Your draft and previous snapshot are kept so you can publish again."><div className="pw-actions"><Action onClick={() => setConfirm(false)}>Cancel</Action><Action className="pw-danger" onClick={() => { try { updateWebsite(site.id, current => ({ ...current, status: 'draft', activity: ['Website unpublished · demo', ...current.activity].slice(0, 8) })); setConfirm(false); toast.success('Website unpublished. Your draft is preserved.'); } catch { toast.error('Unable to unpublish. Please try again.'); } }}>Unpublish website</Action></div></Modal></>;
}
