// Variant Generator — Cartesian product for multi-level attribute groups
// Dựa trên ech-inventory-engine skill: mỗi SKU = 1 ATS row
//
// Multi-level: n attribute groups → full cartesian product
// e.g., Color × Size × Material = 3 × 3 × 2 = 18 variants

export interface VariantAttribute {
  name: string;       // e.g. "Color", "Size", "Material"
  values: string[];  // e.g. ["Red", "Blue"], ["S", "M", "L"]
}

export interface GeneratedVariant {
  sku_code: string;                    // e.g. "SMX-HP-RED-S"
  variation_name: string;              // e.g. "Red / S"
  attributes: Record<string, string>;  // e.g. { Color: "Red", Size: "S" }
  price: number;                       // final price (base + modifier)
  weight_g: number;                   // final weight (base + modifier)
  stock_per_warehouse: Record<string, number>; // raw stock per warehouse
}

interface GeneratorOptions {
  baseSku: string;                    // parent SKU code
  basePrice: number;                  // base retail price
  baseWeight: number;                 // base weight in grams
  warehouses: string[];               // warehouse IDs for stock
  skuSeparator?: string;               // default: "-"
}

/**
 * Cartesian product of n arrays.
 * cartesian([["a","b"], ["x","y"]]) → [["a","x"], ["a","y"], ["b","x"], ["b","y"]]
 */
export function cartesian<T>(arrs: T[][]): T[][] {
  return arrs.reduce<T[][]>(
    (acc, arr) => acc.flatMap(x => arr.map(v => [...x, v])),
    [[]]
  );
}

/**
 * Slugify a string for use in SKU code.
 * "Red / XL" → "RED-XL", "Hello World" → "HELLO-WORLD"
 */
export function slugify(str: string): string {
  return str.trim().replace(/\s+/g, '-').toUpperCase();
}

/**
 * Generate all variant combinations from attribute groups.
 * Returns array of GeneratedVariant — one per cartesian product row.
 */
export function generateVariants(
  attributes: VariantAttribute[],
  options: GeneratorOptions
): GeneratedVariant[] {
  const { baseSku, basePrice, baseWeight, warehouses, skuSeparator = '-' } = options;

  // Filter out empty attribute groups
  const validAttrs = attributes.filter(a => a.values.length > 0);
  if (validAttrs.length === 0) return [];

  // Cartesian product of all attribute values
  const valueArrs = validAttrs.map(a => a.values);
  const combos = cartesian(valueArrs);

  return combos.map(combo => {
    // Build attribute map: { "Color": "Red", "Size": "S" }
    const attributes: Record<string, string> = {};
    for (let i = 0; i < validAttrs.length; i++) {
      attributes[validAttrs[i].name] = combo[i];
    }

    // Build variation name: "Red / S"
    const variation_name = combo.join(' / ');

    // Build SKU: "SMX-HP-RED-S"
    const skuParts = combo.map(v => slugify(v));
    const sku_code = [baseSku, ...skuParts].join(skuSeparator);

    // Stock per warehouse (default 0)
    const stock_per_warehouse: Record<string, number> = {};
    for (const wh of warehouses) {
      stock_per_warehouse[wh] = 0;
    }

    return {
      sku_code,
      variation_name,
      attributes,
      price: basePrice,
      weight_g: baseWeight,
      stock_per_warehouse,
    };
  });
}

/**
 * Estimate total variants without generating all objects.
 * Useful for UI feedback: "This will create N variants"
 */
export function estimateVariantCount(attributes: VariantAttribute[]): number {
  const validAttrs = attributes.filter(a => a.values.length > 0);
  if (validAttrs.length === 0) return 0;
  return validAttrs.reduce((acc, a) => acc * a.values.length, 1);
}

/**
 * Check for duplicate SKUs among generated variants.
 * Returns array of duplicate sku_codes.
 */
export function findDuplicateSkus(variants: GeneratedVariant[]): string[] {
  const seen = new Map<string, number>();
  for (const v of variants) {
    seen.set(v.sku_code, (seen.get(v.sku_code) ?? 0) + 1);
  }
  return [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([sku]) => sku);
}
