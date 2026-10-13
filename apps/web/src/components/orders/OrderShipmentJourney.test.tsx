// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OrderShipmentJourney } from './OrderShipmentJourney';
import { getShipmentHistory } from '@/lib/order-shipment-history';
import { demoOrders } from '../../../../../packages/order-workflow/demo-orders.js';
import type { OrderRecord, ShipmentTrackingEvent } from '@/lib/orders-api';

const record = (shipments: OrderRecord['shipments'], source = 'manual') => ({id: 'ORDER-TEST', orderKey: 'ORDER-TEST', source, shipments, canonicalStatus: 'shipped'} as OrderRecord);
afterEach(cleanup);
describe('Shipment journey', () => {
  it('shows an honest empty state before a tracking number exists', () => {
    render(<OrderShipmentJourney order={record([])} onUpdated={()=>{}} />);
    expect(screen.getByText('Create a shipment to start tracking its journey.')).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
  it('distinguishes seller evidence from carrier updates and never invents intermediate scans', () => {
    render(<OrderShipmentJourney order={record([{carrier:'GHN', tracking:'TEST', status:'Delivered', pickedUpAt:'2026-10-08T01:00:00Z', deliveredAt:'2026-10-08T05:00:00Z'}])} onUpdated={()=>{}} />);
    const events=within(screen.getByRole('list',{name:'Latest tracking events for TEST'}));
    expect(events.getAllByRole('listitem')).toHaveLength(2);
    expect(events.getAllByText(/Seller record/)).toHaveLength(2);
    expect(events.queryByText('In transit')).not.toBeInTheDocument();
    expect(screen.getByText(/No carrier tracking updates received/)).toBeVisible();
    expect(screen.queryByRole('button',{name:'Simulate tracking update'})).not.toBeInTheDocument();
  });
  it('scopes carrier histories per parcel, orders newest first and expands older events', () => {
    const statuses=['picked_up','in_transit','out_for_delivery','delivery_failed'] as const;
    const events: ShipmentTrackingEvent[]=statuses.map((status,i)=>({id:String(i),status,occurredAt:`2026-10-08T0${i}:00:00Z`,source:'carrier',location:`Hub ${i}`}));
    render(<OrderShipmentJourney order={record([{id:'a',carrier:'GHN',tracking:'PARCEL-A',status:'Failed',trackingEvents:events},{id:'b',carrier:'SPX',tracking:'PARCEL-B',status:'In transit'}])} onUpdated={()=>{}} />);
    const first=within(screen.getByRole('group',{name:'Journey for PARCEL-A'}));
    const second=within(screen.getByRole('group',{name:'Journey for PARCEL-B'}));
    expect(first.getAllByRole('listitem')[0]).toHaveTextContent('Delivery failed');
    expect(first.getByText('Hub 3')).toBeVisible();
    expect(first.queryByText('Picked up')).not.toBeInTheDocument();
    expect(second.queryByText('Delivery failed')).not.toBeInTheDocument();
    expect(second.getByText('No delivery events have been recorded yet.')).toBeVisible();
    fireEvent.click(first.getByRole('button', {name: 'View full history (4)'}));
    const history = within(screen.getByRole('dialog', {name: 'Delivery history'}));
    expect(history.getByText('Picked up')).toBeVisible();
    expect(history.getAllByRole('listitem')).toHaveLength(4);
    expect(history.getAllByRole('listitem')[0]).toHaveTextContent('Delivery failed');
    expect(history.queryByText('PARCEL-B')).not.toBeInTheDocument();
    fireEvent.click(history.getByRole('button', {name: 'Close'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('does not duplicate carrier events or the same recorded delivery milestone', () => {
    const event: ShipmentTrackingEvent={id:'provider-1',status:'delivered',occurredAt:'2026-10-08T05:00:00Z',source:'carrier'};
    expect(getShipmentHistory({carrier:'GHN',tracking:'TEST',status:'Delivered',deliveredAt:event.occurredAt,trackingEvents:[event,event]})).toEqual([event]);
  });
  it('shows store collection history for the existing POS example without carrier scans', () => {
    const pickup = (demoOrders() as OrderRecord[]).find(order => order.orderKey === 'POS-240812-0931')!;
    render(<OrderShipmentJourney order={pickup} onUpdated={()=>{}} />);
    const history = within(screen.getByRole('list', {name: `Latest tracking events for ${pickup.shipments[0].tracking}`}));
    expect(history.getAllByRole('listitem').map(item => item.textContent)).toEqual([
      expect.stringContaining('Collected by customer'), expect.stringContaining('Ready for collection'), expect.stringContaining('Pickup arranged'),
    ]);
    expect(history.getAllByText('District 1 Branch')).toHaveLength(3);
    expect(screen.queryByText('Simulated tracking · No carrier connection')).not.toBeInTheDocument();
    expect(history.queryByText('In transit')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Simulate tracking update'})).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Pickup history'})).toBeVisible();
    expect(screen.getByText(`Order reference · ${pickup.orderKey}`)).toBeVisible();
    expect(screen.queryByText(/DEMO-GHN-2/)).not.toBeInTheDocument();
    expect(history.queryByText('Customer collected the order at the store.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'View full history (3)'}));
    const expanded = within(screen.getByRole('dialog', {name: 'Pickup history'}));
    expect(expanded.getAllByRole('listitem')).toHaveLength(3);
    expect(expanded.getByText('Customer collected the order at the store.')).toBeVisible();
  });
  it('preserves genuine pickup references and hides carrier label links for store collection', () => {
    render(<OrderShipmentJourney order={record([{deliveryMethod: 'store_pickup', carrier: 'Store pickup', tracking: 'PICKUP-123', status: 'Delivered', labelUrl: 'https://example.com/label'}])} onUpdated={()=>{}} />);
    expect(screen.getByText('Pickup reference · PICKUP-123')).toBeVisible();
    expect(screen.queryByRole('link', {name: 'Open carrier label'})).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
  it('does not manufacture an actual delivery history from a final status alone', () => {
    render(<OrderShipmentJourney order={record([{carrier: 'GHN', tracking: 'REAL-123', status: 'Delivered'}])} onUpdated={()=>{}} />);
    expect(screen.getByText('No delivery events have been recorded yet.')).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /View full history/})).not.toBeInTheDocument();
  });
});
