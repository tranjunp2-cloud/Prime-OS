import { useState } from 'react';
import { AlertTriangle, ArrowUpFromLine, ChevronRight, Radio, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { ChannelWizardDraft } from '@/components/products/ChannelListingWizard';

// ─── Types ────────────────────────────────────────────────────────────────────

type OverrideChannel = 'webstore' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'social' | 'rakuten';
type FieldGroupKey = 'content' | 'media' | 'shipping';

interface FormState {
  name: string;
  description: string;
  brand: string;
  retail_price: string;
  price_currency: string;
  pkg_length: string;
  pkg_width: string;
  pkg_height: string;
  pkg_weight: string;
  country_of_origin: string;
  hs_code: string;
  [key: string]: unknown;
}

interface EnabledChannel {
  key: OverrideChannel;
  label: string;
  account?: string;
  connectionStatus: 'connected' | 'attention' | 'not_connected';
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
}

interface FieldGroup {
  key: FieldGroupKey;
  label: string;
  risk: 'safe' | 'caution';
  cautionNote?: string;
  defaultChecked: boolean;
  fieldPreviews: (form: FormState, images: string[]) => Array<{ label: string; value: string }>;
  buildPatch: (form: FormState) => Partial<ChannelWizardDraft>;
}

interface ApplyMasterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormState;
  images: string[];
  enabledChannels: EnabledChannel[];
  listingDrafts: Record<OverrideChannel, ChannelWizardDraft>;
  initialChannel?: OverrideChannel | null;
  initialChannels?: OverrideChannel[];
  onApply: (patch: Partial<Record<OverrideChannel, Partial<ChannelWizardDraft>>>) => void;
}

// ─── Field groups config ───────────────────────────────────────────────────────

