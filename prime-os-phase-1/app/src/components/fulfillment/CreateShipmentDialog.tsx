import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nContext';

interface CreateShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { carrierCode: string; trackingNumber?: string; serviceLevel?: string }) => void;
  isLoading?: boolean;
}

const CARRIERS = [
  { value: 'japan_post', label: 'Japan Post' },
  { value: 'sagawa', label: 'Sagawa' },
  { value: 'yamato', label: 'Yamato' },
  { value: 'ecms', label: 'ECMS' },
  { value: 'manual', label: 'Manual' },
];

export function CreateShipmentDialog({ open, onOpenChange, onSubmit, isLoading }: CreateShipmentDialogProps) {
  const { locale } = useI18n();
  const [carrierCode, setCarrierCode] = useState('japan_post');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [serviceLevel, setServiceLevel] = useState('');
  const copy = {
    'en-US': {
      title: 'Create Shipment',
      carrier: 'Carrier',
      tracking: 'Tracking Number (optional)',
      serviceLevel: 'Service Level (optional)',
      trackingPlaceholder: 'e.g. 1234567890',
      servicePlaceholder: 'e.g. Express, Standard',
      cancel: 'Cancel',
      creating: 'Creating...',
      create: 'Create Shipment',
    },
    'ja-JP': {
      title: '出荷を作成',
      carrier: '配送会社',
      tracking: '追跡番号（任意）',
      serviceLevel: '配送サービス（任意）',
      trackingPlaceholder: '例: 1234567890',
      servicePlaceholder: '例: Express, Standard',
      cancel: 'キャンセル',
      creating: '作成中...',
      create: '出荷を作成',
    },
    'vi-VN': {
      title: 'Tạo lệnh giao hàng',
      carrier: 'Đơn vị vận chuyển',
      tracking: 'Mã vận đơn (không bắt buộc)',
      serviceLevel: 'Mức dịch vụ (không bắt buộc)',
      trackingPlaceholder: 'VD: 1234567890',
      servicePlaceholder: 'VD: Express, Standard',
      cancel: 'Hủy',
      creating: 'Đang tạo...',
      create: 'Tạo lệnh giao hàng',
    },
  }[locale] ?? {
    title: 'Create Shipment',
    carrier: 'Carrier',
    tracking: 'Tracking Number (optional)',
    serviceLevel: 'Service Level (optional)',
    trackingPlaceholder: 'e.g. 1234567890',
    servicePlaceholder: 'e.g. Express, Standard',
    cancel: 'Cancel',
    creating: 'Creating...',
    create: 'Create Shipment',
  };

  function handleSubmit() {
    onSubmit({
      carrierCode,
      trackingNumber: trackingNumber || undefined,
      serviceLevel: serviceLevel || undefined,
    });
    setCarrierCode('japan_post');
    setTrackingNumber('');
    setServiceLevel('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-4" />
            {copy.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{copy.carrier}</Label>
            <select
              value={carrierCode}
              onChange={e => setCarrierCode(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              {CARRIERS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{copy.tracking}</Label>
            <Input
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder={copy.trackingPlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{copy.serviceLevel}</Label>
            <Input
              value={serviceLevel}
              onChange={e => setServiceLevel(e.target.value)}
              placeholder={copy.servicePlaceholder}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{copy.cancel}</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? copy.creating : copy.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
