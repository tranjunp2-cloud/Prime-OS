/**
 * FbaShipmentPanel — Inbound shipment management for FBA fulfillment flow
 *
 * FBA Flow:
 *   1. WORKING     — Plan created, items being prepared
 *   2. SHIPPING    — Shipped to Amazon FC
 *   3. RECEIVING   — Amazon is receiving at FC
 *   4. CLOSED      — Received and ready to sell
 *
 * Docs: https://developer-docs.amazon.com/amazon-shipping/docs/fulfillment-inbound-api-v2024-06-01-reference
 */

import { useState } from 'react';
import { Package, Truck, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  FBA_INBOUND_STATUS_LABELS,
  FBA_INBOUND_STATUS_COLORS,
  FBA_PREP_STATUS_LABELS,
  FBA_PREP_STATUS_COLORS,
  type FulfillmentJob,
  type FbaInboundStatus,
  type FbaPrepStatus,
} from '@/lib/fulfillment-types';
import { useI18n } from '@/lib/i18n/I18nContext';

interface FbaShipmentPanelProps {
  job: FulfillmentJob;
  isReadOnly?: boolean;
  onUpdatePrepStatus?: (status: FbaPrepStatus) => void;
  onSyncShipment?: () => void;
  onConfirmShipment?: (fulfillmentCenterId: string) => void;
  isSyncing?: boolean;
  isUpdating?: boolean;
}

const FC_OPTIONS = [
  { id: 'TYO22', label: 'TYO22 — Tokyo', country: 'JP' },
  { id: 'TPR2', label: 'TPR2 — Tokyo', country: 'JP' },
  { id: 'FSZ1', label: 'FSZ1 — Fujisawa', country: 'JP' },
  { id: 'KIX1', label: 'KIX1 — Osaka', country: 'JP' },
  { id: 'ITM1', label: 'ITM1 — Osaka Itm', country: 'JP' },
  { id: 'NRT1', label: 'NRT1 — Narita', country: 'JP' },
];

const PREP_STEPS: { status: FbaPrepStatus; label: string; description: string }[] = [
  { status: 'none', label: 'No Prep Required', description: 'Item ships as-is to Amazon FC' },
  { status: 'preparing', label: 'Preparing', description: 'Items are being inspected, sorted, or bundled' },
  { status: 'prepped', label: 'Prepped', description: 'Items have been prepped (polybagging, bubble wrap, etc.)' },
  { status: 'labelled', label: 'Labelled', description: 'FNSKU labels applied and ready for shipping' },
];

