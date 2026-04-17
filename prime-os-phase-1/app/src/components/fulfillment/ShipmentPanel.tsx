import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Truck, Package, Plus } from 'lucide-react';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';
import { CARRIER_LABELS, type Shipment, type CarrierCode } from '@/lib/fulfillment-types';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDateTime } from '@/lib/i18n/format';
import { getLocalizedCarrierLabel } from '@/lib/i18n/ops-labels';

interface ShipmentPanelProps {
  shipments: Shipment[];
  isReadOnly: boolean;
  onCreateShipment: (data: { carrierCode: string; trackingNumber?: string; serviceLevel?: string }) => void;
  onMarkShipped: (shipmentId: string, trackingNumber?: string) => void;
  isCreating?: boolean;
  isShipping?: boolean;
}

export function ShipmentPanel({
  shipments,
  isReadOnly,
  onCreateShipment,
  onMarkShipped,
  isCreating,
  isShipping,
}: ShipmentPanelProps) {
  const { locale, t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [carrierCode, setCarrierCode] = useState<string>('yamato');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [serviceLevel, setServiceLevel] = useState('');

  const handleCreate = () => {
    onCreateShipment({
      carrierCode,
      trackingNumber: trackingNumber || undefined,
      serviceLevel: serviceLevel || undefined,
    });
    setCreateOpen(false);
    setCarrierCode('yamato');
    setTrackingNumber('');
    setServiceLevel('');
  };

  const handleShip = () => {
    if (selectedShipment) {
      onMarkShipped(selectedShipment.id, trackingNumber || selectedShipment.tracking_number || undefined);
    }
    setShipOpen(false);
    setSelectedShipment(null);
    setTrackingNumber('');
  };

  const openShipDialog = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setTrackingNumber(shipment.tracking_number || '');
    setShipOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="size-5 text-muted-foreground" />
          <h3 className="font-medium">{t('fulfillment.shipmentPanel.title')}</h3>
        </div>
        {!isReadOnly && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="size-4 mr-1" />
                {t('fulfillment.shipmentPanel.createShipment')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('fulfillment.shipmentPanel.createShipmentTitle')}</DialogTitle>
                <DialogDescription>{t('fulfillment.shipmentPanel.createShipmentDesc')}</DialogDescription>
              </DialogHeader>
              <div className="flex py-4 flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{t('fulfillment.shipmentPanel.carrier')}</Label>
                  <Select value={carrierCode} onValueChange={setCarrierCode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CARRIER_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {getLocalizedCarrierLabel(code as CarrierCode, t) || label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t('fulfillment.shipmentPanel.trackingNumberOptional')}</Label>
                  <Input
                    placeholder={t('fulfillment.shipmentPanel.trackingNumberPlaceholder')}
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t('fulfillment.shipmentPanel.serviceLevelOptional')}</Label>
                  <Input
                    placeholder={t('fulfillment.shipmentPanel.serviceLevelPlaceholder')}
                    value={serviceLevel}
                    onChange={(e) => setServiceLevel(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  {t('fulfillment.shipmentPanel.cancel')}
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {t('fulfillment.shipmentPanel.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {shipments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="size-8 mx-auto mb-2 opacity-50" />
          <p>{t('fulfillment.shipmentPanel.noShipmentsYet')}</p>
          {!isReadOnly && <p className="text-sm">{t('fulfillment.shipmentPanel.noShipmentsDesc')}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shipments.map((shipment) => (
            <Card key={shipment.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {getLocalizedCarrierLabel(shipment.carrier_code as CarrierCode, t) || CARRIER_LABELS[shipment.carrier_code as CarrierCode] || shipment.carrier_code}
                    <ShipmentStatusBadge status={shipment.status} />
                  </CardTitle>
                  {!isReadOnly && shipment.status === 'draft' && (
                    <Button size="sm" onClick={() => openShipDialog(shipment)}>
                      {t('fulfillment.shipmentPanel.markShipped')}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="py-3 pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('fulfillment.shipmentPanel.tracking')}:</span>
                    <span className="ml-2 font-mono">{shipment.tracking_number || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('fulfillment.shipmentPanel.service')}:</span>
                    <span className="ml-2">{shipment.service_level || '—'}</span>
                  </div>
                  {shipment.shipped_at && (
                    <div>
                      <span className="text-muted-foreground">{t('fulfillment.shipmentPanel.shippedLabel')}:</span>
                      <span className="ml-2">{formatLocalizedDateTime(locale, shipment.shipped_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mark Shipped Dialog */}
      <Dialog open={shipOpen} onOpenChange={setShipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('fulfillment.shipmentPanel.markAsShippedTitle')}</DialogTitle>
            <DialogDescription>{t('fulfillment.shipmentPanel.markAsShippedDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex py-4 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>{t('fulfillment.shipmentPanel.tracking')}</Label>
              <Input
                placeholder={t('fulfillment.shipmentPanel.trackingNumberPlaceholder')}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipOpen(false)}>
              {t('fulfillment.shipmentPanel.cancel')}
            </Button>
            <Button onClick={handleShip} disabled={isShipping}>
              {t('fulfillment.shipmentPanel.confirmShip')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
