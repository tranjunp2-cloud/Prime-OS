// Product Validator — shared validation logic
// ECH Audit: validates Product Master data completeness before publish

import type { Product } from './product-store';

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
 */
export function validateSku(sku: string, existingSkus: string[]): { valid: boolean; error?: string } {
  const trimmed = sku.trim().toUpperCase();
  if (!trimmed) return { valid: false, error: 'SKU is required' };
  if (!/^[A-Z0-9\-_]+$/.test(trimmed)) {
    return { valid: false, error: 'SKU can only contain letters, numbers, hyphens, and underscores' };
  }
  if (existingSkus.includes(trimmed)) {
    return { valid: false, error: `SKU "${trimmed}" already exists` };
  }
  return { valid: true };
}
