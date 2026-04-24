/**
 * FbaInventorySync — Bi-directional sync between ECH inventory and FBA
 *
 * Shows:
 * - ECH local ATS vs FBA ATS per SKU
 * - Combined total (local + FBA)
 * - Last sync timestamp
 * - Sync button with status
 *
 * The actual sync calls amazon-spapi.ts → getInventorySummaries()
 */

import { useState, useCallback } from 'react';
import { Boxes, RefreshCw, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkuBadge } from '@/components/system/SkuBadge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { SpApiError } from '@/lib/sp-api-error';

export interface FbaInventoryRecord {
  sku: string;
  fnsku: string;
  asin: string;
  localAts: number;
  fbaQuantity: number;
  fbaFulfillable: number;
  fbaInboundWorking: number;
  fbaInboundShipped: number;
  fbaInboundReceiving: number;
  lastUpdated: string;
  syncedAt: string | null;
}

interface FbaInventorySyncProps {
  records: FbaInventoryRecord[];
  onSync: () => Promise<void>;
  onDisconnect?: () => void;
  isSyncing?: boolean;
  lastSyncAt?: string | null;
  amazonConfigStatus?: 'connected' | 'disconnected' | 'pending_setup';
  errorMessage?: string | null;
}

function SyncStatusBadge({ status }: { status: 'synced' | 'stale' | 'error' | 'never' }) {
  const config = {
    synced: { icon: <CheckCircle className="size-3.5" />, label: 'Synced', className: 'bg-green-100 text-green-700' },
    stale: { icon: <Clock className="size-3.5" />, label: 'Stale', className: 'bg-yellow-100 text-yellow-700' },
    error: { icon: <AlertTriangle className="size-3.5" />, label: 'Error', className: 'bg-red-100 text-red-700' },
    never: { icon: <Clock className="size-3.5" />, label: 'Never synced', className: 'bg-gray-100 text-gray-500' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.className}`}>
      {c.icon} {c.label}
    </span>
  );
}

function ATSChange({ oldVal, newVal }: { oldVal: number; newVal: number }) {
  const diff = newVal - oldVal;
  if (diff === 0) return null;
  const positive = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ml-1 ${positive ? 'text-green-600' : 'text-red-600'}`}>
      {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {positive ? '+' : ''}{diff}
    </span>
  );
}

export function FbaInventorySync({
  records,
  onSync,
  onDisconnect,
  isSyncing = false,
  lastSyncAt,
  amazonConfigStatus = 'disconnected',
  errorMessage,
}: FbaInventorySyncProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    setLocalError(null);
    try {
      await onSync();
    } catch (e) {
      const msg = e instanceof SpApiError
        ? `SP-API error: ${e.message}`
        : e instanceof Error
        ? e.message
        : 'Sync failed';
      setLocalError(msg);
    }
  }, [onSync]);

  // Total ATS across all SKUs
  const totalLocalAts = records.reduce((sum, r) => sum + r.localAts, 0);
  const totalFbaFulfillable = records.reduce((sum, r) => sum + r.fbaFulfillable, 0);
  const totalCombined = totalLocalAts + totalFbaFulfillable;

  const isConnected = amazonConfigStatus === 'connected';
  const isPending = amazonConfigStatus === 'pending_setup';

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes className="size-5 text-orange-600" />
          <h3 className="font-medium">FBA Inventory Sync</h3>
          <SyncStatusBadge
            status={!isConnected ? 'never' : errorMessage ? 'error' : lastSyncAt ? 'synced' : 'never'}
          />
        </div>
        <div className="flex gap-2 items-center">
          {lastSyncAt && (
            <span className="text-xs text-muted-foreground">
              Last sync: {new Date(lastSyncAt).toLocaleString('en-GB', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={!isConnected || isSyncing || isPending}
          >
            <RefreshCw className={`size-3.5 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Not connected state */}
      {amazonConfigStatus === 'pending_setup' && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-orange-300 bg-orange-50 text-sm">
          <AlertTriangle className="size-5 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-orange-800">Amazon SP-API not configured</p>
            <p className="text-orange-700 text-xs mt-0.5">
              Connect your Seller Central account in Settings → Integrations to sync FBA inventory.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {(localError || errorMessage) && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm">
          <AlertTriangle className="size-4 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{localError ?? errorMessage}</span>
        </div>
      )}

      {/* Summary Cards */}
      {isConnected && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">PrimeOS Local ATS</p>
              <p className="text-xl font-bold">{totalLocalAts.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">FBA Fulfillable</p>
              <p className="text-xl font-bold text-orange-600">{totalFbaFulfillable.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Combined ATS</p>
              <p className="text-xl font-bold text-green-600">{totalCombined.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inventory Table */}
      {isConnected && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium">SKU Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>FNSKU</TableHead>
                  <TableHead className="text-right">Local ATS</TableHead>
                  <TableHead className="text-right">FBA Inbound</TableHead>
                  <TableHead className="text-right">FBA Fulfillable</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No FBA inventory records. Connect Amazon to sync.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((rec) => {
                    const total = rec.localAts + rec.fbaFulfillable;
                    const fillPct = total > 0 ? (rec.fbaFulfillable / total) * 100 : 0;
                    const syncAge = rec.syncedAt
                      ? (Date.now() - new Date(rec.syncedAt).getTime()) / 86_400_000
                      : null;
                    return (
                      <TableRow key={rec.sku} className="group hover:bg-muted/30">
                        <TableCell>
                          <SkuBadge sku={rec.sku} size="compact" />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{rec.fnsku}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {rec.localAts.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-orange-600">
                          +{(rec.fbaInboundWorking + rec.fbaInboundShipped + rec.fbaInboundReceiving).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium text-orange-700">
                          {rec.fbaFulfillable.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {total.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={fillPct} className="h-1.5 w-16" />
                            <span className="text-xs text-muted-foreground">
                              {syncAge !== null && syncAge < 1
                                ? `${Math.round(syncAge * 24 * 60)}m ago`
                                : syncAge !== null
                                ? `${Math.round(syncAge)}d ago`
                                : '—'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Disconnect */}
      {isConnected && onDisconnect && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDisconnect}
          >
            Disconnect Amazon
          </Button>
        </div>
      )}
    </div>
  );
}
