/** UI ported from ech-prime-web-v2 BlockLibraryPanel; controlled callbacks replace its Next/Zustand dependencies. */
import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { sourceBlocks, blockLibraryCopy as bl } from './block-library-data';
const groups = ['basics', 'content', 'media', 'store', 'commerce', 'form', 'widgets', 'layout'] as const;
const icons = ['📦','📄','🖼️','💼','🛒','📝','🔧','📐'];
export function BlockLibraryPanel({ onAdd, globalTypes }: { onAdd: (type: string) => void; globalTypes: string[] }) {
 const [query, setQuery] = useState('');
 const [expandedCategory, setExpandedCategory] = useState<string>('basics');
 const isCompact = false;
 const categories = groups.map((id, index) => {
  const blocks = sourceBlocks.filter(block => block.category === id);
  return { id, label: bl.categories[id], icon: icons[index], totalCount: blocks.length, items: blocks.filter(block => `${block.name} ${block.previewText} ${block.type}`.toLowerCase().includes(query.trim().toLowerCase())) };
 }).filter(category => category.items.length || !query.trim());
    return (
        <TooltipProvider delayDuration={200}>
        <div className="flex h-full flex-col bg-[var(--editor-surface)]">
            <div className="border-b border-white/[0.06] px-4 py-3">
                {/* Shared <Input> mặc định — bg theo --card (trắng ở light, tối ở dark) + viền --input-border. */}
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <Input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={bl.searchPlaceholder}
                        className="pl-9 pr-3 text-[13px]"
                    />
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <div className="space-y-1">
                    {categories.map(category => {
                        const isExpanded = category.id === expandedCategory || !!query.trim()

                        return (
                            <section key={category.id}>
                                <button
                                    type="button"
                                    onClick={() => setExpandedCategory(prev => (prev === category.id ? prev : category.id))}
                                    className="flex h-9 w-full items-center justify-between rounded-lg px-2 text-left transition-colors hover:bg-white/[0.04]"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm leading-none">{category.icon}</span>
                                        <span className="text-[13px] font-medium text-slate-200">{category.label}</span>
                                        <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{category.totalCount}</span>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                                    ) : (
                                        <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                                    )}
                                </button>

                                {isExpanded ? (
                                    <div className="mt-1 space-y-1 pb-2">
                                        {category.items.map(item => {
                                            const globalKey = item.type
                                            const isAlreadyGlobal = item.scope === 'global' && item.defaultVariant === 'floating'
                                                && !!globalKey && globalTypes.includes(globalKey)
                                            return (
                                            // F26-03: relative wrapper so ✨ AI button sits as a sibling (not child) of the block button
                                            <div key={item.type} className="relative">
                                            <Tooltip open={isAlreadyGlobal ? undefined : false}>
                                            <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                draggable={!isAlreadyGlobal}
                                                onDragStart={(e) => {
                                                    if (isAlreadyGlobal) { e.preventDefault(); return }
                                                    const blockData = { blockType: item.type, variant: item.defaultVariant }
                                                    e.dataTransfer.setData('application/json', JSON.stringify(blockData))
                                                    e.dataTransfer.effectAllowed = 'copy'
                                                }}
                                                onClick={() => {
                                                    if (isAlreadyGlobal) { onAdd(item.type) }
                                                    else onAdd(item.type)
                                                }}
                                                className={cn(
                                                    "group flex w-full items-center gap-3 rounded-lg border border-transparent bg-white/[0.02] px-3 py-2.5 text-left transition-all",
                                                    isAlreadyGlobal
                                                        ? "opacity-60 hover:border-white/[0.08] hover:bg-white/[0.06] cursor-pointer"
                                                        : "hover:border-white/[0.08] hover:bg-white/[0.06] cursor-grab active:cursor-grabbing active:scale-[0.98]",
                                                )}
                                            >
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-cyan-500/15 text-lg">
                                                    {item.icon}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="truncate text-[13px] font-medium text-slate-200">{item.name}</p>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                {item.scope === 'global' ? (
                                                                    <span
                                                                        className="shrink-0 cursor-default rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none"
                                                                        style={{ background: 'hsl(var(--info)/0.12)', color: 'hsl(var(--info))' }}
                                                                    >
                                                                        🌐 {bl.globalScopeLabel}
                                                                    </span>
                                                                ) : (
                                                                    <span
                                                                        className="shrink-0 cursor-default rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none"
                                                                        style={{ background: 'rgba(148,163,184,0.10)', color: 'var(--editor-text-muted)' }}
                                                                    >
                                                                        📄 {bl.pageScopeLabel}
                                                                    </span>
                                                                )}
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right">
                                                                {item.scope === 'global'
                                                                    ? (item.scopeTooltip ?? bl.globalScopeTooltipDefault)
                                                                    : (item.scopeTooltip ?? bl.pageScopeTooltipDefault)}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                    {/* F26-03: locale-aware preview text (no interactive children in button) */}
                                                    <p className="truncate text-[11px] text-slate-500">{item.previewText}</p>
                                                </div>
                                                {!isAlreadyGlobal && (
                                                    isCompact ? (
                                                        <Plus className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                                                    ) : (
                                                        <span className="shrink-0 text-[10px] text-slate-600 opacity-0 transition-opacity group-hover:opacity-100">
                                                            {bl.dragHint}
                                                        </span>
                                                    )
                                                )}
                                            </button>
                                            </TooltipTrigger>
                                            {isAlreadyGlobal && (
                                                <TooltipContent side="right">
                                                    {bl.alreadyAddedHint ?? 'Already added — click to edit settings'}
                                                </TooltipContent>
                                            )}
                                            </Tooltip>
                                            </div>
                                            )
                                        })}
                                    </div>
                                ) : null}
                            </section>
                        )
                    })}
                </div>
            </div>

            {!isCompact && (
                <div className="border-t border-white/[0.06] bg-[var(--editor-bg)]/60 px-4 py-3">
                    <p className="text-center text-[11px] text-slate-500">
                        {bl.footerHint}
                    </p>
                </div>
            )}
        </div>
        </TooltipProvider>
    )
}
