import { useMemo, useState } from 'react';
import { Building2, Globe2, Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from 'lucide-react';
import { PageHeader } from '@/components/system/PageHeader';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { DataTable, type Column } from '@/components/system/DataTable';
import { EmptyState } from '@/components/system/EmptyState';
import { FiltersBar } from '@/components/system/FiltersBar';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useInitialLoading } from '@/hooks/use-initial-loading';
import { WarehouseCapabilityBadges } from '@/components/inventory/WarehouseCapabilityBadge';
import { WarehouseStatusBadge } from '@/components/inventory/WarehouseStatusBadge';
import { WarehouseTypeBadge } from '@/components/inventory/WarehouseTypeBadge';
import {
  getWarehouses, addWarehouse, updateWarehouse, deleteWarehouse,
  type Warehouse, type WarehouseType, type WarehouseStatus,
} from '@/lib/warehouse-store';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDate, formatMessage } from '@/lib/i18n/format';

const COUNTRIES = ['JP', 'SG', 'MY', 'VN', 'TH', 'US', 'CN', 'KR', 'TW', 'ID'];
const COUNTRY_FLAGS: Record<string, string> = {
  JP: '🇯🇵', SG: '🇸🇬', MY: '🇲🇾', VN: '🇻🇳', TH: '🇹🇭', US: '🇺🇸', CN: '🇨🇳', KR: '🇰🇷', TW: '🇹🇼', ID: '🇮🇩',
};

interface WarehouseFormValues {
  code: string;
  name: string;
  country: string;
  type: WarehouseType;
  status: WarehouseStatus;
  capabilities: string;
}

const EMPTY_FORM_VALUES: WarehouseFormValues = {
  code: '',
  name: '',
  country: 'JP',
  type: 'internal',
  status: 'active',
  capabilities: '',
};

