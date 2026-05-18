import { Clock, User, Bot, Plug } from 'lucide-react';
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS, type OrderEvent } from '@/lib/oms-types';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDateTime } from '@/lib/i18n/format';

interface OrderEventTimelineProps {
  events: OrderEvent[];
  isLoading?: boolean;
}

export function OrderEventTimeline({ events, isLoading }: OrderEventTimelineProps) {
  const { locale } = useI18n();
  const copy = {
    loading: {
      'en-US': 'Loading events...',
      'ja-JP': 'イベントを読み込み中...',
      'vi-VN': 'Đang tải sự kiện...',
    },
    empty: {
      'en-US': 'No events recorded yet',
      'ja-JP': 'イベントはまだ記録されていません',
      'vi-VN': 'Chưa có sự kiện nào được ghi nhận',
    },
    actors: {
      user: {
        'en-US': 'User',
        'ja-JP': 'ユーザー',
        'vi-VN': 'Người dùng',
      },
      integration: {
        'en-US': 'Integration',
        'ja-JP': '連携',
        'vi-VN': 'Tích hợp',
      },
      system: {
        'en-US': 'System',
        'ja-JP': 'システム',
        'vi-VN': 'Hệ thống',
      },
    },
    eventLabels: {
      captured: { 'en-US': 'Order Captured', 'ja-JP': '注文受付', 'vi-VN': 'Đã ghi nhận đơn' },
      validated: { 'en-US': 'Order Validated', 'ja-JP': '注文検証', 'vi-VN': 'Đã xác thực đơn' },
      allocated: { 'en-US': 'Warehouse Allocated', 'ja-JP': '倉庫割当', 'vi-VN': 'Đã phân bổ kho' },
      reserved: { 'en-US': 'Inventory Reserved', 'ja-JP': '在庫確保', 'vi-VN': 'Đã giữ tồn kho' },
      reservation_failed: { 'en-US': 'Reservation Failed', 'ja-JP': '在庫確保失敗', 'vi-VN': 'Giữ tồn kho thất bại' },
      release_to_fulfillment: { 'en-US': 'Released to Fulfillment', 'ja-JP': '出荷指示済み', 'vi-VN': 'Đã chuyển fulfillment' },
      shipped: { 'en-US': 'Order Shipped', 'ja-JP': '出荷済み', 'vi-VN': 'Đơn đã gửi' },
      delivered: { 'en-US': 'Order Delivered', 'ja-JP': '配達済み', 'vi-VN': 'Đã giao hàng' },
      cancelled: { 'en-US': 'Order Cancelled', 'ja-JP': '注文キャンセル', 'vi-VN': 'Đơn đã hủy' },
      return_requested: { 'en-US': 'Return Requested', 'ja-JP': '返品依頼', 'vi-VN': 'Yêu cầu trả hàng' },
      exception: { 'en-US': 'Exception', 'ja-JP': '例外', 'vi-VN': 'Ngoại lệ' },
      note: { 'en-US': 'Note', 'ja-JP': 'メモ', 'vi-VN': 'Ghi chú' },
    },
  } as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {copy.loading[locale]}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {copy.empty[locale]}
      </div>
    );
  }

  const getActorIcon = (actorType: string) => {
    switch (actorType) {
      case 'user':
        return <User className="size-3" />;
      case 'integration':
        return <Plug className="size-3" />;
      default:
        return <Bot className="size-3" />;
    }
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="flex flex-col gap-4">
        {events.map((event, index) => (
          <div key={event.id} className="relative pl-10">
            <div
              className={`absolute left-2.5 size-3 rounded-full border-2 ${
                index === 0
                  ? 'bg-primary border-primary'
                  : 'bg-background border-muted-foreground'
              }`}
            />

            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {EVENT_TYPE_ICONS[event.event_type] || '📋'}
                  </span>
                  <span className="font-medium text-sm">
                    {copy.eventLabels[event.event_type as keyof typeof copy.eventLabels]?.[locale] || EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatLocalizedDateTime(locale, event.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-sm text-muted-foreground">{event.message}</p>

              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                {getActorIcon(event.actor_type)}
                <span className="capitalize">{copy.actors[event.actor_type]?.[locale] || event.actor_type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
