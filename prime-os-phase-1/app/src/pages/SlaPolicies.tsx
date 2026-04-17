import { useState } from 'react';
import {
  Plus, Shield, Clock, AlertTriangle, Check, Loader2, Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/system/PageHeader';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  useSlaPolicies, useCreateSlaPolicy, useUpdateSlaPolicy,
  useDeleteSlaPolicy, useToggleSlaPolicy,
} from '@/hooks/use-sla-policies';
import { CHANNEL_SLA_OPTIONS, PRIORITY_SLA_OPTIONS } from '@/lib/sla-policy-types';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatMessage } from '@/lib/i18n/format';

export default function SlaPolicies() {
  const { locale, t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [channelDraft, setChannelDraft] = useState(CHANNEL_SLA_OPTIONS[0].value);
  const [channelDaysDraft, setChannelDaysDraft] = useState('2');
  const [priorityDraft, setPriorityDraft] = useState(PRIORITY_SLA_OPTIONS[0].value);
  const [priorityDaysDraft, setPriorityDaysDraft] = useState('1');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const { data: policies = [], isLoading } = useSlaPolicies();
  const createMut = useCreateSlaPolicy();
  const updateMut = useUpdateSlaPolicy();
  const deleteMut = useDeleteSlaPolicy();
  const toggleMut = useToggleSlaPolicy();
  const isSubmitting = createMut.isPending || updateMut.isPending;
  const copy = {
    pageTitle: locale === 'ja-JP' ? 'SLAポリシー' : locale === 'vi-VN' ? 'Chính sách SLA' : 'SLA Policies',
    pageDesc: locale === 'ja-JP' ? '{count} 件のポリシーを設定済み' : locale === 'vi-VN' ? 'Đã cấu hình {count} chính sách' : '{count} policy {suffix} configured',
    addPolicy: locale === 'ja-JP' ? 'SLAポリシーを追加' : locale === 'vi-VN' ? 'Thêm chính sách SLA' : 'Add SLA Policy',
    loading: locale === 'ja-JP' ? '読み込み中...' : locale === 'vi-VN' ? 'Đang tải...' : 'Loading...',
    emptyTitle: locale === 'ja-JP' ? 'SLAポリシーはまだありません' : locale === 'vi-VN' ? 'Chưa có chính sách SLA nào' : 'No SLA policies yet',
    emptyDesc: locale === 'ja-JP' ? 'チャネルや優先度ごとの出荷期限を管理するために最初のポリシーを作成してください。' : locale === 'vi-VN' ? 'Hãy tạo chính sách đầu tiên để quản lý hạn giao theo kênh và mức ưu tiên.' : 'Create your first SLA policy to manage shipment deadlines by channel and priority.',
    createPolicy: locale === 'ja-JP' ? 'ポリシーを作成' : locale === 'vi-VN' ? 'Tạo chính sách' : 'Create Policy',
    active: locale === 'ja-JP' ? '有効' : locale === 'vi-VN' ? 'Đang bật' : 'Active',
    inactive: locale === 'ja-JP' ? '無効' : locale === 'vi-VN' ? 'Đang tắt' : 'Inactive',
    default: locale === 'ja-JP' ? '標準' : locale === 'vi-VN' ? 'Mặc định' : 'Default',
    channels: locale === 'ja-JP' ? 'チャネル' : locale === 'vi-VN' ? 'Kênh' : 'Channels',
    priority: locale === 'ja-JP' ? '優先度' : locale === 'vi-VN' ? 'Ưu tiên' : 'Priority',
    updating: locale === 'ja-JP' ? '更新中...' : locale === 'vi-VN' ? 'Đang cập nhật...' : 'Updating...',
    on: locale === 'ja-JP' ? 'オン' : locale === 'vi-VN' ? 'Bật' : 'On',
    off: locale === 'ja-JP' ? 'オフ' : locale === 'vi-VN' ? 'Tắt' : 'Off',
    edit: locale === 'ja-JP' ? '編集' : locale === 'vi-VN' ? 'Chỉnh sửa' : 'Edit',
    editTitle: locale === 'ja-JP' ? 'SLAポリシーを編集' : locale === 'vi-VN' ? 'Sửa chính sách SLA' : 'Edit SLA Policy',
    createTitle: locale === 'ja-JP' ? 'SLAポリシーを作成' : locale === 'vi-VN' ? 'Tạo chính sách SLA' : 'Create SLA Policy',
    dialogDesc: locale === 'ja-JP' ? 'デフォルトの出荷期限を設定し、本当に必要なチャネルや優先度だけ例外を追加してください。' : locale === 'vi-VN' ? 'Thiết lập hạn giao mặc định, sau đó chỉ thêm các ngoại lệ thật sự cần cho kênh hoặc mức ưu tiên.' : 'Set a default shipment deadline, then add only the channel or priority exceptions that truly need a different SLA.',
    policyName: locale === 'ja-JP' ? 'ポリシー名 *' : locale === 'vi-VN' ? 'Tên chính sách *' : 'Policy Name *',
    policyNamePlaceholder: locale === 'ja-JP' ? '例: 標準 3 日 SLA' : locale === 'vi-VN' ? 'VD: SLA tiêu chuẩn 3 ngày' : 'e.g. Standard 3-Day SLA',
    policyNameDesc: locale === 'ja-JP' ? '運用チームがすぐ識別できる名前にしてください。' : locale === 'vi-VN' ? 'Đặt tên để team vận hành nhận ra nhanh.' : 'Use a name your operations team can recognize quickly.',
    policyNameRequired: locale === 'ja-JP' ? 'ポリシー名は必須です' : locale === 'vi-VN' ? 'Tên chính sách là bắt buộc' : 'Policy name is required',
    description: locale === 'ja-JP' ? '説明' : locale === 'vi-VN' ? 'Mô tả' : 'Description',
    optionalDescription: locale === 'ja-JP' ? '任意の説明' : locale === 'vi-VN' ? 'Mô tả tùy chọn' : 'Optional description',
    descriptionDesc: locale === 'ja-JP' ? 'いつ使うポリシーかを短く示してください。' : locale === 'vi-VN' ? 'Giữ ngắn gọn, tập trung vào khi nào nên dùng policy này.' : 'Keep this short and focused on when the policy should be used.',
    defaultDeadline: locale === 'ja-JP' ? '標準期限 (日) *' : locale === 'vi-VN' ? 'Hạn mặc định (ngày) *' : 'Default Deadline (days) *',
    defaultDeadlineDesc: locale === 'ja-JP' ? '例外がない場合の基本約束です。' : locale === 'vi-VN' ? 'Đây là cam kết cơ bản khi không có override.' : 'This is the baseline promise when no override applies.',
    defaultDeadlineRequired: locale === 'ja-JP' ? '標準期限は必須です' : locale === 'vi-VN' ? 'Hạn mặc định là bắt buộc' : 'Default deadline is required',
    defaultDeadlineNegative: locale === 'ja-JP' ? '標準期限はマイナスにできません' : locale === 'vi-VN' ? 'Hạn mặc định không thể âm' : 'Default deadline cannot be negative',
    channelOverrides: locale === 'ja-JP' ? 'チャネル別例外' : locale === 'vi-VN' ? 'Override theo kênh' : 'Channel Overrides',
    channelOverridesDesc: locale === 'ja-JP' ? 'マーケットプレイスごとに標準 SLA と異なる約束が必要な場合に使用します。' : locale === 'vi-VN' ? 'Dùng khi một marketplace cần cam kết khác so với SLA mặc định.' : 'Use this when a marketplace needs a different commitment than the default SLA.',
    priorityOverrides: locale === 'ja-JP' ? '優先度別例外' : locale === 'vi-VN' ? 'Override theo ưu tiên' : 'Priority Overrides',
    priorityOverridesDesc: locale === 'ja-JP' ? '速達や重要出荷など、特別な約束レベルに使います。' : locale === 'vi-VN' ? 'Dùng cho các mức cam kết đặc biệt như giao nhanh hoặc xử lý khẩn.' : 'Use this for special promise levels like express or critical shipment handling.',
    days: locale === 'ja-JP' ? '日数' : locale === 'vi-VN' ? 'Ngày' : 'Days',
    add: locale === 'ja-JP' ? '追加' : locale === 'vi-VN' ? 'Thêm' : 'Add',
    remove: locale === 'ja-JP' ? '削除' : locale === 'vi-VN' ? 'Xóa' : 'Remove',
    noChannelOverrides: locale === 'ja-JP' ? 'チャネル別例外なし' : locale === 'vi-VN' ? 'Chưa có override theo kênh' : 'No channel overrides',
    noPriorityOverrides: locale === 'ja-JP' ? '優先度別例外なし' : locale === 'vi-VN' ? 'Chưa có override theo ưu tiên' : 'No priority overrides',
    allChannelOverridesAdded: locale === 'ja-JP' ? 'すべてのチャネル例外は追加済みです' : locale === 'vi-VN' ? 'Đã thêm đủ override cho mọi kênh' : 'All channel overrides already added',
    allPriorityOverridesAdded: locale === 'ja-JP' ? 'すべての優先度例外は追加済みです' : locale === 'vi-VN' ? 'Đã thêm đủ override cho mọi mức ưu tiên' : 'All priority overrides already added',
    channelOverrideInvalid: locale === 'ja-JP' ? 'チャネル例外の日数は 0 以上にしてください。' : locale === 'vi-VN' ? 'Số ngày override theo kênh phải từ 0 trở lên.' : 'Channel override days must be zero or greater.',
    priorityOverrideInvalid: locale === 'ja-JP' ? '優先度例外の日数は 0 以上にしてください。' : locale === 'vi-VN' ? 'Số ngày override theo ưu tiên phải từ 0 trở lên.' : 'Priority override days must be zero or greater.',
    channelOverrideExists: locale === 'ja-JP' ? 'このチャネル例外はすでに存在します。' : locale === 'vi-VN' ? 'Override cho kênh này đã tồn tại.' : 'That channel override already exists.',
    priorityOverrideExists: locale === 'ja-JP' ? 'この優先度例外はすでに存在します。' : locale === 'vi-VN' ? 'Override cho mức ưu tiên này đã tồn tại.' : 'That priority override already exists.',
    saveChanges: locale === 'ja-JP' ? '変更を保存' : locale === 'vi-VN' ? 'Lưu thay đổi' : 'Save Changes',
    deleteTitle: locale === 'ja-JP' ? 'SLAポリシーを削除しますか？' : locale === 'vi-VN' ? 'Xóa chính sách SLA này?' : 'Delete SLA policy?',
    deleteDesc: locale === 'ja-JP' ? 'この操作は元に戻せません。{name} は完全に削除されます。' : locale === 'vi-VN' ? 'Thao tác này không thể hoàn tác. {name} sẽ bị xóa vĩnh viễn.' : 'This action cannot be undone. {name} will be removed permanently.',
    deletePolicy: locale === 'ja-JP' ? 'ポリシーを削除' : locale === 'vi-VN' ? 'Xóa chính sách' : 'Delete Policy',
    deleting: locale === 'ja-JP' ? '削除中...' : locale === 'vi-VN' ? 'Đang xóa...' : 'Deleting...',
    keepPolicy: locale === 'ja-JP' ? '保持する' : locale === 'vi-VN' ? 'Giữ lại' : 'Keep Policy',
  } as const;

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      tier_default_days: 3,
      channel_overrides: {} as Record<string, number>,
      priority_overrides: {} as Record<string, number>,
    },
  });

  function openCreate() {
    setEditingId(null);
    form.reset({ name: '', description: '', tier_default_days: 3, channel_overrides: {}, priority_overrides: {} });
    setOverrideError(null);
    setChannelDraft(CHANNEL_SLA_OPTIONS[0].value);
    setChannelDaysDraft('2');
    setPriorityDraft(PRIORITY_SLA_OPTIONS[0].value);
    setPriorityDaysDraft('1');
    setDialogOpen(true);
  }

  function openEdit(p: { id: string; name: string; description?: string; tier_default_days: number; overrides: { channel?: Record<string, number>; priority?: Record<string, number> } }) {
    const nextChannelDraft = CHANNEL_SLA_OPTIONS.find((option) => p.overrides.channel?.[option.value] === undefined)?.value
      ?? CHANNEL_SLA_OPTIONS[0].value;
    const nextPriorityDraft = PRIORITY_SLA_OPTIONS.find((option) => p.overrides.priority?.[option.value] === undefined)?.value
      ?? PRIORITY_SLA_OPTIONS[0].value;

    setEditingId(p.id);
    form.reset({
      name: p.name,
      description: p.description ?? '',
      tier_default_days: p.tier_default_days,
      channel_overrides: p.overrides.channel ?? {},
      priority_overrides: p.overrides.priority ?? {},
    });
    setOverrideError(null);
    setChannelDraft(nextChannelDraft);
    setPriorityDraft(nextPriorityDraft);
    setDialogOpen(true);
  }

  async function onSubmit(values: ReturnType<typeof form.getValues>) {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || '',
      tier_default_days: values.tier_default_days,
      overrides: {
        channel: values.channel_overrides,
        priority: values.priority_overrides,
      },
      is_active: true,
    };

    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, ...payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setDialogOpen(false);
      setEditingId(null);
      setOverrideError(null);
    } catch {
      // Toasts are handled inside the mutation hooks.
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id);
    try {
      await toggleMut.mutateAsync({ id, is_active: !current });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMut.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch {
      // Toasts are handled inside the mutation hooks.
    }
  }

  function parseOverrideDays(value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }

    return Math.floor(parsed);
  }

  function handleAddChannelOverride() {
    const days = parseOverrideDays(channelDaysDraft);
    if (days == null) {
      setOverrideError(copy.channelOverrideInvalid);
      return;
    }

    const current = form.getValues('channel_overrides');
    if (current[channelDraft] !== undefined) {
      setOverrideError(copy.channelOverrideExists);
      return;
    }

    const nextOverrides = { ...current, [channelDraft]: days };
    form.setValue('channel_overrides', nextOverrides, { shouldDirty: true });
    const nextOption = CHANNEL_SLA_OPTIONS.find((option) => nextOverrides[option.value] === undefined);
    if (nextOption) {
      setChannelDraft(nextOption.value);
    }
    setOverrideError(null);
  }

  function handleAddPriorityOverride() {
    const days = parseOverrideDays(priorityDaysDraft);
    if (days == null) {
      setOverrideError(copy.priorityOverrideInvalid);
      return;
    }

    const current = form.getValues('priority_overrides');
    if (current[priorityDraft] !== undefined) {
      setOverrideError(copy.priorityOverrideExists);
      return;
    }

    const nextOverrides = { ...current, [priorityDraft]: days };
    form.setValue('priority_overrides', nextOverrides, { shouldDirty: true });
    const nextOption = PRIORITY_SLA_OPTIONS.find((option) => nextOverrides[option.value] === undefined);
    if (nextOption) {
      setPriorityDraft(nextOption.value);
    }
    setOverrideError(null);
  }

  const channelOverrideEntries = Object.entries(form.watch('channel_overrides') ?? {});
  const priorityOverrideEntries = Object.entries(form.watch('priority_overrides') ?? {});
  const availableChannelOptions = CHANNEL_SLA_OPTIONS.filter(
    (option) => !channelOverrideEntries.some(([key]) => key === option.value),
  );
  const availablePriorityOptions = PRIORITY_SLA_OPTIONS.filter(
    (option) => !priorityOverrideEntries.some(([key]) => key === option.value),
  );
  const deleteTarget = policies.find((policy) => policy.id === deleteConfirmId) ?? null;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader
        title={copy.pageTitle}
        description={formatMessage(copy.pageDesc, {
          count: policies.length,
          suffix: policies.length !== 1 ? 'policies' : 'policy',
        })}
        actions={
          <Button onClick={openCreate} disabled={isSubmitting}>
            <Plus className="size-4 mr-2" />{copy.addPolicy}
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{copy.loading}</div>
      ) : policies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Shield className="size-12 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-muted-foreground">{copy.emptyTitle}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">{copy.emptyDesc}</p>
            </div>
            <Button variant="outline" onClick={openCreate} disabled={isSubmitting}>
              <Plus className="size-4 mr-2" />{copy.createPolicy}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy) => (
            <Card key={policy.id} className={policy.is_active ? '' : 'opacity-60'}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">{policy.name}</h3>
                      <Badge variant={policy.is_active ? 'default' : 'secondary'} className="text-xs">
                        {policy.is_active ? copy.active : copy.inactive}
                      </Badge>
                    </div>
                    {policy.description && (
                      <p className="text-sm text-muted-foreground mb-3">{policy.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{copy.default}:</span>
                        <Badge variant="outline" className="text-xs">{policy.tier_default_days}d</Badge>
                      </div>
                      {Object.keys(policy.overrides.channel ?? {}).length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="size-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">{copy.channels}:</span>
                          {Object.entries(policy.overrides.channel ?? {}).map(([ch, days]) => (
                            <Badge key={ch} variant="outline" className="text-xs">{ch} {days}d</Badge>
                          ))}
                        </div>
                      )}
                      {Object.keys(policy.overrides.priority ?? {}).length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Check className="size-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">{copy.priority}:</span>
                          {Object.entries(policy.overrides.priority ?? {}).map(([p, days]) => (
                            <Badge key={p} variant="outline" className="text-xs">{p} {days}d</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {togglingId === policy.id ? copy.updating : policy.is_active ? copy.on : copy.off}
                      </span>
                      <Switch
                        checked={policy.is_active}
                        onCheckedChange={() => handleToggle(policy.id, policy.is_active)}
                        disabled={togglingId === policy.id || deleteMut.isPending || isSubmitting}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(policy)}
                      disabled={isSubmitting || deleteMut.isPending || togglingId === policy.id}
                    >
                      {copy.edit}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-8"
                      onClick={() => setDeleteConfirmId(policy.id)}
                      disabled={deleteMut.isPending || isSubmitting || togglingId === policy.id}
                      aria-label={`Delete SLA policy ${policy.name}`}
                    >
                      {deleteMut.isPending && deleteConfirmId === policy.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingId(null);
            setOverrideError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? copy.editTitle : copy.createTitle}</DialogTitle>
            <DialogDescription>
              {copy.dialogDesc}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" rules={{ required: copy.policyNameRequired }} render={({ field }) => (
                <FormItem>
                  <FormLabel>{copy.policyName}</FormLabel>
                  <FormControl><Input placeholder={copy.policyNamePlaceholder} {...field} /></FormControl>
                  <FormDescription>{copy.policyNameDesc}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>{copy.description}</FormLabel>
                  <FormControl><Input placeholder={copy.optionalDescription} {...field} /></FormControl>
                  <FormDescription>{copy.descriptionDesc}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="tier_default_days"
                rules={{
                  required: copy.defaultDeadlineRequired,
                  min: { value: 0, message: copy.defaultDeadlineNegative },
                }}
                render={({ field }) => (
                <FormItem>
                  <FormLabel>{copy.defaultDeadline}</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                  <FormDescription>{copy.defaultDeadlineDesc}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Channel Overrides */}
              <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 p-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium">{copy.channelOverrides}</span>
                  <p className="text-xs text-muted-foreground">{copy.channelOverridesDesc}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={channelDraft}
                    onChange={(e) => { setChannelDraft(e.target.value); setOverrideError(null); }}
                    disabled={availableChannelOptions.length === 0 || isSubmitting}
                  >
                    {availableChannelOptions.length > 0 ? availableChannelOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    )) : (
                      <option value="">{copy.allChannelOverridesAdded}</option>
                    )}
                  </select>
                  <Input
                    type="number"
                    min="0"
                    value={channelDaysDraft}
                    onChange={(e) => { setChannelDaysDraft(e.target.value); setOverrideError(null); }}
                    placeholder={copy.days}
                    disabled={availableChannelOptions.length === 0 || isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddChannelOverride}
                    disabled={availableChannelOptions.length === 0 || isSubmitting}
                  >
                    <Plus className="size-3.5" />
                    {copy.add}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {channelOverrideEntries.map(([ch, days]) => (
                    <div key={ch} className="flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs">
                      <span className="font-medium">{ch}</span>
                      <span className="text-muted-foreground">{days}d</span>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = form.getValues('channel_overrides');
                          const next = { ...cur };
                          delete next[ch];
                          form.setValue('channel_overrides', next, { shouldDirty: true });
                        }}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        {copy.remove}
                      </button>
                    </div>
                  ))}
                  {channelOverrideEntries.length === 0 && (
                    <span className="text-xs text-muted-foreground">{copy.noChannelOverrides}</span>
                  )}
                </div>
              </div>

              {/* Priority Overrides */}
              <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 p-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium">{copy.priorityOverrides}</span>
                  <p className="text-xs text-muted-foreground">{copy.priorityOverridesDesc}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={priorityDraft}
                    onChange={(e) => { setPriorityDraft(e.target.value); setOverrideError(null); }}
                    disabled={availablePriorityOptions.length === 0 || isSubmitting}
                  >
                    {availablePriorityOptions.length > 0 ? availablePriorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    )) : (
                      <option value="">{copy.allPriorityOverridesAdded}</option>
                    )}
                  </select>
                  <Input
                    type="number"
                    min="0"
                    value={priorityDaysDraft}
                    onChange={(e) => { setPriorityDaysDraft(e.target.value); setOverrideError(null); }}
                    placeholder={copy.days}
                    disabled={availablePriorityOptions.length === 0 || isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddPriorityOverride}
                    disabled={availablePriorityOptions.length === 0 || isSubmitting}
                  >
                    <Plus className="size-3.5" />
                    {copy.add}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {priorityOverrideEntries.map(([p, days]) => (
                    <div key={p} className="flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs">
                      <span className="font-medium">{p}</span>
                      <span className="text-muted-foreground">{days}d</span>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = form.getValues('priority_overrides');
                          const next = { ...cur };
                          delete next[p];
                          form.setValue('priority_overrides', next, { shouldDirty: true });
                        }}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        {copy.remove}
                      </button>
                    </div>
                  ))}
                  {priorityOverrideEntries.length === 0 && (
                    <span className="text-xs text-muted-foreground">{copy.noPriorityOverrides}</span>
                  )}
                </div>
              </div>

              {overrideError && (
                <p className="text-sm font-medium text-destructive">{overrideError}</p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {editingId ? copy.saveChanges : copy.createPolicy}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title={copy.deleteTitle}
        description={deleteTarget ? formatMessage(copy.deleteDesc, { name: deleteTarget.name }) : undefined}
        confirmText={copy.deletePolicy}
        confirmingText={copy.deleting}
        cancelText={copy.keepPolicy}
        variant="destructive"
        isConfirming={deleteMut.isPending}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
      />
    </div>
  );
}
