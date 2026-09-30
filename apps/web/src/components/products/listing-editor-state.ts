import type { ChannelWizardDraft } from './ChannelListingWizard';
import type { PriceQuote } from '@/lib/pricing-rules';

export type ListingEditorTab = 'listing' | 'sku-mapping' | 'variants-media' | 'price-inventory' | 'requirements' | 'review' | 'master';
export type ListingIssue = { field: string; label: string; message: string; tab: ListingEditorTab };
export type ListingInventorySource = { value: string; label: string; quantity: number | null; byVariant?: Record<string, number | null> };
export const wholeQuantity = (value: string) => value.trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0;

export function listingInventoryPreview(form: ChannelWizardDraft, sources: ListingInventorySource[], variants: string[], channel: string) {
  const source = sources.find(item => item.value === form.warehouse);
  const values = source?.byVariant ? variants.map(id => source.byVariant![id]) : [source?.quantity];
  const known = values.length > 0 && values.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0);
  const available = known ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
  const external = channel === 'amazon' && form.fulfillment === 'FBA';
  const disabled = form.sync_policy === 'disabled';
  const validBuffer = !form.safety_buffer.trim() || wholeQuantity(form.safety_buffer);
  const validCap = !form.allocation_cap.trim() || wholeQuantity(form.allocation_cap);
  const calculated = available === null || !validBuffer || !validCap ? null : Math.min(Math.max(0, available - Number(form.safety_buffer || 0)), form.allocation_cap.trim() ? Number(form.allocation_cap) : Infinity);
  const quantity = external || disabled ? null : form.sync_policy === 'manual' ? (wholeQuantity(form.stock_quantity) ? Number(form.stock_quantity) : null) : calculated;
  return { source, available, quantity, external, disabled, validBuffer, validCap };
}

export function listingEditorIssues(form: ChannelWizardDraft, channel: string, variants: string[], quote: PriceQuote | undefined, inventory: ReturnType<typeof listingInventoryPreview>): ListingIssue[] {
  const result: ListingIssue[] = [];
  const require = (missing: boolean, field: string, label: string, tab: ListingEditorTab, message = `Enter ${label.toLowerCase()} to continue.`) => {
    if (missing) result.push({ field, label, tab, message });
  };
  require(!form.listing_sku.trim(), 'listing_sku', 'Listing SKU', 'listing');
  require(channel === 'webstore' && !form.web_slug.trim(), 'web_slug', 'Storefront URL', 'listing');
  require(channel === 'pos' && !form.pos_barcode.trim(), 'pos_barcode', 'POS barcode', 'listing');
  require(channel === 'social' && !form.visibility, 'visibility', 'Sales visibility', 'listing');
  require(!variants.length, 'variants', 'Variants to publish', 'variants-media', 'Include at least one SKU.');
  require(!form.media_scope, 'media_scope', 'Media selection', 'variants-media', 'Choose which images this listing will use.');
  require(Boolean(quote?.error), 'price', 'Listing price', 'price-inventory', quote?.error);
  require(!form.sync_policy, 'sync_policy', 'Stock sync policy', 'price-inventory', 'Choose how stock is sent to this channel.');
  if (!inventory.disabled && !inventory.external) {
    require(!form.warehouse, 'warehouse', 'Inventory source', 'price-inventory', 'Choose a stock source.');
    require(!inventory.validBuffer, 'safety_buffer', 'Safety buffer', 'price-inventory', 'Enter a whole number of zero or more.');
    require(!inventory.validCap, 'allocation_cap', 'Allocation cap', 'price-inventory', 'Enter a whole number of zero or more, or leave empty for no cap.');
    require(form.sync_policy === 'manual' && !wholeQuantity(form.stock_quantity), 'stock_quantity', 'Quantity to send', 'price-inventory', 'Enter a whole number of zero or more.');
    require(form.sync_policy === 'automatic' && Boolean(form.warehouse) && inventory.available === null, 'warehouse', 'Inventory source', 'price-inventory', 'No recorded stock for all selected SKUs at this source. Choose another source or record stock in Master.');
  }
  require(['shopee', 'lazada', 'tiktok', 'rakuten'].includes(channel) && !form.category.trim(), 'category', 'Channel category', 'requirements');
  require(['shopee', 'lazada'].includes(channel) && !form.shipping_option, 'shipping_option', 'Shipping option', 'requirements', 'Choose a shipping service.');
  require(['amazon', 'rakuten'].includes(channel) && !form.identifier.trim(), 'identifier', channel === 'amazon' ? 'ASIN / catalog match' : 'Catalog ID', 'requirements');
  require(channel === 'amazon' && !form.condition, 'condition', 'Condition', 'requirements', 'Choose the product condition.');
  require(channel === 'amazon' && !form.fulfillment, 'fulfillment', 'Fulfillment', 'price-inventory', 'Choose FBA or merchant fulfillment.');
  return result;
}

export function prefillListingDraft(draft: ChannelWizardDraft, channel: string, masterSku: string, productName: string, rakutenBrandName = '') {
  const prefix = ({ webstore: 'WEB', pos: 'POS', tiktok: 'TTS' } as Record<string, string>)[channel] || channel.slice(0, 3).toUpperCase();
  const slug = (productName || masterSku).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    ...draft,
    brand: channel === 'rakuten' && !draft.brand.trim() ? rakutenBrandName : draft.brand,
    listing_sku: draft.listing_sku || (masterSku ? `${prefix}-${masterSku}` : ''),
    web_slug: draft.web_slug || (channel === 'webstore' && slug ? `/products/${slug}` : ''),
  };
}
