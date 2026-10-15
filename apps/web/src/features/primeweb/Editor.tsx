import { EditorChat } from './EditorChat';
import { BlockLibraryPanel } from './source-ui/BlockLibraryPanel';
import { sourceBlocks } from './source-ui/block-library-data';
import { EditorPublishControls } from './source-ui/EditorPublishControls';
import { WorkspaceLayoutControls } from './source-ui/WorkspaceLayoutControls';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, FileText, Image, Layers, MessageSquare, Monitor, Plus, Redo2, Save, Smartphone, Sparkles, Tablet, Trash2, Undo2, Palette, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { getProducts } from '@/lib/product-store';
import { Action, Field, Modal, Pill } from './ui';
import { EditorSidebar } from './source-ui/EditorSidebar';
import { EDITOR_SIDEBAR_WIDTH, SETTINGS_PANEL_WIDTH } from './source-ui/layout-constants';
import { makeBlock, updateDraft, updateWebsite, websiteHref, type Website, type WebsiteContent, type Block, type BlockKind } from './store';
import { StorefrontPreview } from './StorefrontPreview';

export function Editor({ site, onPublish }: { site: Website; onPublish: () => void }) {
  const [layout, setLayout] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('primeweb.editor-layout') || 'null'); if (typeof saved?.left === 'boolean' && typeof saved?.right === 'boolean') return saved as { left: boolean; right: boolean }; } catch { /* Fall back to source default layout. */ } return { left: true, right: true }; });
  function changeLayout(next: { left: boolean; right: boolean }) { setLayout(next); try { localStorage.setItem('primeweb.editor-layout', JSON.stringify(next)); } catch { /* Layout still works for this session. */ } }
  const [tab, setTab] = useState('components');
  const [pageId, setPageId] = useState(site.draft.pages[0].id);
  const [selectedId, setSelectedId] = useState(site.draft.pages[0].blocks[1]?.id ?? '');
  const [device, setDevice] = useState('desktop');
  const [settingsTab, setSettingsTab] = useState('content');
  const [mediaOpen, setMediaOpen] = useState(false);
  const media = [...new Set([...site.draft.pages.flatMap(p => p.blocks.map(b => b.image)), ...getProducts().flatMap(p => p.images ?? [])])].filter(Boolean).slice(0, 36);
  const [past, setPast] = useState<WebsiteContent[]>([]);
  const [future, setFuture] = useState<WebsiteContent[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Draft restored');
  const [savedContent, setSavedContent] = useState(() => JSON.stringify(site.draft));
  const unsaved = JSON.stringify(site.draft) !== savedContent;
  const page = site.draft.pages.find(p => p.id === pageId) ?? site.draft.pages[0];
  const block = page.blocks.find(b => b.id === selectedId);
  function change(edit: (draft: WebsiteContent) => WebsiteContent) {
    try { updateDraft(site.id, edit); setPast([...past.slice(-29), structuredClone(site.draft)]); setFuture([]); setSaveMessage('Draft saved locally'); return true; } catch { toast.error('Unable to save. Browser storage may be full.'); return false; }
  }
  function editBlock(patch: Partial<Block>) { change(d => ({ ...d, pages: d.pages.map(p => p.id === page.id || block?.kind === 'footer' || sourceBlocks.some(item => item.type === block?.sourceType && item.scope === 'global') ? { ...p, blocks: p.blocks.map(b => b.id === selectedId || (block?.kind === 'footer' && b.kind === 'footer') ? { ...b, ...patch } : b) } : p) })); }
  function addSourceBlock(type: string) {
    const definition = sourceBlocks.find(item => item.type === type);
    if (!definition) return;
    const existing = definition.scope === 'global' ? site.draft.pages.flatMap(item => item.blocks).find(item => item.sourceType === type) : undefined;
    if (existing) { setSelectedId(existing.id); setSettingsTab('content'); changeLayout({ ...layout, right: true }); return; }
    const kinds: Record<string, BlockKind> = { hero: 'hero', cta: 'hero', 'products-grid': 'products', 'products-featured': 'products', cartWidget: 'products', contact: 'contact', newsletter: 'contact', 'announcement-bar': 'announcement' };
    const added = { ...makeBlock(kinds[type] ?? 'image-text'), sourceType: type, sourceVariant: definition.defaultVariant, title: definition.name, text: definition.description };
    change(draft => { draft.pages.forEach(target => {
      if (target.id !== page.id && definition.scope !== 'global') return;
      const selected = target.blocks.findIndex(item => item.id === selectedId);
      target.blocks.splice(selected >= 0 ? selected + 1 : target.blocks.length, 0, structuredClone(added));
    }); return draft; });
    setSelectedId(added.id); setSettingsTab('content'); changeLayout({ ...layout, right: true });
  }
  async function upload(file: File | undefined, target: 'image' | 'logo' | 'favicon') {
    if (!file) return; if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 700_000) { toast.error('Choose a PNG, JPG, WebP or GIF under 700 KB for this demo.'); return; }
    const value = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    if (target === 'image') editBlock({ image: value }); else change(d => ({ ...d, [target]: value }));
  }
  return <div className={`pw-editor ${layout.left ? '' : 'pw-hide-left'} ${layout.right ? '' : 'pw-hide-right'}`} style={{ '--editor-left': `${EDITOR_SIDEBAR_WIDTH}px`, '--editor-right': `${SETTINGS_PANEL_WIDTH}px` } as React.CSSProperties}>
    <div className="pw-editor-toolbar"><div className="pw-actions"><select aria-label="Current page" value={page.id} onChange={e => { setPageId(e.target.value); setSelectedId(''); }}>{site.draft.pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select><span className="sr-only">{saveMessage}</span></div><div className="pw-device-switch">{[{ id: 'desktop', icon: Monitor }, { id: 'tablet', icon: Tablet }, { id: 'mobile', icon: Smartphone }].map(({ id, icon: Icon }) => <Action key={id} aria-label={`${id} preview`} aria-pressed={device === id} onClick={() => setDevice(id)}><Icon size={17} /></Action>)}</div><WorkspaceLayoutControls layout={layout} onChange={changeLayout} /><div className="pw-actions"><Action aria-label="Undo" disabled={!past.length} onClick={() => { updateDraft(site.id, () => past[past.length - 1]); setFuture([site.draft, ...future]); setPast(past.slice(0, -1)); }}><Undo2 size={17} /></Action><Action aria-label="Redo" disabled={!future.length} onClick={() => { updateDraft(site.id, () => future[0]); setPast([...past, site.draft]); setFuture(future.slice(1)); }}><Redo2 size={17} /></Action>{unsaved && <Action onClick={() => { try { updateWebsite(site.id, s => ({ ...s, savedAt: new Date().toISOString() })); setSavedContent(JSON.stringify(site.draft)); setSaveMessage('Draft saved locally'); toast.success('Draft saved. Published website is unchanged.'); } catch { toast.error('Unable to save. Please try again.'); } }}><Save size={16} />Save</Action>}<EditorPublishControls site={site} onPublish={onPublish} disabled={aiBusy} unsaved={unsaved} /></div></div>
    <div className="pw-editor-grid"><EditorSidebar tabs={[{ id: 'chat', label: 'AI Chat', icon: <MessageSquare size={15} /> }, { id: 'components', label: 'Components', icon: <Layers size={15} /> }, { id: 'pages', label: 'Pages', icon: <FileText size={15} /> }]} activeTab={tab} onTabChange={setTab}>
      {tab === 'components' && <BlockLibraryPanel onAdd={addSourceBlock} globalTypes={site.draft.pages.flatMap(item => item.blocks.map(block => block.sourceType ?? ''))} />}
      {tab === 'pages' && <><div className="pw-panel-title"><strong>Website pages</strong><p>Pages also appear in the website menu.</p></div>{site.draft.pages.map(p => <button type="button" key={p.id} className="pw-page-choice" aria-pressed={page.id === p.id} onClick={() => { setPageId(p.id); setSelectedId(''); }}><FileText size={16} />{p.title}<span>/{p.slug}</span></button>)}<Link className="pw-button pw-full" to={websiteHref('pages', site.id)}><Plus size={16} />Manage blog posts</Link></>}
      <div className="pw-chat-mount" hidden={tab !== 'chat'}><EditorChat name={site.draft.name} pageId={page.id} hasHero={page.blocks.some(block => block.kind === 'hero')} onBusyChange={setAiBusy} onApply={(targetPage, patch) => {
        if (!site.draft.pages.find(item => item.id === targetPage)?.blocks.some(block => block.kind === 'hero')) { toast.error('The target hero no longer exists. Add a hero and request a new suggestion.'); return false; }
        return change(draft => { const hero = draft.pages.find(item => item.id === targetPage)!.blocks.find(block => block.kind === 'hero')!; Object.assign(hero, patch); return draft; });
      }} /></div>
    </EditorSidebar>
    <div className={`pw-canvas pw-device-${device}`} onDragOver={event => { if (event.dataTransfer.types.includes('application/json')) event.preventDefault(); }} onDrop={event => { event.preventDefault(); try { const data = JSON.parse(event.dataTransfer.getData('application/json')); if (typeof data.blockType === 'string') addSourceBlock(data.blockType); } catch { /* Ignore unrelated drags. */ } }}><div className="pw-canvas-label"><span>{site.draft.name} / {page.title}</span><Pill>Draft preview</Pill></div><div className="pw-canvas-frame"><StorefrontPreview key={`${site.id}-${page.id}`} content={site.draft} pageId={page.id} selectedBlock={selectedId} onSelect={setSelectedId} /></div><p className="pw-canvas-footnote">Click a section to edit · Changes are saved locally</p></div>
    <aside className="pw-inspector"><div className="pw-tabs">{[{ id: 'content', label: 'Content', icon: Layers }, { id: 'global', label: 'Global', icon: Palette }, { id: 'menu', label: 'Menu', icon: Menu }].map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={settingsTab === id} onClick={() => setSettingsTab(id)}><Icon size={15} />{label}</button>)}</div><div className="pw-inspector-body">
      {settingsTab === 'content' && (block ? <><div className="pw-panel-title"><strong>{sourceBlocks.find(item => item.type === block.sourceType)?.name ?? block.kind} settings</strong><p>Edit the selected section.</p></div><Field label="Heading"><input value={block.title} onChange={e => editBlock({ title: e.target.value })} /></Field><Field label="Description"><textarea rows={4} value={block.text} onChange={e => editBlock({ text: e.target.value })} /></Field>{block.kind === 'hero' && <Field label="Button text"><input value={block.button} onChange={e => editBlock({ button: e.target.value })} /></Field>}{['hero', 'image-text'].includes(block.kind) && <Field label="Section image"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => void upload(e.target.files?.[0], 'image').catch(() => toast.error('Unable to read image.'))} /></Field>}{['hero', 'image-text'].includes(block.kind) && <Action onClick={() => setMediaOpen(true)}><Image size={16} />Choose from media library</Action>}{block.kind === 'products' && <div className="pw-callout"><strong>Connected to Main</strong><p>Product details, prices and stock are owned by Main.</p><Link to="/products/master-catalog">Manage products in Main →</Link></div>}<label className="pw-check"><input type="checkbox" checked={block.visible} onChange={e => editBlock({ visible: e.target.checked })} />Show section</label><Action className="pw-danger" onClick={() => { change(d => ({ ...d, pages: d.pages.map(p => p.id === page.id || sourceBlocks.some(item => item.type === block?.sourceType && item.scope === 'global') ? { ...p, blocks: p.blocks.filter(b => b.id !== selectedId) } : p) })); setSelectedId(''); }}><Trash2 size={15} />Remove section</Action></> : <div className="pw-empty"><Layers size={26} /><h3>Select a section</h3><p>Choose a component on the canvas to edit its content.</p></div>)}
      {settingsTab === 'global' && <><div className="pw-panel-title"><strong>Global appearance</strong><p>Shared across every page.</p></div><Field label="Website name"><input value={site.draft.name} onChange={e => change(d => ({ ...d, name: e.target.value }))} /></Field><Field label="Brand color"><input type="color" value={site.draft.color} onChange={e => change(d => ({ ...d, color: e.target.value }))} /></Field><Field label="Typography"><select value={site.draft.font} onChange={e => change(d => ({ ...d, font: e.target.value }))}><option>Inter</option><option>Serif</option></select></Field><Field label="Logo"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void upload(e.target.files?.[0], 'logo').catch(() => toast.error('Unable to read image.'))} /></Field><Field label="Favicon"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void upload(e.target.files?.[0], 'favicon').catch(() => toast.error('Unable to read image.'))} /></Field><Field label="Language"><select value={site.draft.locale} onChange={e => change(d => ({ ...d, locale: e.target.value }))}><option value="en">English</option><option value="vi">Tiếng Việt</option><option value="ms">Bahasa Melayu</option></select></Field><p className="pw-muted">Language preference only. Automatic translation is not connected in this prototype.</p></>}
      {settingsTab === 'menu' && <><div className="pw-panel-title"><strong>Navigation</strong><p>Rename and reorder the links in your header.</p></div>{site.draft.pages.map((p, i) => <div key={p.id} className="pw-menu-item"><Field label={`Menu item ${i + 1}`}><input value={p.title} onChange={e => change(d => ({ ...d, pages: d.pages.map(page => page.id === p.id ? { ...page, title: e.target.value } : page) }))} /></Field><Action aria-label={`Move ${p.title} up`} disabled={i === 0} onClick={() => change(d => { [d.pages[i - 1], d.pages[i]] = [d.pages[i], d.pages[i - 1]]; return d; })}><ArrowUp size={15} /></Action></div>)}</>}
    </div></aside></div>
    <Modal open={mediaOpen} onClose={() => setMediaOpen(false)} title="Media library" description="Reuse images from your website and the Main product catalog."><div className="pw-media-grid">{media.map((src, i) => <button type="button" key={src} aria-label={`Use media image ${i + 1}`} onClick={() => { editBlock({ image: src }); setMediaOpen(false); }}><img src={src} alt={`Catalog image ${i + 1}`} loading="lazy" /></button>)}</div>{!media.length && <p>No images yet. Upload an image from the section settings.</p>}</Modal>
  </div>;
}
