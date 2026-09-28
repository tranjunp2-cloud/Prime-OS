// Product Validator — shared validation logic
// ECH Audit: validates Product Master data completeness before publish

import type { Product } from './product-store';
import type { CatalogAttribute } from './product-catalog-settings-store';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
}

/**
 * Validate a product before save/submit.
 * Covers all ECH compliance and data quality requirements.
 */
export function validateProduct(product: Partial<Product>): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const infos: ValidationIssue[] = [];

  // Required fields
  if (!product.name?.trim()) {
    errors.push({ field: 'name', message: 'Product name is required', severity: 'error' });
  }
  if (!product.sku_code?.trim()) {
    errors.push({ field: 'sku_code', message: 'SKU code is required', severity: 'error' });
  }
  if (!product.category?.trim()) {
    errors.push({ field: 'category', message: 'Category is required', severity: 'error' });
  }

  // Pricing
  if (product.retail_price !== undefined && product.retail_price <= 0) {
    errors.push({ field: 'retail_price', message: 'Retail price must be greater than 0', severity: 'error' });
  }
  if (product.original_price !== undefined && product.original_price < 0) {
    errors.push({ field: 'original_price', message: 'Original price cannot be negative', severity: 'error' });
  }
  if (
    product.original_price !== undefined &&
    product.retail_price !== undefined &&
    product.retail_price > 0 &&
    product.original_price > product.retail_price
  ) {
    errors.push({
      field: 'original_price',
      message: 'Original (cost) price cannot be higher than retail price',
      severity: 'error',
    });
  }

  // HS Code for cross-border
  if (!product.hs_code?.trim()) {
    warnings.push({
      field: 'hs_code',
      message: 'HS Code is required for cross-border shipping. Add it before publishing.',
      severity: 'warning',
    });
  }

  // Dimensions completeness
  const hasProductDims = [product.prod_length, product.prod_height, product.prod_width, product.prod_weight]
    .every(v => v !== undefined && v > 0);
  if (!hasProductDims) {
    warnings.push({
      field: 'dimensions',
      message: 'Product dimensions (L×H×W×weight) are recommended for shipping calculation.',
      severity: 'warning',
    });
  }

  const hasPackageDims = [product.pkg_length, product.pkg_height, product.pkg_width, product.pkg_weight]
    .every(v => v !== undefined && v > 0);
  if (!hasPackageDims) {
    warnings.push({
      field: 'pkg_dimensions',
      message: 'Package dimensions are recommended for accurate shipping rates.',
      severity: 'warning',
    });
  }

  // Inventory
  const totalStock = product.inventory
    ? Object.values(product.inventory).reduce((s, v) => s + v, 0)
    : 0;
  if (totalStock === 0) {
    warnings.push({
      field: 'inventory',
      message: 'No stock entered. Product may appear as out-of-stock on channels.',
      severity: 'warning',
    });
  }

  // GTIN / barcode
  if (!product.gtin?.trim()) {
    warnings.push({
      field: 'gtin',
      message: 'GTIN (barcode) is recommended for inventory management and channel listings.',
      severity: 'warning',
    });
  } else if (product.gtin && !/^\d{8,14}$/.test(product.gtin.replace(/\s/g, ''))) {
    errors.push({
      field: 'gtin',
      message: 'GTIN must be 8, 12, 13, or 14 digits.',
      severity: 'error',
    });
  }

  // Images
  if (!product.images || product.images.length === 0) {
    warnings.push({
      field: 'images',
      message: 'No images added. Products without images may have low conversion rates.',
      severity: 'warning',
    });
  }

  // Channel compliance
  if (!product.channels || product.channels.length === 0) {
    infos.push({
      field: 'channels',
      message: 'No marketplace channels configured. Product won\'t appear on Rakuten, Amazon, Shopee, etc.',
      severity: 'info',
    });
  }

  // Variant check
  if (product.has_variants && (!product.skus || product.skus.length === 0)) {
    warnings.push({
      field: 'skus',
      message: 'Product is marked as having variants but no variant SKUs were created.',
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    infos,
  };
}

/**
 * Quick SKU validation.
 * Spec rules: max 180 chars, no whitespace/control chars, letters+numbers+hyphen+underscore only.
 */
export function validateSku(sku: string, existingSkus: string[]): { valid: boolean; error?: string } {
  const trimmed = sku.trim().toUpperCase();
  if (!trimmed) return { valid: false, error: 'SKU is required' };
  if (trimmed.length > 180) {
    return { valid: false, error: `SKU must be 180 characters or fewer (currently ${trimmed.length})` };
  }
  if (!/^[A-Z0-9\-_]+$/.test(trimmed)) {
    return { valid: false, error: 'SKU can only contain letters, numbers, hyphens, and underscores' };
  }
  if (existingSkus.includes(trimmed)) {
    return { valid: false, error: `SKU "${trimmed}" already exists` };
  }
  return { valid: true };
}

/**
 * Validates a single dynamic attribute value against its declared data type.
 * Covers all 13 spec data types. Returns null when valid, error message string when invalid.
 *
 * Spec types: string | number | integer | boolean | enum | date | datetime |
 *             money | measurement | object | array | asset_ref | commerce_entity_ref
 */
export function validateAttributeValue(
  attribute: Pick<CatalogAttribute, 'type' | 'options' | 'unit' | 'validation'>,
  value: string,
): string | null {
  const v = value.trim();

  // Empty value — required check is handled upstream (not here)
  if (!v) return null;

  switch (attribute.type) {
    // ── string (plain text, rich text) ──────────────────────────────────────
    case 'String':
    case 'Rich text':
      return null; // no structural constraint at Master tier (maxLength only at Channel tier)

    // ── number (decimal allowed) ─────────────────────────────────────────────
    case 'Number':
      if (isNaN(Number(v))) return 'Must be a valid number';
      return null;

    // ── integer (whole numbers only) ─────────────────────────────────────────
    case 'Integer':
      if (!/^-?\d+$/.test(v)) return 'Must be a whole number (no decimals)';
      return null;

    // ── boolean ──────────────────────────────────────────────────────────────
    case 'Boolean':
      if (v !== 'true' && v !== 'false') return 'Must be true or false';
      return null;

    // ── enum (single-select from declared options) ───────────────────────────
    case 'Single select':
    case 'Enum': {
      const allowed = attribute.options.split(',').map(o => o.trim()).filter(Boolean);
      if (allowed.length && !allowed.includes(v)) {
        return `Must be one of: ${allowed.join(', ')}`;
      }
      return null;
    }

    // ── array (multi-select from declared options) ───────────────────────────
    case 'Multi-select':
    case 'Array': {
      const allowed = attribute.options.split(',').map(o => o.trim()).filter(Boolean);
      if (!allowed.length) return null;
      const selected = v.split(',').map(o => o.trim()).filter(Boolean);
      const invalid = selected.filter(s => !allowed.includes(s));
      if (invalid.length) return `Invalid values: ${invalid.join(', ')}`;
      return null;
    }

    // ── date (ISO 8601 YYYY-MM-DD, must be a real calendar date) ────────────
    case 'Date': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Use format YYYY-MM-DD (e.g. 2025-03-15)';
      const d = new Date(v);
      if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
        return `"${v}" is not a real calendar date`;
      }
      return null;
    }

    // ── datetime (ISO 8601 YYYY-MM-DDTHH:MM) ────────────────────────────────
    case 'Datetime': {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
        return 'Use format YYYY-MM-DDTHH:MM (e.g. 2025-03-15T14:30)';
      }
      const dt = new Date(v);
      if (isNaN(dt.getTime())) return `"${v}" is not a valid datetime`;
      return null;
    }

    // ── money {amount::currency} e.g. "1800::JPY" ───────────────────────────
    case 'Money': {
      // Stored as "amount::CURRENCY" e.g. "1800::JPY"
      const parts = v.split('::');
      if (parts.length !== 2) return 'Format: amount::CURRENCY (e.g. 1800::JPY)';
      const [amtStr, currency] = parts;
      if (isNaN(Number(amtStr)) || Number(amtStr) < 0) return 'Amount must be a non-negative number';
      if (!/^[A-Z]{3}$/.test(currency)) return 'Currency must be 3 uppercase letters (e.g. JPY, USD)';
      return null;
    }

    // ── measurement {value unit} e.g. "25 cm" ───────────────────────────────
    case 'Measurement':
    case 'Measurement set': {
      const unit = attribute.unit || 'cm';
      const numStr = v.endsWith(` ${unit}`) ? v.slice(0, -(unit.length + 1)) : v;
      const num = Number(numStr);
      if (isNaN(num)) return `Must be a number (e.g. 25 ${unit})`;
      if (num < 0) return 'Value must be 0 or greater';
      // allowedUnits check — in production, driven by attribute.allowedUnits[]
      // prototype: unit is fixed per attribute definition (attribute.unit)
      return null;
    }

    // ── object (JSON key-value) ──────────────────────────────────────────────
    case 'Object': {
      try {
        const parsed = JSON.parse(v);
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
          return 'Must be a JSON object (e.g. {"key": "value"})';
        }
      } catch {
        return 'Must be valid JSON (e.g. {"key": "value"})';
      }
      return null;
    }

    // ── asset_ref (DAM asset ID or URL in prototype) ─────────────────────────
    case 'Asset ref':
    case 'asset_ref': {
      // Prototype: accepts URL. Production: must be a DAM asset ID.
      try {
        new URL(v);
        return null;
      } catch {
        return 'Must be a valid URL (prototype) or DAM asset ID (production)';
      }
    }

    // ── commerce_entity_ref (format: cent_[a-z0-9]{8,40}) ───────────────────
    case 'Commerce entity ref':
    case 'commerce_entity_ref': {
      if (!/^cent_[a-z0-9]{8,40}$/.test(v)) {
        return 'Must match format: cent_ followed by 8–40 lowercase letters or digits (e.g. cent_abc12345)';
      }
      return null;
    }

    // ── Country selector ─────────────────────────────────────────────────────
    case 'Country selector':
      return null; // value constrained by UI select, no extra validation needed

    default:
      return null;
  }
}
