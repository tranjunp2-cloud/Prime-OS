// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OrderShipmentJourney } from './OrderShipmentJourney';
import { getShipmentHistory } from '@/lib/order-shipment-history';
import type { OrderRecord, ShipmentTrackingEvent } from '@/lib/orders-api';

const record = (shipments: OrderRecord['shipments'], source = 'manual') => ({source, shipments, canonicalStatus: 'shipped'} as OrderRecord);
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
    expect(first.getByText('Picked up')).not.toBeVisible();
    fireEvent.click(first.getByText('Show 1 earlier events'));
    expect(first.getByText('Picked up')).toBeVisible();
    expect(second.queryByText('Delivery failed')).not.toBeInTheDocument();
    expect(second.getByText(/No carrier tracking updates/)).toBeVisible();
  });
  it('does not duplicate carrier events or the same recorded delivery milestone', () => {
    const event: ShipmentTrackingEvent={id:'provider-1',status:'delivered',occurredAt:'2026-10-08T05:00:00Z',source:'carrier'};
    expect(getShipmentHistory({carrier:'GHN',tracking:'TEST',status:'Delivered',deliveredAt:event.occurredAt,trackingEvents:[event,event]})).toEqual([event]);
  });
});
