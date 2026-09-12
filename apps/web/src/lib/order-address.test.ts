import { describe, expect, it } from 'vitest';
import { orderAddressLines } from './order-address';
describe('order recipient address', () => {
  it('separates geographic fields and excludes contact and arbitrary webhook fields', () => {
    expect(orderAddressLines({address:'12 Nguyen Hue, lan@example.com, 0900123456',ward:'Ben Nghe',district:'District 1',city:'HCM',country:'VN',email:'lan@example.com',phone:'0900123456',internal:'private webhook'},'0900123456','lan@example.com')).toEqual(['12 Nguyen Hue','Ben Nghe, District 1, HCM, VN']);
  });
  it('preserves masked street text and handles missing data', () => {
    expect(orderAddressLines({address:'*** Dang Thuy Tram',city:'HCM'})).toEqual(['*** Dang Thuy Tram','HCM']);
    expect(orderAddressLines({})).toEqual([]);
  });
});
