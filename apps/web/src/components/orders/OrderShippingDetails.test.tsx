// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {demoOrders} from '../../../../../packages/order-workflow/demo-orders.js';
import type {OrderRecord} from '@/lib/orders-api';
import {OrderShippingDetails} from './OrderShippingDetails';

const pickup = () => (demoOrders() as OrderRecord[]).find(order => order.orderKey === 'POS-240812-0931')!;
afterEach(cleanup);
describe('Shipping details by delivery method', () => {
  it('shows the pickup location and stock status without unrelated carrier or parcel fields', () => {
    render(<OrderShippingDetails order={pickup()} />);
    expect(screen.getByRole('heading', {name: 'Store pickup'})).toBeVisible();
    expect(screen.getByText('District 1 Branch')).toBeVisible();
    expect(screen.getByText('Deducted from stock')).toBeVisible();
    expect(screen.queryByText('Standard')).not.toBeInTheDocument();
    expect(screen.queryByText('Parcel')).not.toBeInTheDocument();
    expect(screen.queryByText('Shipping label')).not.toBeInTheDocument();
    expect(screen.getByText('Pick list')).not.toBeVisible();
    fireEvent.click(screen.getByText('Documents'));
    expect(screen.getByText('Pick list')).toBeVisible();
    expect(screen.getByText('Packing slip')).toBeVisible();
    expect(screen.getAllByText('Printed')).toHaveLength(2);
    expect(screen.queryByText(/Opening the print dialog/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'About document status'}));
    expect(screen.getByText(/Opening the print dialog/)).toBeVisible();
  });
  it('recognizes store pickup before a shipment exists without inventing a completion state', () => {
    const order = {...pickup(), shipments: [], reservation: 'Reserved', canonicalStatus: 'allocated' as const};
    render(<OrderShippingDetails order={order} />);
    expect(screen.getByRole('heading', {name: 'Store pickup'})).toBeVisible();
    expect(screen.getByText('Reserved for this order')).toBeVisible();
    expect(screen.queryByText('Collected by customer')).not.toBeInTheDocument();
    expect(screen.queryByText('Shipping label')).not.toBeInTheDocument();
  });
  it('keeps carrier packaging and label data, using the explicit shipment route over stale pickup settings', () => {
    const order = {...pickup(), shipments: [{deliveryMethod: 'carrier' as const, carrier: 'GHN', service: 'Express', tracking: 'GHN-123', status: 'Delivered'}]};
    render(<OrderShippingDetails order={order} />);
    expect(screen.getByRole('heading', {name: 'Shipping & packaging'})).toBeVisible();
    expect(screen.getByText('GHN')).toBeVisible();
    expect(screen.getByText('· Express')).toBeVisible();
    expect(screen.getByText('1.2 kg')).toBeVisible();
    fireEvent.click(screen.getByText('Documents'));
    expect(screen.getByText('Shipping label')).toBeVisible();
    expect(screen.getAllByText('Printed')).toHaveLength(3);
  });
});