export function FbaShipmentPanel({
  job,
  isReadOnly = false,
  onUpdatePrepStatus,
  onSyncShipment,
  onConfirmShipment,
  isSyncing = false,
  isUpdating = false,
}: FbaShipmentPanelProps) {
  const [prepDialogOpen, setPrepDialogOpen] = useState(false);
  const [selectedPrep, setSelectedPrep] = useState<FbaPrepStatus>(job.fba_prep_status ?? 'none');
  const [fcDialogOpen, setFcDialogOpen] = useState(false);
  const [selectedFc, setSelectedFc] = useState(job.fulfillment_center_id ?? '');
  const [notes, setNotes] = useState('');
  const { locale } = useI18n();
  const copy = {
    'en-US': {
      inboundShipment: 'FBA Inbound Shipment',
      setPrepStatus: 'Set Prep Status',
      sync: 'Sync',
      noShipmentId: 'No shipment ID yet',
      fulfillmentCenter: 'Fulfillment Center',
      confirmShipment: 'Confirm Shipment',
      labelStepRequired: 'Label step required before confirming',
      shipmentCancelled: 'Shipment cancelled',
      readyToSell: 'Inventory received at FBA — ready to sell',
      prepDialogTitle: 'Set FBA Prep Status',
      prepDialogDescription: 'Update the preparation status for this inbound shipment.',
      cancel: 'Cancel',
      saving: 'Saving...',
      save: 'Save',
      confirmInboundTitle: 'Confirm Inbound Shipment',
      confirmInboundDescription: 'Tell Amazon the shipment is on its way to the Fulfillment Center. This updates the shipment status to SHIPPING.',
      destinationFc: 'Destination Fulfillment Center',
      selectFc: 'Select FC...',
      notes: 'Notes (optional)',
      notesPlaceholder: 'Carrier, tracking info, special instructions...',
      confirming: 'Confirming...',
      working: 'Working',
      shipping: 'Shipping',
      receiving: 'Receiving',
      closed: 'Closed',
      prepSteps: {
        none: ['No Prep Required', 'Item ships as-is to Amazon FC'],
        preparing: ['Preparing', 'Items are being inspected, sorted, or bundled'],
        prepped: ['Prepped', 'Items have been prepped (polybagging, bubble wrap, etc.)'],
        labelled: ['Labelled', 'FNSKU labels applied and ready for shipping'],
      },
    },
    'ja-JP': {
      inboundShipment: 'FBA入荷出荷',
      setPrepStatus: 'Prep状況を更新',
      sync: '同期',
      noShipmentId: '出荷IDはまだありません',
      fulfillmentCenter: 'フルフィルメントセンター',
      confirmShipment: '出荷を確定',
      labelStepRequired: '確定前にラベル工程が必要です',
      shipmentCancelled: '出荷はキャンセルされました',
      readyToSell: '在庫がFBAに入庫済みで、販売可能です',
      prepDialogTitle: 'FBA Prep状況を設定',
      prepDialogDescription: 'この入荷出荷の準備状況を更新します。',
      cancel: 'キャンセル',
      saving: '保存中...',
      save: '保存',
      confirmInboundTitle: '入荷出荷を確定',
      confirmInboundDescription: 'この出荷がフルフィルメントセンターへ向かっていることをAmazonへ通知します。ステータスは SHIPPING に更新されます。',
      destinationFc: '配送先フルフィルメントセンター',
      selectFc: 'FCを選択...',
      notes: 'メモ（任意）',
      notesPlaceholder: '配送会社、追跡情報、特記事項...',
      confirming: '確定中...',
      working: '作業中',
      shipping: '配送中',
      receiving: '受領中',
      closed: '完了',
      prepSteps: {
        none: ['Prep不要', '商品はそのままAmazon FCへ出荷されます'],
        preparing: ['準備中', '商品を検品・仕分け・同梱しています'],
        prepped: ['Prep完了', 'ポリ袋・緩衝材などの準備が完了しています'],
        labelled: ['ラベル済み', 'FNSKUラベル貼付済みで出荷準備完了です'],
      },
    },
    'vi-VN': {
      inboundShipment: 'Lô nhập FBA',
      setPrepStatus: 'Cập nhật trạng thái prep',
      sync: 'Đồng bộ',
      noShipmentId: 'Chưa có mã lô hàng',
      fulfillmentCenter: 'Trung tâm hoàn tất',
      confirmShipment: 'Xác nhận lô hàng',
      labelStepRequired: 'Cần hoàn tất bước dán nhãn trước khi xác nhận',
      shipmentCancelled: 'Lô hàng đã bị hủy',
      readyToSell: 'Hàng đã được nhận vào FBA và sẵn sàng bán',
      prepDialogTitle: 'Cập nhật trạng thái prep FBA',
      prepDialogDescription: 'Cập nhật trạng thái chuẩn bị cho lô nhập này.',
      cancel: 'Hủy',
      saving: 'Đang lưu...',
      save: 'Lưu',
      confirmInboundTitle: 'Xác nhận lô nhập',
      confirmInboundDescription: 'Thông báo cho Amazon rằng lô hàng đang được gửi tới trung tâm hoàn tất. Trạng thái sẽ chuyển sang SHIPPING.',
      destinationFc: 'Trung tâm hoàn tất đích',
      selectFc: 'Chọn FC...',
      notes: 'Ghi chú (không bắt buộc)',
      notesPlaceholder: 'Đơn vị vận chuyển, tracking, hướng dẫn đặc biệt...',
      confirming: 'Đang xác nhận...',
      working: 'Đang xử lý',
      shipping: 'Đang gửi',
      receiving: 'Đang nhận',
      closed: 'Hoàn tất',
      prepSteps: {
        none: ['Không cần prep', 'Sản phẩm được gửi thẳng tới Amazon FC'],
        preparing: ['Đang chuẩn bị', 'Sản phẩm đang được kiểm tra, phân loại hoặc đóng bộ'],
        prepped: ['Đã prep', 'Sản phẩm đã được prep như bọc túi, chèn chống sốc...'],
        labelled: ['Đã dán nhãn', 'Đã dán FNSKU và sẵn sàng gửi đi'],
      },
    },
  }[locale] ?? {
    inboundShipment: 'FBA Inbound Shipment',
    setPrepStatus: 'Set Prep Status',
    sync: 'Sync',
    noShipmentId: 'No shipment ID yet',
    fulfillmentCenter: 'Fulfillment Center',
    confirmShipment: 'Confirm Shipment',
    labelStepRequired: 'Label step required before confirming',
    shipmentCancelled: 'Shipment cancelled',
    readyToSell: 'Inventory received at FBA — ready to sell',
    prepDialogTitle: 'Set FBA Prep Status',
    prepDialogDescription: 'Update the preparation status for this inbound shipment.',
    cancel: 'Cancel',
    saving: 'Saving...',
    save: 'Save',
    confirmInboundTitle: 'Confirm Inbound Shipment',
    confirmInboundDescription: 'Tell Amazon the shipment is on its way to the Fulfillment Center. This updates the shipment status to SHIPPING.',
    destinationFc: 'Destination Fulfillment Center',
    selectFc: 'Select FC...',
    notes: 'Notes (optional)',
    notesPlaceholder: 'Carrier, tracking info, special instructions...',
    confirming: 'Confirming...',
    working: 'Working',
    shipping: 'Shipping',
    receiving: 'Receiving',
    closed: 'Closed',
    prepSteps: {
      none: ['No Prep Required', 'Item ships as-is to Amazon FC'],
      preparing: ['Preparing', 'Items are being inspected, sorted, or bundled'],
      prepped: ['Prepped', 'Items have been prepped (polybagging, bubble wrap, etc.)'],
      labelled: ['Labelled', 'FNSKU labels applied and ready for shipping'],
    },
  };

  const inboundStatus = job.inbound_shipment_status ?? 'working';
  const fbaShipmentId = job.fba_shipment_id;

  const statusColor = FBA_INBOUND_STATUS_COLORS[inboundStatus];
  const statusLabel = {
    'en-US': FBA_INBOUND_STATUS_LABELS[inboundStatus],
    'ja-JP': {
      working: '作業中',
      shipping: 'FCへ配送中',
      receiving: '受領中',
      closed: '完了',
      cancelled: 'キャンセル',
      deleted: '削除済み',
    }[inboundStatus],
    'vi-VN': {
      working: 'Đang xử lý',
      shipping: 'Đang gửi tới FC',
      receiving: 'Đang nhận',
      closed: 'Hoàn tất',
      cancelled: 'Đã hủy',
      deleted: 'Đã xóa',
    }[inboundStatus],
  }[locale] ?? FBA_INBOUND_STATUS_LABELS[inboundStatus];
  const prepStatusLabel = job.fba_prep_status
    ? ({
      'en-US': FBA_PREP_STATUS_LABELS[job.fba_prep_status],
      'ja-JP': {
        none: 'Prep不要',
        preparing: '準備中',
        prepped: 'Prep完了',
        labelled: 'ラベル済み',
      }[job.fba_prep_status],
      'vi-VN': {
        none: 'Không cần prep',
        preparing: 'Đang chuẩn bị',
        prepped: 'Đã prep',
        labelled: 'Đã dán nhãn',
      }[job.fba_prep_status],
    }[locale] ?? FBA_PREP_STATUS_LABELS[job.fba_prep_status])
    : null;
  const prepSteps = PREP_STEPS.map((step) => ({
    ...step,
    label: copy.prepSteps[step.status][0],
    description: copy.prepSteps[step.status][1],
  }));

  const handlePrepSave = () => {
    onUpdatePrepStatus?.(selectedPrep);
    setPrepDialogOpen(false);
  };

  const handleConfirmShip = () => {
    if (selectedFc) {
      onConfirmShipment?.(selectedFc);
      setFcDialogOpen(false);
    }
  };

  // ─── Progress Steps ─────────────────────────────────────────────────────────
  const STEPS: { label: string; icon: React.ReactNode; status: 'done' | 'active' | 'pending' }[] = [
    {
      label: copy.working,
      icon: <Package className="size-4" />,
      status: ['working', 'shipping', 'receiving', 'closed'].includes(inboundStatus) ? 'done' : 'pending',
    },
    {
      label: copy.shipping,
      icon: <Truck className="size-4" />,
      status: ['shipping', 'receiving', 'closed'].includes(inboundStatus) ? 'done' : inboundStatus === 'shipping' ? 'active' : 'pending',
    },
    {
      label: copy.receiving,
      icon: <RefreshCw className="size-4" />,
      status: inboundStatus === 'receiving' ? 'done' : inboundStatus === 'closed' ? 'done' : 'pending',
    },
    {
      label: copy.closed,
      icon: <CheckCircle className="size-4" />,
      status: inboundStatus === 'closed' ? 'done' : 'pending',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-orange-600" />
          <h3 className="font-medium">{copy.inboundShipment}</h3>
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            {onUpdatePrepStatus && (
              <Button variant="outline" size="sm" onClick={() => setPrepDialogOpen(true)} disabled={isUpdating}>
                <AlertCircle className="size-3.5 mr-1" />
                {copy.setPrepStatus}
              </Button>
            )}
            {onSyncShipment && (
              <Button variant="outline" size="sm" onClick={onSyncShipment} disabled={isSyncing}>
                <RefreshCw className={`size-3.5 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                {copy.sync}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Shipment ID + Status */}
      <div className="flex items-center gap-3 flex-wrap">
        {fbaShipmentId ? (
          <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
            {fbaShipmentId}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">{copy.noShipmentId}</span>
        )}
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
        {job.fba_prep_status && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${FBA_PREP_STATUS_COLORS[job.fba_prep_status]}`}>
            {prepStatusLabel}
          </span>
        )}
      </div>

      {/* Flow Progress Timeline */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex flex-col items-center gap-1 relative z-10">
              <div className={`size-8 rounded-full flex items-center justify-center border-2 transition-all ${
                step.status === 'done'
                  ? 'bg-green-100 border-green-500 text-green-600'
                  : step.status === 'active'
                  ? 'bg-blue-100 border-blue-500 text-blue-600'
                  : 'bg-muted border-muted-foreground/30 text-muted-foreground'
              }`}>
                {step.icon}
              </div>
              <span className={`text-xs font-medium ${
                step.status !== 'pending' ? 'text-foreground' : 'text-muted-foreground'
              }`}>{step.label}</span>
            </div>
          ))}
        </div>
        {/* Connector lines */}
        <div className="absolute top-4 left-[2rem] right-[2rem] h-0.5 bg-border -z-0" />
        <div
          className="absolute top-4 left-[2rem] h-0.5 bg-green-500 -z-0 transition-all"
          style={{
            width: inboundStatus === 'closed'
              ? 'calc(75% - 2rem)'
              : inboundStatus === 'receiving'
              ? 'calc(50% - 2rem)'
              : inboundStatus === 'shipping'
              ? 'calc(25% - 2rem)'
              : '0px',
          }}
        />
      </div>

      {/* FC Info */}
      {job.fulfillment_center_id && (
        <div className="text-sm">
          <span className="text-muted-foreground">{copy.fulfillmentCenter}: </span>
          <span className="font-mono font-medium">{job.fulfillment_center_id}</span>
        </div>
      )}

      {/* Confirm Ship Button */}
      {!isReadOnly && onConfirmShipment && inboundStatus === 'working' && (
        <div className="flex items-center gap-2 pt-1 border-t">
          <Button
            size="sm"
            onClick={() => setFcDialogOpen(true)}
            disabled={!job.fba_prep_status || job.fba_prep_status !== 'labelled'}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Truck className="size-3.5 mr-1" />
            {copy.confirmShipment}
          </Button>
          {(!job.fba_prep_status || job.fba_prep_status !== 'labelled') && (
            <span className="text-xs text-muted-foreground">
              {copy.labelStepRequired}
            </span>
          )}
        </div>
      )}

      {/* Cancelled/Closed state */}
      {inboundStatus === 'cancelled' && (
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="size-4" />
          <span className="text-sm font-medium">{copy.shipmentCancelled}</span>
        </div>
      )}
      {inboundStatus === 'closed' && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="size-4" />
          <span className="text-sm font-medium">{copy.readyToSell}</span>
        </div>
      )}

      {/* ─── Prep Status Dialog ─────────────────────────────────────────── */}
      <Dialog open={prepDialogOpen} onOpenChange={setPrepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.prepDialogTitle}</DialogTitle>
            <DialogDescription>
              {copy.prepDialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {prepSteps.map((step) => (
              <button
                key={step.status}
                onClick={() => setSelectedPrep(step.status)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                  selectedPrep === step.status
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <div className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedPrep === step.status
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30'
                }`}>
                  {selectedPrep === step.status && (
                    <div className="size-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrepDialogOpen(false)}>{copy.cancel}</Button>
            <Button onClick={handlePrepSave} disabled={isUpdating}>
              {isUpdating ? copy.saving : copy.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Shipment Dialog ────────────────────────────────────── */}
      <Dialog open={fcDialogOpen} onOpenChange={setFcDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.confirmInboundTitle}</DialogTitle>
            <DialogDescription>
              {copy.confirmInboundDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>{copy.destinationFc}</Label>
              <Select value={selectedFc} onValueChange={setSelectedFc}>
                <SelectTrigger>
                  <SelectValue placeholder={copy.selectFc} />
                </SelectTrigger>
                <SelectContent>
                  {FC_OPTIONS.map(fc => (
                    <SelectItem key={fc.id} value={fc.id}>
                      {fc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{copy.notes}</Label>
              <Input
                placeholder={copy.notesPlaceholder}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFcDialogOpen(false)}>{copy.cancel}</Button>
            <Button
              onClick={handleConfirmShip}
              disabled={!selectedFc || isUpdating}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isUpdating ? copy.confirming : copy.confirmShipment}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
