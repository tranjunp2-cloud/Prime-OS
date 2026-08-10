import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Clock, CheckCircle2, XCircle, Package, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SkuBadge } from '@/components/system/SkuBadge';
import { getReservations, getReservationCounts, releaseExpiredReservations, type Reservation } from '@/lib/reservation-store';

const STATE_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  RESERVED_UNPAID: { label: 'Reserved (Unpaid)', className: 'bg-purple-500/14 text-purple-700 dark:bg-purple-500/18 dark:text-purple-300', icon: Clock },
  RESERVED_PAID: { label: 'Reserved (Paid)', className: 'bg-violet-500/14 text-violet-700 dark:bg-violet-500/18 dark:text-violet-300', icon: CheckCircle2 },
  ALLOCATED: { label: 'Allocated', className: 'bg-amber-500/14 text-amber-700 dark:bg-amber-500/18 dark:text-amber-300', icon: Package },
  RELEASED_TIMEOUT: { label: 'Released (Timeout)', className: 'bg-muted text-muted-foreground', icon: AlertTriangle },
  RELEASED_CANCEL: { label: 'Released (Cancel)', className: 'bg-muted text-muted-foreground', icon: XCircle },
};

const SOURCE_LABELS: Record<string, string> = {
  LIVESTREAM_TIKTOK: 'TikTok Live',
  LIVESTREAM_FB: 'Facebook Live',
  LAZADA: 'Lazada',
  SHOPEE: 'Shopee',
  CHECKOUT: 'Checkout',
  MANUAL: 'Manual',
};

export function ReservationLedger5State() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  // Auto-release expired every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      const released = releaseExpiredReservations();
      if (released > 0) setTick(t => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const reservations = getReservations();
  const counts = getReservationCounts();

  const filtered = reservations.filter(r => {
    if (statusFilter !== 'all' && r.state !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.sku_id.toLowerCase().includes(s) ||
      r.order_ref.toLowerCase().includes(s) ||
      r.warehouse_id.toLowerCase().includes(s) ||
      (SOURCE_LABELS[r.source] || r.source).toLowerCase().includes(s)
    );
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="flex flex-col gap-4">
      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-500/12 dark:text-purple-300">
          Unpaid: {counts.reserved_unpaid ?? 0}
        </span>
        <span className="rounded-full border bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/12 dark:text-violet-300">
          Paid: {counts.reserved_paid ?? 0}
        </span>
        <span className="rounded-full border bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/12 dark:text-amber-300">
          Allocated: {counts.allocated ?? 0}
        </span>
        <span className="rounded-full border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          Released: {(counts.released_timeout ?? 0) + (counts.released_cancel ?? 0)}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {counts.active ?? 0} active · auto-release every 5s
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full text-sm sm:w-[180px]">
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({counts.all ?? 0})</SelectItem>
            <SelectItem value="RESERVED_UNPAID">Unpaid ({counts.reserved_unpaid ?? 0})</SelectItem>
            <SelectItem value="RESERVED_PAID">Paid ({counts.reserved_paid ?? 0})</SelectItem>
            <SelectItem value="ALLOCATED">Allocated ({counts.allocated ?? 0})</SelectItem>
            <SelectItem value="RELEASED_TIMEOUT">Timeout ({counts.released_timeout ?? 0})</SelectItem>
            <SelectItem value="RELEASED_CANCEL">Canceled ({counts.released_cancel ?? 0})</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search SKU, order ref, source..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-full text-sm sm:max-w-xs"
        />

        <Button variant="outline" size="sm" onClick={refresh} className="h-9">
          Refresh
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center border rounded-lg">
          <ClipboardList className="size-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-muted-foreground">No reservations found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {statusFilter !== 'all' ? `No ${stateLabel(statusFilter)} reservations.` : 'Reservations appear when orders are created via livestream, checkout, or marketplace channels.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Order Ref</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((res) => {
                const cfg = STATE_CONFIG[res.state] ?? STATE_CONFIG.RESERVED_UNPAID;
                const expiresAt = new Date(res.expires_at);
                const isExpired = expiresAt.getTime() < Date.now();
                return (
                  <tr key={res.id} className="group hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <SkuBadge sku={res.sku_id} size="compact" />
                        <div className="text-[10px] text-muted-foreground">{res.warehouse_id}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{res.order_ref}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {SOURCE_LABELS[res.source] || res.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{res.qty}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${cfg.className} text-[10px]`}>
                        {cfg.label}
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs ${isExpired && res.state === 'RESERVED_UNPAID' ? 'text-rose-600' : 'text-muted-foreground'}`}>
                      {expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isExpired && res.state === 'RESERVED_UNPAID' ? ' ⚠' : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(res.created_at).toLocaleDateString('en-GB')} {new Date(res.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

function stateLabel(state: string): string {
  return STATE_CONFIG[state]?.label ?? state;
}
