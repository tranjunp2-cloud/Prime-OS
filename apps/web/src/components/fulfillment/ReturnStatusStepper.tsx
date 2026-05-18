import { Check } from 'lucide-react';
import type { ReturnStatus } from '@/lib/partner-types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/I18nContext';

const STATUS_ORDER: Record<ReturnStatus, number> = {
  requested: 0,
  approved: 1,
  in_transit: 2,
  received: 3,
  qc: 4,
  dispositioned: 5,
  completed: 6,
  cancelled: -1,
  rejected: -1,
};

interface ReturnStatusStepperProps {
  currentStatus: ReturnStatus;
  className?: string;
}

export function ReturnStatusStepper({ currentStatus, className }: ReturnStatusStepperProps) {
  const { locale } = useI18n();
  const stepLabels: Record<ReturnStatus, string> = {
    requested: locale === 'ja-JP' ? '依頼済み' : locale === 'vi-VN' ? 'Đã yêu cầu' : 'Requested',
    approved: locale === 'ja-JP' ? '承認済み' : locale === 'vi-VN' ? 'Đã duyệt' : 'Approved',
    in_transit: locale === 'ja-JP' ? '輸送中' : locale === 'vi-VN' ? 'Đang chuyển' : 'In Transit',
    received: locale === 'ja-JP' ? '受領済み' : locale === 'vi-VN' ? 'Đã nhận' : 'Received',
    qc: 'QC',
    dispositioned: locale === 'ja-JP' ? '処置済み' : locale === 'vi-VN' ? 'Đã xử lý' : 'Dispositioned',
    completed: locale === 'ja-JP' ? '完了' : locale === 'vi-VN' ? 'Hoàn tất' : 'Completed',
    cancelled: locale === 'ja-JP' ? 'キャンセル' : locale === 'vi-VN' ? 'Đã hủy' : 'Cancelled',
    rejected: locale === 'ja-JP' ? '却下' : locale === 'vi-VN' ? 'Bị từ chối' : 'Rejected',
  };
  const steps: { status: ReturnStatus; label: string }[] = [
    { status: 'requested', label: stepLabels.requested },
    { status: 'approved', label: stepLabels.approved },
    { status: 'in_transit', label: stepLabels.in_transit },
    { status: 'received', label: stepLabels.received },
    { status: 'qc', label: stepLabels.qc },
    { status: 'dispositioned', label: stepLabels.dispositioned },
    { status: 'completed', label: stepLabels.completed },
  ];
  const currentIndex = STATUS_ORDER[currentStatus] ?? -1;

  return (
    <div className={cn('flex items-center w-full', className)}>
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const isFuture = i > currentIndex;

        return (
          <div key={step.status} className="flex items-center flex-1 last:flex-none">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'size-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors',
                  isDone && 'bg-primary border-primary text-primary-foreground',
                  isActive && 'bg-background border-primary text-primary',
                  isFuture && 'bg-muted border-muted-foreground/30 text-muted-foreground',
                )}
              >
                {isDone ? <Check className="size-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'mt-1.5 text-[10px] text-center leading-tight whitespace-nowrap',
                  isDone && 'text-primary font-medium',
                  isActive && 'text-foreground font-semibold',
                  isFuture && 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 -mt-4 transition-colors',
                  isDone ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
