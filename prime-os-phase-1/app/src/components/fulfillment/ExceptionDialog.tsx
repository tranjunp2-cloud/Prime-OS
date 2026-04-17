import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import type { ExceptionType, ExceptionSeverity } from '@/lib/fulfillment-types';
import { useI18n } from '@/lib/i18n/I18nContext';

interface ExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { type: string; severity: string; note?: string }) => Promise<void>;
  isLoading?: boolean;
}

const EXCEPTION_TYPES: { value: ExceptionType; label: string }[] = [
  { value: 'short_pick', label: 'Short Pick' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'delivery_failed', label: 'Delivery Failed' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_LEVELS: { value: ExceptionSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'med', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function ExceptionDialog({ open, onOpenChange, onSubmit, isLoading }: ExceptionDialogProps) {
  const { locale } = useI18n();
  const [type, setType] = useState<ExceptionType>('other');
  const [severity, setSeverity] = useState<ExceptionSeverity>('med');
  const [note, setNote] = useState('');
  const localizedTypes = {
    'en-US': {
      short_pick: 'Short Pick',
      damaged: 'Damaged',
      delivery_failed: 'Delivery Failed',
      other: 'Other',
    },
    'ja-JP': {
      short_pick: 'ピッキング不足',
      damaged: '破損',
      delivery_failed: '配送失敗',
      other: 'その他',
    },
    'vi-VN': {
      short_pick: 'Thiếu khi pick',
      damaged: 'Hư hỏng',
      delivery_failed: 'Giao hàng thất bại',
      other: 'Khác',
    },
  }[locale] ?? {
    short_pick: 'Short Pick',
    damaged: 'Damaged',
    delivery_failed: 'Delivery Failed',
    other: 'Other',
  };
  const localizedSeverity = {
    'en-US': { low: 'Low', med: 'Medium', high: 'High' },
    'ja-JP': { low: '低', med: '中', high: '高' },
    'vi-VN': { low: 'Thấp', med: 'Trung bình', high: 'Cao' },
  }[locale] ?? { low: 'Low', med: 'Medium', high: 'High' };
  const copy = {
    'en-US': {
      title: 'Flag Exception',
      type: 'Exception Type *',
      severity: 'Severity *',
      notes: 'Notes (optional)',
      placeholder: 'Describe what happened...',
      cancel: 'Cancel',
      saving: 'Saving...',
      submit: 'Flag Exception',
    },
    'ja-JP': {
      title: '例外を登録',
      type: '例外タイプ *',
      severity: '重大度 *',
      notes: 'メモ（任意）',
      placeholder: '発生内容を入力してください...',
      cancel: 'キャンセル',
      saving: '保存中...',
      submit: '例外を登録',
    },
    'vi-VN': {
      title: 'Đánh dấu ngoại lệ',
      type: 'Loại ngoại lệ *',
      severity: 'Mức độ *',
      notes: 'Ghi chú (không bắt buộc)',
      placeholder: 'Mô tả điều đã xảy ra...',
      cancel: 'Hủy',
      saving: 'Đang lưu...',
      submit: 'Đánh dấu ngoại lệ',
    },
  }[locale] ?? {
    title: 'Flag Exception',
    type: 'Exception Type *',
    severity: 'Severity *',
    notes: 'Notes (optional)',
    placeholder: 'Describe what happened...',
    cancel: 'Cancel',
    saving: 'Saving...',
    submit: 'Flag Exception',
  };
  const exceptionTypes = EXCEPTION_TYPES.map((entry) => ({
    ...entry,
    label: localizedTypes[entry.value],
  }));
  const severityLevels = SEVERITY_LEVELS.map((entry) => ({
    ...entry,
    label: localizedSeverity[entry.value],
  }));

  function handleSubmit() {
    onSubmit({ type, severity, note: note || undefined });
    setType('other');
    setSeverity('med');
    setNote('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            {copy.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{copy.type}</Label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ExceptionType)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            >
              {exceptionTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{copy.severity}</Label>
            <div className="flex gap-2">
              {severityLevels.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSeverity(s.value)}
                  className={`flex-1 py-2 rounded-md border text-sm transition-colors ${
                    severity === s.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{copy.notes}</Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={copy.placeholder}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{copy.cancel}</Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? copy.saving : copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
