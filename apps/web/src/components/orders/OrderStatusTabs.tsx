import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/I18nContext';

interface OrderStatusTabsProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
  orderCounts?: Record<string, number>;
}

const statuses = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'ready_to_ship', label: 'Ready to Ship' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
];

export function OrderStatusTabs({ activeStatus, onStatusChange, orderCounts }: OrderStatusTabsProps) {
  const { t } = useI18n();

  const getStatusLabel = (value: string, defaultLabel: string) => {
    switch (value) {
      case 'all': return t('orders.statusAll');
      case 'pending': return t('orders.statusPending');
      case 'ready_to_ship': return t('orders.statusReady');
      case 'shipping': return t('orders.statusShipping');
      case 'completed': return t('orders.statusCompleted');
      case 'cancelled': return t('orders.statusCancelled');
      case 'returned': return t('orders.statusReturned');
      default: return defaultLabel;
    }
  };

  return (
    <Tabs value={activeStatus} onValueChange={onStatusChange} className="w-full">
      <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
        {statuses.map(({ value, label }) => {
          const count = orderCounts?.[value];
          const isActive = activeStatus === value;
          return (
            <TabsTrigger
              key={value}
              value={value}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5 text-sm gap-2"
            >
              {getStatusLabel(value, label)}
              {count !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
