import { useState } from 'react';
import { Plus, GripVertical, Trash2, Check, AlertTriangle, Save, RotateCcw, Settings2, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRoutingConfig } from '@/hooks/use-routing-config';
import {
  createEmptyRule,
  type RoutingRule,
  type RoutingConfig,
  CHANNEL_OPTIONS,
  COUNTRY_OPTIONS,
} from '@/lib/routing-config-types';
import { getWarehouses } from '@/lib/warehouse-store';
import { useI18n } from '@/lib/i18n/I18nContext';

interface RoutingConfigEditorProps {
  warehouseId: string;
  warehouseName: string;
  warehouseCountry: string;
}

export function RoutingConfigEditor({ warehouseId, warehouseName, warehouseCountry }: RoutingConfigEditorProps) {
  const { locale, t } = useI18n();
  const { toast } = useToast();
  const warehouses = getWarehouses().filter(w => w.status === 'active');
  const { config, isEnabled, isLoading, isSaving, hasExistingConfig, saveConfig, resetConfig } = useRoutingConfig(warehouseId, warehouseName, warehouseCountry);

  const [localRules, setLocalRules] = useState<RoutingRule[]>(config.rules);
  const [localSplit, setLocalSplit] = useState(config.split_order_enabled);
  const [localDefault, setLocalDefault] = useState(config.default_warehouse_id);
  const [localFallback, setLocalFallback] = useState<string[]>(config.fallback_chain);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const copy = {
    unsaved: locale === 'ja-JP' ? '未保存' : locale === 'vi-VN' ? 'Chưa lưu' : 'Unsaved',
    splitOrder: locale === 'ja-JP' ? '分割出荷' : locale === 'vi-VN' ? 'Tách đơn' : 'Split Order',
    splitOrderDesc: locale === 'ja-JP' ? '注文を複数倉庫に分割できるようにします' : locale === 'vi-VN' ? 'Cho phép một đơn được chia qua nhiều kho' : 'Allow orders to be split across warehouses',
    defaultWarehouse: locale === 'ja-JP' ? 'デフォルト倉庫' : locale === 'vi-VN' ? 'Kho mặc định' : 'Default Warehouse',
    defaultWarehouseDesc: locale === 'ja-JP' ? 'どのルールにも一致しない場合のフォールバック' : locale === 'vi-VN' ? 'Fallback khi không có rule nào khớp' : 'Fallback when no rules match',
    none: locale === 'ja-JP' ? 'なし' : locale === 'vi-VN' ? 'Không có' : 'None',
    fallbackChain: locale === 'ja-JP' ? 'フォールバックチェーン' : locale === 'vi-VN' ? 'Chuỗi fallback' : 'Fallback Chain',
    add: locale === 'ja-JP' ? '追加' : locale === 'vi-VN' ? 'Thêm' : 'Add',
    fallbackEmpty: locale === 'ja-JP' ? 'フォールバックチェーンは未設定です' : locale === 'vi-VN' ? 'Chưa định nghĩa chuỗi fallback' : 'No fallback chain defined',
    rules: locale === 'ja-JP' ? 'ルーティングルール' : locale === 'vi-VN' ? 'Rule điều hướng' : 'Routing Rules',
    addRule: locale === 'ja-JP' ? 'ルールを追加' : locale === 'vi-VN' ? 'Thêm rule' : 'Add Rule',
    noRules: locale === 'ja-JP' ? 'ルールはまだありません' : locale === 'vi-VN' ? 'Chưa có rule nào' : 'No rules yet',
    noRulesDesc: locale === 'ja-JP' ? 'どの倉庫がどの注文を処理するかを制御するルールを追加してください。' : locale === 'vi-VN' ? 'Hãy thêm rule để điều khiển kho nào xử lý loại đơn nào.' : 'Add routing rules to control which warehouse handles which orders.',
    addFirstRule: locale === 'ja-JP' ? '最初のルールを追加' : locale === 'vi-VN' ? 'Thêm rule đầu tiên' : 'Add First Rule',
    noConditions: locale === 'ja-JP' ? '条件なし（全件対象）' : locale === 'vi-VN' ? 'Không có điều kiện (bắt mọi đơn)' : 'No conditions (catch-all)',
    rulesCount: locale === 'ja-JP' ? '{count} 件のルール' : locale === 'vi-VN' ? '{count} rule' : '{count} rule{suffix}',
  } as const;

  function markChanged() { setHasChanges(true); }

  function handleSave() {
    const newConfig: RoutingConfig = {
      ...config,
      rules: localRules,
      split_order_enabled: localSplit,
      default_warehouse_id: localDefault,
      fallback_chain: localFallback,
    };
    saveConfig(newConfig);
    setHasChanges(false);
  }

  function handleReset() {
    setLocalRules([]);
    setLocalSplit(false);
    setLocalDefault('');
    setLocalFallback([]);
    resetConfig();
    setHasChanges(false);
    setResetDialogOpen(false);
  }

  function openAddRule() {
    const newRule = { ...createEmptyRule(), warehouse_id: warehouseId };
    setEditingRule(newRule);
    setEditDialogOpen(true);
  }

  function openEditRule(rule: RoutingRule) {
    setEditingRule({ ...rule });
    setEditDialogOpen(true);
  }

  function saveEditedRule() {
    if (!editingRule) return;
    setLocalRules(prev => {
      const idx = prev.findIndex(r => r.id === editingRule.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = editingRule;
        return next;
      }
      return [...prev, editingRule];
    });
    markChanged();
    setEditDialogOpen(false);
    setEditingRule(null);
  }

  function deleteRule(id: string) {
    setLocalRules(prev => prev.filter(r => r.id !== id));
    markChanged();
  }

  function moveRule(index: number, direction: -1 | 1) {
    const next = [...localRules];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLocalRules(next.map((r, i) => ({ ...r, priority: i + 1 })));
    markChanged();
  }

  function conditionSummary(rule: RoutingRule): string {
    const parts: string[] = [];
    if (rule.conditions.channels?.length) parts.push(`ch: ${rule.conditions.channels.join(', ')}`);
    if (rule.conditions.countries?.length) parts.push(`ct: ${rule.conditions.countries.join(', ')}`);
    if (rule.conditions.max_weight_g) parts.push(`≤${rule.conditions.max_weight_g}g`);
    if (rule.conditions.max_value_jpy) parts.push(`≤¥${rule.conditions.max_value_jpy.toLocaleString()}`);
    if (rule.conditions.warehouse_types?.length) parts.push(`type: ${rule.conditions.warehouse_types.join(', ')}`);
    if (rule.conditions.min_quantity != null) parts.push(`qty ≥${rule.conditions.min_quantity}`);
    if (rule.conditions.max_quantity != null) parts.push(`qty ≤${rule.conditions.max_quantity}`);
    return parts.length ? parts.join(' | ') : copy.noConditions;
  }

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">{t('warehouses.routingSaving')}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Settings2 className="size-4" />
            {warehouseName}
            <Badge variant="outline" className="text-xs ml-1">{warehouseCountry}</Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('warehouses.routingTitle')} v{config.config_version ?? 1} · {copy.rulesCount.replace('{count}', String(localRules.length)).replace('{suffix}', localRules.length !== 1 ? 's' : '')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
              <AlertTriangle className="size-3" /> {copy.unsaved}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} disabled={isSaving}>
            <RotateCcw className="size-3.5 mr-1" />{t('warehouses.routingReset')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !hasChanges}>
            <Save className="size-3.5 mr-1" />{isSaving ? t('warehouses.routingSaving') : t('warehouses.routingSaveConfig')}
          </Button>
        </div>
      </div>

      {/* Global toggles */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="text-sm font-medium">{copy.splitOrder}</div>
            <p className="text-xs text-muted-foreground">{copy.splitOrderDesc}</p>
          </div>
          <Switch checked={localSplit} onCheckedChange={v => { setLocalSplit(v); markChanged(); }} />
        </div>
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="text-sm font-medium">{copy.defaultWarehouse}</div>
            <p className="text-xs text-muted-foreground">{copy.defaultWarehouseDesc}</p>
          </div>
          <select
            value={localDefault}
            onChange={e => { setLocalDefault(e.target.value); markChanged(); }}
            className="border rounded-md px-2 py-1.5 text-sm bg-background max-w-[160px]"
          >
            <option value="">{copy.none}</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.code} ({w.country})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fallback chain */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{copy.fallbackChain}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const wh = prompt('Enter warehouse ID to add to fallback chain:');
              if (!wh) return;
              setLocalFallback(prev => [...prev, wh]);
              markChanged();
            }}
          >
            <Plus className="size-3 mr-1" />{copy.add}
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {localFallback.length === 0 && <span className="text-xs text-muted-foreground">{copy.fallbackEmpty}</span>}
          {localFallback.map((whId, i) => (
            <div key={`${whId}-${i}`} className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-xs">
              <span className="text-muted-foreground">{i + 1}.</span>
              <span className="font-mono font-medium">{whId}</span>
              <button onClick={() => { setLocalFallback(prev => prev.filter((_, j) => j !== i)); markChanged(); }} className="ml-1 text-muted-foreground hover:text-destructive">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">{copy.rules}</span>
          <Button size="sm" variant="outline" onClick={openAddRule}>
            <Plus className="size-3.5 mr-1" />{copy.addRule}
          </Button>
        </div>

        {localRules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <GitBranch className="size-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{copy.noRules}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{copy.noRulesDesc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={openAddRule}>
                <Plus className="size-3.5 mr-1" />{copy.addFirstRule}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {localRules.map((rule, index) => {
              const targetWarehouse = warehouses.find(w => w.id === rule.warehouse_id);
              return (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 p-4 border rounded-lg ${rule.enabled ? '' : 'opacity-50'}`}
                >
                  {/* Priority drag handles */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveRule(index, -1)}
                      disabled={index === 0}
                      className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >▲</button>
                    <span className="text-[10px] text-center text-muted-foreground font-mono">#{rule.priority}</span>
                    <button
                      onClick={() => moveRule(index, 1)}
                      disabled={index === localRules.length - 1}
                      className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >▼</button>
                  </div>

                  {/* Rule details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{rule.name || `Rule ${index + 1}`}</span>
                      <Badge variant="outline" className="text-xs">
                        → {targetWarehouse?.code ?? rule.warehouse_id}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{conditionSummary(rule)}</p>
                  </div>

                  {/* Enabled toggle */}
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={v => {
                      setLocalRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: v } : r));
                      markChanged();
                    }}
                  />

                  <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditRule(rule)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Rule Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={v => { if (!v) setEditingRule(null); setEditDialogOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{localRules.find(r => r.id === editingRule?.id) ? 'Edit Rule' : 'Add Routing Rule'}</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Rule Name</label>
                  <Input
                    value={editingRule.name}
                    onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                    placeholder="e.g. Heavy Items → FBA"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority</label>
                  <Input
                    type="number"
                    min={1}
                    value={editingRule.priority}
                    onChange={e => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Target Warehouse</label>
                <select
                  value={editingRule.warehouse_id}
                  onChange={e => setEditingRule({ ...editingRule, warehouse_id: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">— Select warehouse —</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.code} ({w.name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Conditions</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Max Weight (g)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 2000"
                      value={editingRule.conditions.max_weight_g ?? ''}
                      onChange={e => setEditingRule({
                        ...editingRule,
                        conditions: { ...editingRule.conditions, max_weight_g: e.target.value ? parseInt(e.target.value) : undefined },
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Max Value (JPY)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 10000"
                      value={editingRule.conditions.max_value_jpy ?? ''}
                      onChange={e => setEditingRule({
                        ...editingRule,
                        conditions: { ...editingRule.conditions, max_value_jpy: e.target.value ? parseInt(e.target.value) : undefined },
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Min Quantity</label>
                    <Input
                      type="number"
                      placeholder="e.g. 1"
                      value={editingRule.conditions.min_quantity ?? ''}
                      onChange={e => setEditingRule({
                        ...editingRule,
                        conditions: { ...editingRule.conditions, min_quantity: e.target.value ? parseInt(e.target.value) : undefined },
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Max Quantity</label>
                    <Input
                      type="number"
                      placeholder="e.g. 10"
                      value={editingRule.conditions.max_quantity ?? ''}
                      onChange={e => setEditingRule({
                        ...editingRule,
                        conditions: { ...editingRule.conditions, max_quantity: e.target.value ? parseInt(e.target.value) : undefined },
                      })}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-xs text-muted-foreground">Channels (multi-select)</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {CHANNEL_OPTIONS.map(ch => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => {
                          const cur = editingRule.conditions.channels ?? [];
                          const next = cur.includes(ch) ? cur.filter(c => c !== ch) : [...cur, ch];
                          setEditingRule({ ...editingRule, conditions: { ...editingRule.conditions, channels: next } });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${(editingRule.conditions.channels ?? []).includes(ch) ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-transparent'}`}
                      >{ch}</button>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-xs text-muted-foreground">Countries (multi-select)</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {COUNTRY_OPTIONS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const cur = editingRule.conditions.countries ?? [];
                          const next = cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c];
                          setEditingRule({ ...editingRule, conditions: { ...editingRule.conditions, countries: next } });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${(editingRule.conditions.countries ?? []).includes(c) ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-transparent'}`}
                      >{c}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Fallback Warehouse ID (optional)</label>
                <Input
                  value={editingRule.fallback ?? ''}
                  onChange={e => setEditingRule({ ...editingRule, fallback: e.target.value || undefined })}
                  placeholder="If this rule matches but warehouse is unavailable"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveEditedRule}>
                  <Check className="size-3.5 mr-1" />
                  {localRules.find(r => r.id === editingRule.id) ? 'Save Rule' : 'Add Rule'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="Reset routing config?"
        description="This clears all local rules, fallback settings, and split-order behavior for this warehouse."
        confirmText="Reset Config"
        cancelText="Keep Config"
        variant="destructive"
        onConfirm={handleReset}
      />
    </div>
  );
}