export default function Warehouses() {
  const { locale, t } = useI18n();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(getWarehouses());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [warehousePendingDelete, setWarehousePendingDelete] = useState<Warehouse | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const isInitialLoading = useInitialLoading();

  const copy = {
    added: locale === 'ja-JP' ? '倉庫を追加しました' : locale === 'vi-VN' ? 'Đã thêm nhà kho' : 'Warehouse added',
    updated: locale === 'ja-JP' ? '倉庫を更新しました' : locale === 'vi-VN' ? 'Đã cập nhật nhà kho' : 'Warehouse updated',
    deleted: locale === 'ja-JP' ? '倉庫を削除しました' : locale === 'vi-VN' ? 'Đã xóa nhà kho' : 'Warehouse deleted',
    updatedDesc: locale === 'ja-JP' ? '{name} を更新しました。' : locale === 'vi-VN' ? 'Đã cập nhật {name}.' : '{name} has been updated.',
    createdDesc: locale === 'ja-JP' ? '{name} を作成しました。' : locale === 'vi-VN' ? 'Đã tạo {name}.' : '{name} has been created.',
    removedDesc: locale === 'ja-JP' ? '{name} を削除しました。' : locale === 'vi-VN' ? 'Đã xóa {name}.' : '{name} has been removed.',
    visibleWarehouses: locale === 'ja-JP' ? '表示中の倉庫' : locale === 'vi-VN' ? 'Nhà kho đang hiển thị' : 'Visible Warehouses',
    visibleMeta: locale === 'ja-JP' ? '現在の検索・フィルター結果' : locale === 'vi-VN' ? 'Theo tìm kiếm và bộ lọc hiện tại' : 'Current view after search and filters',
    activeNodes: locale === 'ja-JP' ? '稼働ノード' : locale === 'vi-VN' ? 'Node hoạt động' : 'Active Nodes',
    activeNodesMeta: locale === 'ja-JP' ? '現在ルーティング可能な倉庫' : locale === 'vi-VN' ? 'Kho hiện sẵn sàng cho routing' : 'Warehouses currently available for routing',
    countryCoverage: locale === 'ja-JP' ? '対応国数' : locale === 'vi-VN' ? 'Phạm vi quốc gia' : 'Country Coverage',
    countryCoverageMeta: locale === 'ja-JP' ? 'このビュー内の稼働国数' : locale === 'vi-VN' ? 'Số quốc gia vận hành trong màn này' : 'Distinct operating countries in this view',
    marketplaceNodes: locale === 'ja-JP' ? 'マーケットプレイスノード' : locale === 'vi-VN' ? 'Node marketplace' : 'Marketplace Nodes',
    marketplaceNodesMeta: locale === 'ja-JP' ? 'FBA・FBS・仮想倉庫エンドポイント' : locale === 'vi-VN' ? 'Điểm cuối FBA, FBS và kho ảo' : 'FBA, FBS, and virtual fulfillment endpoints',
    allStatuses: locale === 'ja-JP' ? 'すべてのステータス' : locale === 'vi-VN' ? 'Tất cả trạng thái' : 'All Statuses',
    syncing: locale === 'ja-JP' ? '同期中' : locale === 'vi-VN' ? 'Đang đồng bộ' : 'Syncing',
    virtual: locale === 'ja-JP' ? '仮想' : locale === 'vi-VN' ? 'Ảo' : 'Virtual',
    resultCount: locale === 'ja-JP' ? '{count} 件の倉庫を表示中' : locale === 'vi-VN' ? '{count} nhà kho trong màn hiện tại' : '{count} warehouse{suffix} in view',
    noAddress: locale === 'ja-JP' ? '物理住所が設定されていません' : locale === 'vi-VN' ? 'Chưa cấu hình địa chỉ thực tế' : 'No physical address configured',
    codeLabel: locale === 'ja-JP' ? 'コード' : locale === 'vi-VN' ? 'Mã' : 'Code',
    countryLabel: locale === 'ja-JP' ? '国' : locale === 'vi-VN' ? 'Quốc gia' : 'Country',
    nameLabel: locale === 'ja-JP' ? '名前' : locale === 'vi-VN' ? 'Tên' : 'Name',
    warehouseName: locale === 'ja-JP' ? '倉庫名' : locale === 'vi-VN' ? 'Tên nhà kho' : 'Warehouse name',
    statusLabel: locale === 'ja-JP' ? 'ステータス' : locale === 'vi-VN' ? 'Trạng thái' : 'Status',
    capabilities: locale === 'ja-JP' ? '機能' : locale === 'vi-VN' ? 'Năng lực' : 'Capabilities',
    capabilitiesHint: locale === 'ja-JP' ? 'ルーティングや運用に使う機能をカンマ区切りで入力します。' : locale === 'vi-VN' ? 'Nhập các capability bằng dấu phẩy để phục vụ routing và vận hành.' : 'Comma-separated capabilities for routing and ops.',
    dialogDesc: locale === 'ja-JP'
      ? '倉庫ノードの基本情報、ステータス、機能を更新します。'
      : locale === 'vi-VN'
        ? 'Cập nhật thông tin cơ bản, trạng thái và capability của node kho.'
        : 'Update the warehouse node basics, status, and operating capabilities.',
    saveChanges: locale === 'ja-JP' ? '変更を保存' : locale === 'vi-VN' ? 'Lưu thay đổi' : 'Save Changes',
    noWarehousesConfigured: locale === 'ja-JP' ? 'まだ倉庫がありません' : locale === 'vi-VN' ? 'Chưa có nhà kho nào' : 'No warehouses configured yet',
    noWarehousesConfiguredDesc: locale === 'ja-JP' ? '最初の倉庫を追加して、在庫とルーティングを管理しましょう。' : locale === 'vi-VN' ? 'Hãy thêm nhà kho đầu tiên để bắt đầu quản lý tồn kho và routing.' : 'Add your first warehouse to start routing and inventory coordination.',
    noWarehousesFiltered: locale === 'ja-JP' ? 'この条件に一致する倉庫はありません' : locale === 'vi-VN' ? 'Không có nhà kho nào khớp với bộ lọc này' : 'No warehouses match this view',
    noWarehousesFilteredDesc: locale === 'ja-JP' ? '現在の検索やフィルターをクリアしてみてください。' : locale === 'vi-VN' ? 'Hãy xóa bộ lọc hiện tại để xem thêm node kho.' : 'Clear the current filters to see more warehouse nodes.',
    deleteTitle: locale === 'ja-JP' ? '倉庫を削除しますか？' : locale === 'vi-VN' ? 'Xóa nhà kho này?' : 'Delete warehouse?',
    deleteDesc: locale === 'ja-JP' ? 'このデモセッションから {name} を削除します。' : locale === 'vi-VN' ? 'Thao tác này sẽ xóa {name} khỏi phiên demo hiện tại.' : 'This will remove {name} from the current demo session.',
    deleteConfirm: locale === 'ja-JP' ? '倉庫を削除' : locale === 'vi-VN' ? 'Xóa nhà kho' : 'Delete Warehouse',
    keepWarehouse: locale === 'ja-JP' ? '保持する' : locale === 'vi-VN' ? 'Giữ lại' : 'Keep Warehouse',
  } as const;

  const form = useForm<WarehouseFormValues>({
    defaultValues: EMPTY_FORM_VALUES,
  });

  function refresh() {
    setWarehouses(getWarehouses());
  }

  function resetFormState() {
    setEditingId(null);
    form.reset(EMPTY_FORM_VALUES);
  }

  function onSubmit(values: WarehouseFormValues) {
    const capabilities = values.capabilities.split(',').map((item) => item.trim()).filter(Boolean);

    if (editingId) {
      updateWarehouse(editingId, {
        code: values.code.toUpperCase(),
        name: values.name,
        country: values.country,
        type: values.type,
        status: values.status,
        capabilities,
      });
      toast({ title: copy.updated, description: formatMessage(copy.updatedDesc, { name: values.name }) });
    } else {
      addWarehouse({
        code: values.code.toUpperCase(),
        name: values.name,
        country: values.country,
        type: values.type,
        status: values.status,
        capabilities,
        address: null,
        is_virtual: values.type === 'virtual',
      });
      toast({ title: copy.added, description: formatMessage(copy.createdDesc, { name: values.name }) });
    }

    refresh();
    setOpen(false);
    resetFormState();
  }

  function handleEdit(warehouse: Warehouse) {
    setEditingId(warehouse.id);
    form.reset({
      code: warehouse.code,
      name: warehouse.name,
      country: warehouse.country,
      type: warehouse.type,
      status: warehouse.status,
      capabilities: warehouse.capabilities.join(', '),
    });
    setOpen(true);
  }

  function handleDelete(warehouse: Warehouse) {
    deleteWarehouse(warehouse.id);
    refresh();
    toast({ title: copy.deleted, description: formatMessage(copy.removedDesc, { name: warehouse.name }) });
    setWarehousePendingDelete(null);
  }

  function applyFilters(items: Warehouse[], overrides?: {
    search?: string;
    status?: string;
    type?: string;
  }) {
    const activeSearch = (overrides?.search ?? search).trim().toLowerCase();
    const activeStatus = overrides?.status ?? statusFilter;
    const activeType = overrides?.type ?? typeFilter;

    return items.filter((warehouse) => {
      const matchesSearch = !activeSearch || [
        warehouse.code,
        warehouse.name,
        warehouse.country,
        warehouse.address ?? '',
        warehouse.type,
        warehouse.status,
        ...warehouse.capabilities,
      ].some((value) => value.toLowerCase().includes(activeSearch));

      const matchesStatus = !activeStatus || warehouse.status === activeStatus;
      const matchesType = !activeType || warehouse.type === activeType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }

  const filteredWarehouses = useMemo(
    () => applyFilters(warehouses),
    [warehouses, search, statusFilter, typeFilter],
  );

  const statusCounts = useMemo(() => ({
    all: applyFilters(warehouses, { status: '' }).length,
    active: applyFilters(warehouses, { status: 'active' }).length,
    syncing: applyFilters(warehouses, { status: 'syncing' }).length,
    inactive: applyFilters(warehouses, { status: 'inactive' }).length,
  }), [warehouses, search, typeFilter]);

  const typeCounts = useMemo(() => ({
    internal: applyFilters(warehouses, { type: 'internal' }).length,
    fba: applyFilters(warehouses, { type: 'fba' }).length,
    fbs: applyFilters(warehouses, { type: 'fbs' }).length,
    '3pl': applyFilters(warehouses, { type: '3pl' }).length,
    virtual: applyFilters(warehouses, { type: 'virtual' }).length,
  }), [warehouses, search, statusFilter]);

  const coverageCount = new Set(filteredWarehouses.map((warehouse) => warehouse.country)).size;
  const activeCount = filteredWarehouses.filter((warehouse) => warehouse.status === 'active').length;
  const marketplaceNodeCount = filteredWarehouses.filter((warehouse) =>
    warehouse.type === 'fba' || warehouse.type === 'fbs' || warehouse.type === 'virtual',
  ).length;

  const columns: Column<Warehouse>[] = [
    {
      header: t('warehouses.colCode'),
      className: 'min-w-[150px]',
      cell: (warehouse) => (
        <div className="min-w-0">
          <div className="font-mono text-sm font-semibold text-foreground">{warehouse.code}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {COUNTRY_FLAGS[warehouse.country] ?? '🌐'} {warehouse.country}
          </div>
        </div>
      ),
    },
    {
      header: t('warehouses.colName'),
      className: 'min-w-[250px]',
      cell: (warehouse) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{warehouse.name}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {warehouse.address ?? copy.noAddress}
          </div>
        </div>
      ),
    },
    {
      header: t('warehouses.colType'),
      className: 'min-w-[130px]',
      cell: (warehouse) => <WarehouseTypeBadge type={warehouse.type} />,
    },
    {
      header: copy.capabilities,
      className: 'min-w-[220px]',
      cell: (warehouse) => <WarehouseCapabilityBadges capabilities={warehouse.capabilities} />,
    },
    {
      header: t('warehouses.colStatus'),
      className: 'min-w-[120px]',
      cell: (warehouse) => <WarehouseStatusBadge status={warehouse.status} />,
    },
    {
      header: t('inventory.colUpdated'),
      className: 'min-w-[130px]',
      cell: (warehouse) => (
        <span className="text-sm text-muted-foreground">
          {formatLocalizedDate(locale, warehouse.updated_at)}
        </span>
      ),
    },
    {
      header: t('warehouses.colActions'),
      className: 'min-w-[110px]',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      cell: (warehouse) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label={`${t('common.edit')}: ${warehouse.code}`}
            onClick={() => handleEdit(warehouse)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-destructive hover:text-destructive"
            aria-label={`${t('common.delete')}: ${warehouse.code}`}
            onClick={() => setWarehousePendingDelete(warehouse)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader
        title={t('warehouses.pageTitle')}
        description={`${warehouses.length} · ${t('warehouses.pageDesc')}`}
        actions={
          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) resetFormState();
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  if (!editingId) form.reset(EMPTY_FORM_VALUES);
                }}
              >
                <Plus className="size-4" />
                {t('warehouses.addWarehouse')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>{editingId ? t('warehouses.editWarehouse') : t('warehouses.addWarehouse')}</DialogTitle>
                <DialogDescription>{copy.dialogDesc}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{copy.codeLabel} *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. CR-JP" {...field} className="uppercase font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{copy.countryLabel}</FormLabel>
                          <FormControl>
                            <select {...field} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                              {COUNTRIES.map((country) => (
                                <option key={country} value={country}>
                                  {COUNTRY_FLAGS[country]} {country}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>{copy.nameLabel} *</FormLabel>
                          <FormControl>
                          <Input placeholder={copy.warehouseName} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouses.colType')}</FormLabel>
                          <FormControl>
                            <select {...field} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                              <option value="internal">{t('warehouses.typeInHouse')}</option>
                              <option value="fba">FBA (Fulfillment by Amazon)</option>
                              <option value="fbs">FBS (Fulfillment by Shopee)</option>
                              <option value="3pl">{t('warehouses.type3pl')}</option>
                              <option value="virtual">{copy.virtual}</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{copy.statusLabel}</FormLabel>
                          <FormControl>
                            <select {...field} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                              <option value="active">{t('common.active')}</option>
                              <option value="syncing">{copy.syncing}</option>
                              <option value="inactive">{t('common.inactive')}</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="capabilities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{copy.capabilities}</FormLabel>
                        <FormControl>
                          <Input placeholder="pick_pack, cold_storage, cross_border" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">{copy.capabilitiesHint}</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit">
                      {editingId ? copy.saveChanges : t('warehouses.addWarehouse')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard
          label={copy.visibleWarehouses}
          value={filteredWarehouses.length}
          meta={copy.visibleMeta}
          icon={<WarehouseIcon className="size-4" />}
          tone="info"
        />
        <SummaryMetricCard
          label={copy.activeNodes}
          value={activeCount}
          meta={copy.activeNodesMeta}
          icon={<Building2 className="size-4" />}
          tone="success"
        />
        <SummaryMetricCard
          label={copy.countryCoverage}
          value={coverageCount}
          meta={copy.countryCoverageMeta}
          icon={<Globe2 className="size-4" />}
          tone="indigo"
        />
        <SummaryMetricCard
          label={copy.marketplaceNodes}
          value={marketplaceNodeCount}
          meta={copy.marketplaceNodesMeta}
          icon={<Plus className="size-4" />}
          tone="warning"
        />
      </div>

      <FiltersBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t('warehouses.searchPlaceholder'),
          onClear: () => setSearch(''),
        }}
        primaryFilters={{
          value: statusFilter,
          onChange: setStatusFilter,
          options: [
            { value: '', label: copy.allStatuses, count: statusCounts.all },
            { value: 'active', label: t('common.active'), count: statusCounts.active },
            { value: 'syncing', label: copy.syncing, count: statusCounts.syncing },
            { value: 'inactive', label: t('common.inactive'), count: statusCounts.inactive },
          ],
        }}
        secondaryFilters={{
          value: typeFilter,
          onChange: setTypeFilter,
          label: t('warehouses.colType'),
          options: [
            { value: '', label: t('warehouses.allTypes'), count: applyFilters(warehouses, { type: '' }).length },
            { value: 'internal', label: t('warehouses.typeInHouse'), count: typeCounts.internal },
            { value: 'fba', label: 'FBA', count: typeCounts.fba },
            { value: 'fbs', label: 'FBS', count: typeCounts.fbs },
            { value: '3pl', label: '3PL', count: typeCounts['3pl'] },
            { value: 'virtual', label: copy.virtual, count: typeCounts.virtual },
          ],
        }}
        resultCount={search || statusFilter || typeFilter
          ? formatMessage(copy.resultCount, {
              count: filteredWarehouses.length,
              suffix: locale === 'en-US' && filteredWarehouses.length !== 1 ? 's' : '',
            })
          : undefined}
        clearAll={search || statusFilter || typeFilter ? () => {
          setSearch('');
          setStatusFilter('');
          setTypeFilter('');
        } : undefined}
      />

      <DataTable
        columns={columns}
        data={filteredWarehouses}
        keyExtractor={(warehouse) => warehouse.id}
        isLoading={isInitialLoading}
        wrapperClassName="[&_table]:min-w-[980px]"
        emptyState={!isInitialLoading ? (
          <EmptyState
            title={search || statusFilter || typeFilter ? copy.noWarehousesFiltered : copy.noWarehousesConfigured}
            description={search || statusFilter || typeFilter
              ? copy.noWarehousesFilteredDesc
              : copy.noWarehousesConfiguredDesc}
            icon={<WarehouseIcon className="size-5" />}
            variant={search || statusFilter || typeFilter ? 'filtered' : 'empty'}
            action={search || statusFilter || typeFilter ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setTypeFilter('');
                }}
              >
                {t('common.clear')}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  resetFormState();
                  setOpen(true);
                }}
              >
                <Plus className="size-4" />
                {t('warehouses.addWarehouse')}
              </Button>
            )}
            className="min-h-[320px]"
          />
        ) : undefined}
        emptyTitle={search || statusFilter || typeFilter ? copy.noWarehousesFiltered : t('warehouses.noWarehouses')}
        emptyDescription={search || statusFilter || typeFilter
          ? copy.noWarehousesFilteredDesc
          : t('warehouses.addFirstWarehouse')}
        emptyVariant={search || statusFilter || typeFilter ? 'filtered' : 'empty'}
      />

      <ConfirmDialog
        open={!!warehousePendingDelete}
        onOpenChange={(openState) => {
          if (!openState) setWarehousePendingDelete(null);
        }}
        title={copy.deleteTitle}
        description={warehousePendingDelete
          ? formatMessage(copy.deleteDesc, { name: warehousePendingDelete.name })
          : undefined}
        confirmText={copy.deleteConfirm}
        cancelText={copy.keepWarehouse}
        variant="destructive"
        onConfirm={() => {
          if (warehousePendingDelete) {
            handleDelete(warehousePendingDelete);
          }
        }}
      />
    </div>
  );
}
