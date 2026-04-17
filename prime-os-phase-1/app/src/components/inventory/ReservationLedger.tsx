import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, RefreshCcw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useReservations, useReleaseReservation, useConsumeReservation } from '@/hooks/use-reservations';
import { useReservationCounts } from '@/hooks/use-reservations';
import type { ReservationStatus } from '@/lib/oms-types';
import { SkuBadge } from '@/components/system/SkuBadge';

const STATUS_CONFIG: Record<ReservationStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  reserved: { label: 'Reserved', className: 'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300', icon: Loader2 },
  consumed: { label: 'Consumed', className: 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', icon: CheckCircle2 },
  released: { label: 'Released', className: 'bg-muted text-muted-foreground', icon: RefreshCcw },
  failed: { label: 'Failed', className: 'bg-rose-500/14 text-rose-700 dark:bg-rose-500/18 dark:text-rose-300', icon: XCircle },
};

interface ReservationLedgerProps {
  compact?: boolean;
}

export function ReservationLedger({ compact = false }: ReservationLedgerProps) {
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data: reservations = [], isLoading } = useReservations({
    status: statusFilter,
  });
  const { data: counts = {} } = useReservationCounts();
  const releaseMut = useReleaseReservation();
  const consumeMut = useConsumeReservation();

  const filtered = reservations.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    const skuCode = (r as { sku?: { sku_code?: string } }).sku?.sku_code ?? '';
    const orderId = r.order_id ?? '';
    const warehouseCode = (r as { warehouse?: { code?: string } }).warehouse?.code ?? '';
    return (
      skuCode.toLowerCase().includes(s) ||
      orderId.toLowerCase().includes(s) ||
      warehouseCode.toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ReservationStatus | 'all')}>
          <SelectTrigger className="w-[160px] text-sm h-9">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({counts['all'] ?? 0})</SelectItem>
            <SelectItem value="reserved">Reserved ({counts['reserved'] ?? 0})</SelectItem>
            <SelectItem value="consumed">Consumed ({counts['consumed'] ?? 0})</SelectItem>
            <SelectItem value="released">Released ({counts['released'] ?? 0})</SelectItem>
            <SelectItem value="failed">Failed ({counts['failed'] ?? 0})</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search SKU, order, warehouse..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs text-sm h-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: compact ? 3 : 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center border rounded-lg">
          <ClipboardList className="size-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-muted-foreground">No reservations found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {statusFilter !== 'all' ? `No ${statusFilter} reservations.` : 'Reservations will appear here once orders are allocated.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                {!compact && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((res) => {
                const cfg = STATUS_CONFIG[res.status] ?? STATUS_CONFIG['reserved'];
                const skuCode = (res as { sku?: { sku_code?: string; variation_name?: string; product?: { title?: string } } }).sku?.sku_code ?? '—';
                const productTitle = (res as { sku?: { product?: { title?: string } } }).sku?.product?.title;
                const warehouseCode = (res as { warehouse?: { code?: string; name?: string } }).warehouse?.code ?? '—';
                const warehouseName = (res as { warehouse?: { name?: string } }).warehouse?.name ?? '';
                const orderId = res.order_id ?? '—';

                return (
                  <TableRow key={res.id} className="group">
                    <TableCell>
                      <div>
                        <SkuBadge sku={skuCode} size="compact" />
                        {productTitle && (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">{productTitle}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">{warehouseCode}</div>
                        {warehouseName && (
                          <div className="text-xs text-muted-foreground">{warehouseName}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/orders/${orderId}`}
                        className="text-sm font-mono text-primary hover:underline"
                      >
                        {orderId.slice(0, 12)}...
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold font-mono text-sm">{res.qty}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${cfg.className} text-xs`}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(res.created_at).toLocaleDateString('en-GB')}
                    </TableCell>
                    {!compact && (
                      <TableCell>
                        {res.status === 'reserved' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => consumeMut.mutate(res.id)}
                              disabled={consumeMut.isPending}
                              title="Mark as consumed"
                            >
                              <CheckCircle2 className="size-3 mr-1" />
                              Consume
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground"
                              onClick={() => releaseMut.mutate(res.id)}
                              disabled={releaseMut.isPending}
                              title="Release reservation"
                            >
                              <RefreshCcw className="size-3 mr-1" />
                              Release
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
