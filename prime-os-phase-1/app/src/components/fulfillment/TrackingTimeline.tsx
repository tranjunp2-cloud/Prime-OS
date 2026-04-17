import { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Package, Plus, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ShipmentStatus, TrackingEvent } from '@/lib/fulfillment-types';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDateTime, formatMessage } from '@/lib/i18n/format';
import { getLocalizedShipmentStatusLabel } from '@/lib/i18n/ops-labels';
import { cn } from '@/lib/utils';

interface TrackingTimelineProps {
  events: TrackingEvent[];
  isReadOnly: boolean;
  onAddEvent: (eventCode: string, eventMessage: string) => void;
  isAdding?: boolean;
  hasShipment: boolean;
  isShipmentDispatched: boolean;
  shipmentStatus?: ShipmentStatus | null;
  trackingNumber?: string | null;
  onOpenShipmentStep?: () => void;
}

const eventIcons: Record<string, React.ReactNode> = {
  picked_up: <Package className="size-4" />,
  in_transit: <Truck className="size-4" />,
  shipped: <Truck className="size-4" />,
  out_for_delivery: <Truck className="size-4" />,
  delivered: <CheckCircle className="size-4" />,
  failed: <AlertCircle className="size-4" />,
  exception: <AlertCircle className="size-4" />,
};

function formatTrackingCode(code: string) {
  return code
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function TrackingTimeline({
  events,
  isReadOnly,
  onAddEvent,
  isAdding,
  hasShipment,
  isShipmentDispatched,
  shipmentStatus,
  trackingNumber,
  onOpenShipmentStep,
}: TrackingTimelineProps) {
  const { locale, t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [eventCode, setEventCode] = useState('');
  const [eventMessage, setEventMessage] = useState('');

  const sortedEvents = [...events].sort(
    (left, right) => new Date(right.event_time).getTime() - new Date(left.event_time).getTime(),
  );

  const handleAdd = () => {
    if (eventCode && eventMessage) {
      onAddEvent(eventCode, eventMessage);
      setAddOpen(false);
      setEventCode('');
      setEventMessage('');
    }
  };

  const emptyState = !hasShipment
    ? {
        icon: Package,
        title: t('fulfillment.trackingPanel.noShipmentTitle'),
        description: t('fulfillment.trackingPanel.noShipmentDesc'),
        cta: !isReadOnly ? t('fulfillment.trackingPanel.openShipmentStep') : null,
      }
    : !isShipmentDispatched
      ? {
          icon: Truck,
          title: t('fulfillment.trackingPanel.awaitingDispatchTitle'),
          description: t('fulfillment.trackingPanel.awaitingDispatchDesc'),
          cta: !isReadOnly ? t('fulfillment.trackingPanel.openShipmentStep') : null,
        }
      : {
          icon: Clock,
          title: t('fulfillment.trackingPanel.awaitingCarrierTitle'),
          description: trackingNumber
            ? formatMessage(t('fulfillment.trackingPanel.awaitingCarrierWithTracking'), { tracking: trackingNumber })
            : t('fulfillment.trackingPanel.awaitingCarrierDesc'),
          cta: null,
        };
  const EmptyStateIcon = emptyState.icon;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-muted-foreground" />
              <h3 className="font-medium">{t('fulfillment.trackingPanel.title')}</h3>
            </div>
            {trackingNumber ? (
              <Badge variant="outline" className="border-edge-divider/60 bg-surface-hover/60 font-mono text-[11px] shadow-none">
                {trackingNumber}
              </Badge>
            ) : null}
            {events.length > 0 ? (
              <Badge variant="outline" className="border-edge-divider/60 bg-surface-hover/60 text-[11px] shadow-none">
                {formatMessage(t('fulfillment.trackingPanel.eventCount'), { count: events.length })}
              </Badge>
            ) : null}
            {shipmentStatus ? (
              <Badge variant="outline" className="border-edge-divider/60 bg-surface-hover/60 text-[11px] capitalize shadow-none">
                {getLocalizedShipmentStatusLabel(shipmentStatus, t)}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{t('fulfillment.jobSections.trackingDesc')}</p>
        </div>

        {!isReadOnly && hasShipment && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1 size-4" />
                {t('fulfillment.trackingPanel.addEvent')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('fulfillment.trackingPanel.addEventTitle')}</DialogTitle>
                <DialogDescription>{t('fulfillment.trackingPanel.addEventDesc')}</DialogDescription>
              </DialogHeader>
              <div className="flex py-4 flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{t('fulfillment.trackingPanel.eventCode')}</Label>
                  <Input
                    placeholder={t('fulfillment.trackingPanel.eventCodePlaceholder')}
                    value={eventCode}
                    onChange={(event) => setEventCode(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t('fulfillment.trackingPanel.eventMessage')}</Label>
                  <Input
                    placeholder={t('fulfillment.trackingPanel.eventMessagePlaceholder')}
                    value={eventMessage}
                    onChange={(event) => setEventMessage(event.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  {t('fulfillment.shipmentPanel.cancel')}
                </Button>
                <Button onClick={handleAdd} disabled={isAdding || !eventCode || !eventMessage}>
                  {t('fulfillment.trackingPanel.add')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {sortedEvents.length === 0 ? (
        <div className="rounded-[1.2rem] border border-edge-divider/55 bg-surface-hover/35 px-5 py-8">
          <div className="mx-auto flex max-w-lg flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-edge-divider/65 bg-surface-hover/60 text-muted-foreground">
              <EmptyStateIcon className="size-6" />
            </div>
            <h4 className="mt-4 text-base font-semibold text-foreground">{emptyState.title}</h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{emptyState.description}</p>
            {emptyState.cta && onOpenShipmentStep ? (
              <Button variant="outline" size="sm" className="mt-4" onClick={onOpenShipmentStep}>
                {emptyState.cta}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedEvents.map((event, index) => (
            <div
              key={event.id}
              className={cn(
                'rounded-[1.15rem] border px-4 py-3',
                index === 0
                  ? 'border-primary/20 bg-primary/7'
                  : 'border-edge-divider/50 bg-surface-hover/42'
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl border',
                      index === 0
                        ? 'border-primary/25 bg-primary/12 text-primary'
                        : 'border-edge-divider/60 bg-surface-hover/60 text-muted-foreground'
                    )}
                  >
                    {eventIcons[event.event_code] || <div className="size-2 rounded-full bg-current" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{formatTrackingCode(event.event_code)}</p>
                      {index === 0 ? (
                        <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary shadow-none">
                          {t('fulfillment.jobDetail.currentBadge')}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.event_message}</p>
                  </div>
                </div>

                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatLocalizedDateTime(locale, event.event_time, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
