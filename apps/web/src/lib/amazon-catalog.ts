// Amazon Catalog — mock search integration
// Demo: returns mock data matching query
// Production: wire to AmazonSpApiClient.getCatalogItem()

export interface AmazonVariant {
  asin: string;
  sku?: string;
  upc?: string;
  variationAttributes: Record<string, string>; // e.g. { Flavor: 'Matcha', Size: '100g' }
  images?: string[];
  msrp?: number;
}

export interface AmazonCatalogProduct {
  asin: string;
  title: string;
  brand: string;
  category: string;
  images: string[];
  attributes: Record<string, string>;
  bullet_points: string[];
  msrp?: number;
  currency?: string;
  parentAsin?: string;        // set if this is a child variant
  variationAttributes?: Record<string, string>; // e.g. { Flavor: 'Matcha', Size: '100g' }
  variants?: AmazonVariant[]; // populated if parent has variation children
}

// Mock catalog data — includes parent products with nested variants
const MOCK_CATALOG: AmazonCatalogProduct[] = [
  {
    asin: 'B0C7K8HTSB',
    title: 'YEDOENSIS Premium Matcha - Organic Japanese Green Tea Matcha Powder, JAS Certified Organic, Vegan, Gluten-Free',
    brand: 'YEDOENSIS',
    category: 'Food & Beverages > Tea',
    images: ['https://placehold.co/300x300/png?text=Matcha'],
    attributes: { certification: 'JAS Organic', weight: '100g' },
    bullet_points: [
      'JAS Certified Organic Matcha',
      'Premium ceremonial grade',
      'Vegan & Gluten-Free',
    ],
    msrp: 43545,
    currency: 'JPY',
    variants: [
      {
        asin: 'B0FCCC94GF',
        upc: '704715449528',
        variationAttributes: { Flavor: 'Matcha', Size: '100g' },
        images: ['https://placehold.co/300x300/png?text=Matcha+100g'],
        msrp: 43545,
      },
      {
        asin: 'B0FCCC94GH',
        upc: '704715449528',
        variationAttributes: { Flavor: 'Matcha', Size: '40g' },
        images: ['https://placehold.co/300x300/png?text=Matcha+40g'],
        msrp: 19800,
      },
    ],
  },
  {
    asin: 'B08N5WRWNW',
    title: 'SoundMax Wireless Bluetooth Headphones Over Ear',
    brand: 'SoundMax',
    category: 'Electronics > Portable Audio',
    images: ['https://placehold.co/300x300/png?text=Headphones'],
    attributes: { color: 'Black', connectivity: 'Bluetooth 5.0', noise_cancellation: 'Active' },
    bullet_points: ['30-hour battery', 'Active noise cancellation', 'Hi-Res Audio'],
    msrp: 24800,
    currency: 'JPY',
  },
  {
    asin: 'B07XJ8C8F5',
    title: 'WorkFlex Ergonomic Aluminum Laptop Stand',
    brand: 'WorkFlex',
    category: 'Electronics > Accessories',
    images: ['https://placehold.co/300x300/png?text=Laptop+Stand'],
    attributes: { material: 'Aluminum', height_levels: '6', foldable: 'Yes' },
    bullet_points: ['Foldable', '6 height levels', 'Heat dissipation'],
    msrp: 6800,
    currency: 'JPY',
  },
  {
    asin: 'B0XXXXYYYY',
    title: 'SoundMax Pro Wireless Headphones',
    brand: 'SoundMax',
    category: 'Electronics > Portable Audio',
    images: ['https://placehold.co/300x300/png?text=SMX+Pro'],
    attributes: { color: 'Black', noise_cancellation: 'Hybrid ANC', battery: '40h' },
    bullet_points: ['Hybrid ANC', '40-hour battery', 'Premium foam'],
    msrp: 29800,
    currency: 'JPY',
  },
];

/**
 * Search Amazon catalog by keyword.
 * Demo: fuzzy match on title, brand, ASIN.
 * Production: call Amazon SP-API /catalog/2022-04-01 endpoint.
 */
export async function searchAmazonCatalog(query: string): Promise<AmazonCatalogProduct[]> {
  if (!query.trim()) return [];

  // Simulate network delay
  await new Promise(r => setTimeout(r, 300));

  const q = query.toLowerCase();
  // Also search inside variant children
  const results: AmazonCatalogProduct[] = [];
  const seenAsins = new Set<string>();

  for (const p of MOCK_CATALOG) {
    if (
      p.title.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.asin.toLowerCase().includes(q)
    ) {
      if (!seenAsins.has(p.asin)) {
        results.push(p);
        seenAsins.add(p.asin);
      }
    }
    // Also match variants by their attributes
    if (p.variants) {
      for (const v of p.variants) {
        if (
          v.asin.toLowerCase().includes(q) ||
          Object.values(v.variationAttributes).some(val =>
            val.toLowerCase().includes(q)
          )
        ) {
          // Return the parent product (with variants) so user can pick
          if (!seenAsins.has(p.asin)) {
            results.push(p);
            seenAsins.add(p.asin);
          }
        }
      }
    }
  }

  return results;
}

/**
 * Get a specific ASIN from catalog. Returns parent with variants if applicable.
 */
export async function getAmazonProductByAsin(asin: string): Promise<AmazonCatalogProduct | null> {
  await new Promise(r => setTimeout(r, 150));
  return MOCK_CATALOG.find(p => p.asin === asin) ?? null;
}