const FIELD_GROUPS: FieldGroup[] = [
  {
    key: 'content',
    label: 'Content & Identity',
    risk: 'safe',
    defaultChecked: true,
    fieldPreviews: (form) => [
      { label: 'Product name', value: form.name || '—' },
      { label: 'Description', value: form.description ? form.description.slice(0, 55) + (form.description.length > 55 ? '…' : '') : '—' },
      { label: 'Brand', value: form.brand || '—' },
    ],
    buildPatch: (form) => ({
      title: form.name.trim(),
      description: form.description.trim(),
      brand: form.brand.trim(),
    }),
  },
  {
    key: 'media',
    label: 'Media',
    risk: 'safe',
    defaultChecked: true,
    fieldPreviews: (_form, images) => [
      { label: 'Product images', value: images.length > 0 ? `${images.length} image${images.length > 1 ? 's' : ''} — inherit all` : 'No images yet' },
    ],
    buildPatch: () => ({ media_scope: 'all' }),
  },
  {
    key: 'shipping',
    label: 'Shipping & Compliance',
    risk: 'caution',
    cautionNote: 'This will overwrite any channel-specific compliance notes already set.',
    defaultChecked: false,
    fieldPreviews: (form) => [
      {
        label: 'Package dimensions',
        value: (form.pkg_length && form.pkg_width && form.pkg_height)
          ? `${form.pkg_length}x${form.pkg_width}x${form.pkg_height}cm · ${form.pkg_weight}g`
          : '—',
      },
      { label: 'Country of origin', value: form.country_of_origin || '—' },
      { label: 'HS Code', value: form.hs_code || '—' },
    ],
    buildPatch: (form) => {
      const parts: string[] = [];
      if (form.pkg_length && form.pkg_width && form.pkg_height) {
        parts.push(`Package: ${form.pkg_length}x${form.pkg_width}x${form.pkg_height}cm · ${form.pkg_weight}g`);
      }
      if (form.country_of_origin) parts.push(`Origin: ${form.country_of_origin}`);
      if (form.hs_code) parts.push(`HS: ${form.hs_code}`);
      return parts.length ? { compliance_notes: parts.join('\n') } : {};
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplyMasterSheet({ open, onOpenChange, form, images, enabledChannels, listingDrafts, initialChannel, initialChannels, onApply }: ApplyMasterSheetProps) {
  const startingChannels = initialChannels?.length ? initialChannels : initialChannel ? [initialChannel] : [];
  const [selectedGroups, setSelectedGroups] = useState<Record<FieldGroupKey, boolean>>(() =>
    Object.fromEntries(FIELD_GROUPS.map(g => [g.key, g.defaultChecked])) as Record<FieldGroupKey, boolean>
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<FieldGroupKey>>(new Set(FIELD_GROUPS.map(group => group.key)));
  const [listingMode, setListingMode] = useState<'all' | 'select'>(startingChannels.length ? 'select' : 'all');
  const [selectedListings, setSelectedListings] = useState<Set<OverrideChannel>>(
    () => new Set(startingChannels.length ? startingChannels : enabledChannels.filter(c => c.connectionStatus === 'connected').map(c => c.key))
  );

  const connectedChannels = enabledChannels.filter(c => c.connectionStatus !== 'not_connected');
  const activeListings = listingMode === 'all'
    ? connectedChannels.filter(c => c.connectionStatus === 'connected').map(c => c.key)
    : Array.from(selectedListings);
  const activeGroupKeys = FIELD_GROUPS.filter(g => selectedGroups[g.key]).map(g => g.key);
  const canApply = activeGroupKeys.length > 0 && activeListings.length > 0;

  function currentListingValue(groupKey: FieldGroupKey, fieldLabel: string, draft: ChannelWizardDraft): string {
    if (groupKey === 'content') {
      if (fieldLabel === 'Product name') return draft.title || 'Not set';
      if (fieldLabel === 'Description') return draft.description ? draft.description.slice(0, 55) + (draft.description.length > 55 ? '…' : '') : 'Not set';
      if (fieldLabel === 'Brand') return draft.brand || 'Not set';
    }
    if (groupKey === 'media') return draft.media_scope === 'all' ? 'All Master images' : 'Listing-specific media';
    if (groupKey === 'shipping') {
      const prefix = fieldLabel === 'Package dimensions' ? 'Package:' : fieldLabel === 'Country of origin' ? 'Origin:' : 'HS:';
      const value = draft.compliance_notes.split('\n').find(line => line.startsWith(prefix));
      return value?.slice(prefix.length).trim() || 'Not set';
    }
    return 'Not set';
  }

  function toggleGroup(key: FieldGroupKey) {
    setSelectedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleExpand(key: FieldGroupKey) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleListing(key: OverrideChannel) {
    setSelectedListings(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleApply() {
    if (!canApply) return;
    const fieldPatch: Partial<ChannelWizardDraft> = {};
    for (const group of FIELD_GROUPS) {
      if (selectedGroups[group.key]) {
        Object.assign(fieldPatch, group.buildPatch(form));
      }
    }
    const patch: Partial<Record<OverrideChannel, Partial<ChannelWizardDraft>>> = {};
    for (const key of activeListings) {
      patch[key] = { ...fieldPatch };
    }
    onApply(patch);
  }

  const appliedGroupLabels = FIELD_GROUPS.filter(g => selectedGroups[g.key]).map(g => g.label);
  const appliedListingLabels = enabledChannels
    .filter(c => activeListings.includes(c.key))
    .map(c => c.label);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[560px]">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="size-4 text-primary" />
            Review changes before sync
          </SheetTitle>
          <SheetDescription>
            Compare the current listing data with the latest Product Master. Select the groups to update, then confirm the sync. Prices are reviewed separately in the listing’s Price & inventory section; manual prices are preserved.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Field groups */}
          <div className="border-b px-6 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data to apply</p>
            <div className="space-y-2">
              {FIELD_GROUPS.map(group => {
                const isExpanded = expandedGroups.has(group.key);
                const isChecked = selectedGroups[group.key];
                const previews = group.fieldPreviews(form, images);
                const changedFieldCount = activeListings.reduce((count, listingKey) => {
                  const draft = listingDrafts[listingKey];
                  if (!draft) return count;
                  return count + previews.filter(field => currentListingValue(group.key, field.label, draft) !== field.value).length;
                }, 0);

                return (
                  <div key={group.key} className="overflow-hidden rounded-lg border">
                    {/* Group header */}
                    <div
                      className={cn(
                        'flex min-h-12 cursor-pointer items-center gap-3 px-4 transition-colors duration-150 hover:bg-muted/50 motion-reduce:transition-none',
                        isChecked ? 'bg-muted/30' : 'bg-background',
                      )}
                    >
                      <Checkbox
                        id={`group-${group.key}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleGroup(group.key)}
                        className="shrink-0"
                      />
                      <Label
                        htmlFor={`group-${group.key}`}
                        className="flex-1 cursor-pointer select-none text-sm font-semibold"
                      >
                        {group.label}
                      </Label>
                      {group.risk === 'caution' && (
                        <Badge className="bg-amber-500/12 text-amber-700 border-amber-200 text-[10px]">
                          <AlertTriangle className="size-3 mr-1" />Caution
                        </Badge>
                      )}
                      <span className={cn('text-xs font-medium', changedFieldCount ? 'text-blue-500' : 'text-muted-foreground')}>{changedFieldCount ? `${changedFieldCount} ${changedFieldCount === 1 ? 'change' : 'changes'}` : 'No changes'}</span>
                      <button
                        type="button"
                        onClick={() => toggleExpand(group.key)}
                        aria-label={isExpanded ? `Collapse ${group.label}` : `Expand ${group.label}`}
                        className="rounded p-0.5 text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                      >
                        <ChevronRight className={cn('size-4 transition-transform duration-150 motion-reduce:transition-none', isExpanded && 'rotate-90')} />
                      </button>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t bg-muted/10">
                        {group.risk === 'caution' && group.cautionNote && (
                          <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                            {group.cautionNote}
                          </div>
                        )}
                        <div className="space-y-4 px-4 py-3">
                          {activeListings.map(listingKey => {
                            const channel = enabledChannels.find(item => item.key === listingKey);
                            const draft = listingDrafts[listingKey];
                            if (!draft) return null;
                            const changedFields = previews.filter(field => currentListingValue(group.key, field.label, draft) !== field.value);
                            if (!changedFields.length) return null;
                            return <div key={listingKey} className="overflow-hidden rounded-md border bg-background">
                              <div className="flex items-center gap-2 border-b bg-muted/25 px-3 py-2">
                                <span className="text-xs font-semibold">{channel?.label ?? listingKey}</span>
                                {channel?.account ? <span className="truncate text-[11px] text-muted-foreground">{channel.account}</span> : null}
                                <span className="ml-auto text-[10px] font-medium text-blue-500">{changedFields.length} {changedFields.length === 1 ? 'field' : 'fields'}</span>
                              </div>
                              <div className="grid grid-cols-[minmax(90px,0.75fr)_minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-x-2 border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <span>Field</span><span>Current listing</span><span /><span>New from Master</span>
                              </div>
                              <div className="divide-y divide-border/50">
                                {changedFields.map(field => {
                                  const currentValue = currentListingValue(group.key, field.label, draft);
                                  return <div key={field.label} className="grid grid-cols-[minmax(90px,0.75fr)_minmax(0,1fr)_16px_minmax(0,1fr)] items-start gap-x-2 px-3 py-2.5 text-xs">
                                    <span className="font-medium text-foreground/80">{field.label}</span>
                                    <span className="break-words text-muted-foreground" title={currentValue}>{currentValue}</span>
                                    <ChevronRight className="mt-0.5 size-3.5 text-blue-500" />
                                    <span className="break-words font-medium text-foreground" title={field.value}>{field.value}</span>
                                  </div>;
                                })}
                              </div>
                            </div>;
                          })}
                          {changedFieldCount === 0 ? <p className="py-2 text-center text-xs text-muted-foreground">This data already matches the selected listings.</p> : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Listing selection */}
          <div className="px-6 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Apply to</p>

            {enabledChannels.length === 0 ? (
              <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                <div>
                  <Radio className="mx-auto mb-2 size-5" />
                  <p className="font-medium text-foreground">No channel listings configured yet</p>
                  <p className="mt-1 text-xs">Create listings first before applying master data.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex gap-4">
                  {(['all', 'select'] as const).map(mode => (
                    <label key={mode} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="listing-mode"
                        value={mode}
                        checked={listingMode === mode}
                        onChange={() => setListingMode(mode)}
                        className="accent-primary"
                      />
                      {mode === 'all'
                        ? `All listings (${connectedChannels.filter(c => c.connectionStatus === 'connected').length})`
                        : 'Choose listings'}
                    </label>
                  ))}
                </div>

                {listingMode === 'select' && (
                  <div className="space-y-2">
                    {enabledChannels.map(channel => {
                      const ChannelIcon = channel.icon;
                      const isDisabled = channel.connectionStatus === 'attention' || channel.connectionStatus === 'not_connected';
                      const isSelected = selectedListings.has(channel.key);

                      return (
                        <label
                          key={channel.key}
                          className={cn(
                            'flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors duration-150 motion-reduce:transition-none',
                            isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted/30',
                            isSelected && !isDisabled ? 'border-primary/30 bg-primary/5' : '',
                          )}
                        >
                          <Checkbox
                            checked={isSelected && !isDisabled}
                            disabled={isDisabled}
                            onCheckedChange={() => !isDisabled && toggleListing(channel.key)}
                            className="shrink-0"
                          />
                          <span className={cn('grid size-8 shrink-0 place-items-center rounded-md', channel.iconClassName)}>
                            <ChannelIcon className="size-4" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium">{channel.label}</span>
                            {channel.account && (
                              <span className="block truncate text-xs text-muted-foreground">{channel.account}</span>
                            )}
                          </span>
                          {channel.connectionStatus === 'attention' && (
                            <span
                              className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                              title="Reconnect this channel before syncing"
                            >
                              Reconnect required
                            </span>
                          )}
                          {channel.connectionStatus === 'connected' && (
                            <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Summary preview */}
          {canApply && (
            <div className="mx-6 mb-5 rounded-lg border bg-primary/5 px-4 py-3" role="status" aria-live="polite">
              <p className="text-xs font-semibold text-primary">Ready to apply</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{appliedGroupLabels.join(', ')}</span>
                {' '}
                &rarr;
                {' '}
                <span className="font-medium text-foreground">{appliedListingLabels.join(', ')}</span>
                {appliedListingLabels.length > 1 ? ` (${appliedListingLabels.length} listings)` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canApply}
            title={!canApply ? 'Select at least one field group and one listing' : undefined}
            onClick={handleApply}
          >
            <ArrowUpFromLine className="size-4" />
            {canApply
              ? `Confirm & sync ${activeListings.length} listing${activeListings.length > 1 ? 's' : ''}`
              : 'Select fields and listings'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
