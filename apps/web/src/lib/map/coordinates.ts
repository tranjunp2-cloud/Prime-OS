// Geo coordinate resolution utility — referenced by WarehouseTable

export interface GeoCoordinate {
  lat: number;
  lng: number;
  source?: 'coordinates' | 'map_xy' | 'missing';
}

export function resolveGeoCoordinates(
  raw?: { lat: number | null; lng: number | null; map_x?: number | null; map_y?: number | null } | null,
): GeoCoordinate | null {
  if (!raw) return null;
  if (raw.lat && raw.lng) return { lat: raw.lat, lng: raw.lng, source: 'coordinates' };
  if (raw.map_x && raw.map_y) return { lat: raw.map_x, lng: raw.map_y, source: 'map_xy' };
  return null;
}

export function hasMapLocation(warehouse: { lat: number | null; lng: number | null; map_x?: number | null; map_y?: number | null }): boolean {
  return resolveGeoCoordinates(warehouse) !== null;
}

export function haversineDistance(a: GeoCoordinate, b: GeoCoordinate): number {
  const R = 6371; // km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c = 2 * Math.asin(Math.sqrt(sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng));
  return R * c;
}
