import { useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRightLeft, Plus, Warehouse as WarehouseIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { MyWarehouses } from '@/components/inventory/MyWarehouses';
import { AdjustWarehouseStockDialog } from '@/components/inventory/AdjustWarehouseStockDialog';
import { ManageStockHoldsDialog } from '@/components/inventory/ManageStockHoldsDialog';
import { StockActivityDrawer } from '@/components/inventory/StockActivityDrawer';
import { TransferStockDrawer } from '@/components/inventory/TransferStockDrawer';
import { AddWarehouseStockDrawer, CreateWarehouseDrawer } from '@/components/inventory/WarehouseSetup';
import { LinkWarehouseShopsDrawer } from '@/components/inventory/LinkWarehouseShopsDrawer';
import type { StockAdjustmentTarget, StockLocation } from '@/components/inventory/WarehouseStockTable';
import { getWarehouses } from '@/lib/warehouse-store';
import { getProducts } from '@/lib/product-store';
import { getInventoryPositions, subscribeInventory } from '@/lib/inventory-store';
import { availabilityAt } from '@/lib/warehouse-availability';
import { receiveWarehouseTransfer } from '@/lib/warehouse-transfers';
import { DEMO_WAREHOUSE_ALIASES } from '@/lib/demo-warehouse-locations';

const warehouseLocations = () => getWarehouses().filter(warehouse => !DEMO_WAREHOUSE_ALIASES[warehouse.id]);

export default function Warehouses() {
  const [params, setParams] = useSearchParams();
  const warehouseId = params.get('warehouse') ?? '';
  const selectWarehouse = (id: string) => setParams(current => { const next = new URLSearchParams(current); if (id) next.set('warehouse', id); else next.delete('warehouse'); return next; });
  const [warehouses, setWarehouses] = useState(warehouseLocations);
  const [products, setProducts] = useState(() => getProducts());
  const [createOpen, setCreateOpen] = useState(false);
  const [adjustmentTarget, setAdjustmentTarget] = useState<Partial<StockAdjustmentTarget> | null>(null);
  const [transferTarget, setTransferTarget] = useState<Partial<StockAdjustmentTarget> | null>(null);
  const [addStockWarehouse, setAddStockWarehouse] = useState<StockLocation | null>(null);
  const [linkWarehouse, setLinkWarehouse] = useState<StockLocation | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [returnToHistory, setReturnToHistory] = useState(false);
  const [holdActionOpen, setHoldActionOpen] = useState(false);
  const [recentId, setRecentId] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const positions = useSyncExternalStore(subscribeInventory, getInventoryPositions, getInventoryPositions);
  const finish = (id?: string, message?: string) => {
    setProducts(getProducts());
    if (id) setRecentId(id);
    if (message) setResult(message);
    if (returnToHistory) setHistoryOpen(true);
    setReturnToHistory(false);
  };
  return <div className="min-w-0 space-y-4 overflow-x-clip p-4 md:p-6">
    <WorkspacePageHeader title="My warehouses" description="Locations, stock and linked shops." icon={WarehouseIcon} actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setHistoryOpen(true)}><ArrowRightLeft className="size-4" />Stock activity</Button><Button onClick={() => setCreateOpen(true)}><Plus className="size-4" />Add warehouse</Button></div>} />
    {result && <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-2 text-sm"><p className="min-w-0 flex-1">{result}</p>{recentId && <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(true)}>View activity</Button>}<Button size="icon" variant="ghost" className="size-8" aria-label="Dismiss result" onClick={() => setResult('')}><X className="size-4" /></Button></div>}
    <MyWarehouses warehouseId={warehouseId} onSelectWarehouse={selectWarehouse} onAddStock={setAddStockWarehouse} onLinkShops={setLinkWarehouse} onTransferStock={setTransferTarget} positions={positions} onAdjustStock={setAdjustmentTarget} warehouses={warehouses} products={products} initialSearch={params.get('sku') ?? ''} />
    <StockActivityDrawer open={historyOpen} onOpenChange={setHistoryOpen} products={products} warehouses={warehouses} recentId={recentId} onPrepareDestination={(productId, id, sku) => { setHistoryOpen(false); setReturnToHistory(true); const product = products.find(item => item.id === productId); setAdjustmentTarget({ product, warehouse: warehouses.find(item => item.id === id), sku, initializeLocation: true }); }} onReceive={(productId, id) => { const record = receiveWarehouseTransfer(productId, id); finish(id, `Received ${record.quantity} units at ${warehouses.find(w => w.id === record.toWarehouseId)?.name}. Warehouse stock updated; marketplace quantities unchanged.`); }} onNewAction={action => {
      setHistoryOpen(false); setReturnToHistory(true);
      if (action === 'transfer') setTransferTarget({ warehouse: warehouses.find(item => item.id === warehouseId) });
      else if (action === 'receipt') setAdjustmentTarget({ warehouse: warehouses.find(item => item.id === warehouseId), mode: 'receive' });
      else if (action === 'adjustment') setAdjustmentTarget({ warehouse: warehouses.find(item => item.id === warehouseId) });
      else setHoldActionOpen(true);
    }} />
    {createOpen && <CreateWarehouseDrawer onClose={() => setCreateOpen(false)} onCreated={warehouse => { setWarehouses(warehouseLocations()); selectWarehouse(warehouse.id); setCreateOpen(false); setResult(''); setRecentId(null); }} />}
    {addStockWarehouse && <AddWarehouseStockDrawer warehouse={addStockWarehouse} products={products} onClose={() => setAddStockWarehouse(null)} onSaved={ids => { setAddStockWarehouse(null); finish(ids[0], `Opening stock saved for ${ids.length} ${ids.length === 1 ? 'SKU' : 'SKUs'}. You can now set this as a shop’s default warehouse or continue managing stock.`); }} />}
    {linkWarehouse && <LinkWarehouseShopsDrawer warehouse={linkWarehouse} onClose={() => setLinkWarehouse(null)} />}
    {adjustmentTarget && <AdjustWarehouseStockDialog lockProduct={Boolean(adjustmentTarget.product)} initializeLocation={adjustmentTarget.initializeLocation} target={adjustmentTarget} products={products} warehouses={warehouses} onClose={() => { setAdjustmentTarget(null); finish(); }} onSaved={id => {
      const product = getProducts().find(item => item.inventory_adjustments?.some(record => record.id === id))!;
      const record = product.inventory_adjustments!.find(item => item.id === id)!;
      const stock = availabilityAt(product, [record.warehouseId], getInventoryPositions(), record.sku);
      setAdjustmentTarget(null);
      finish(id, `${record.sku}: ${record.before ?? 'Not recorded'} → ${record.after} at ${warehouses.find(w => w.id === record.warehouseId)?.name}. Available: ${stock.atp.quantity ?? 'needs setup'}. Marketplace quantities unchanged.`);
    }} />}
    {transferTarget && <TransferStockDrawer products={products} target={transferTarget} onClose={() => { setTransferTarget(null); finish(); }} onSaved={(id, inTransit) => { setTransferTarget(null); finish(id, inTransit ? 'Transfer started. The source count is updated; confirm receipt in Stock activity to add stock at the destination.' : 'Completed transfer recorded. Both warehouse counts updated; marketplace quantities unchanged.'); }} />}
    {holdActionOpen && <ManageStockHoldsDialog products={products} onClose={() => { setHoldActionOpen(false); finish(); }} onSaved={id => { setHoldActionOpen(false); finish(id, 'Holds saved. Available stock recalculated; physical stock unchanged.'); }} />}
  </div>;
}
