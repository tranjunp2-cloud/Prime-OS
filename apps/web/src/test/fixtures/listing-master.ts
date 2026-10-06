import type { Product } from '@/lib/product-store';
import type { MasterCompletion } from '@/lib/listing-master-completion';
import { assignedCategoryAttributes } from '@/lib/category-schema';
import { getProductCatalogSettings } from '@/lib/product-catalog-settings-store';

/** Explicit complete test data; production imports never manufacture these values. */
export function readyMasterFields(overrides: Partial<MasterCompletion> = {}): Partial<Product> & MasterCompletion {
  const settings = getProductCatalogSettings();
  const category = settings.categories.find(item => item.id === overrides.categoryId && item.status === 'Active')
    ?? settings.categories.find(item => item.status === 'Active')!;
  return {
    name: 'Reviewed product', description: 'A detailed product description provided and verified by the seller, including the materials, intended use, dimensions, contents and care instructions.',
    categoryId: category.id, category: category.name,
    images: ['/test-front.jpg', '/test-back.jpg', '/test-detail.jpg'],
    retail_price: 123, price_currency: 'JPY',
    pkg_length: 10, pkg_width: 10, pkg_height: 10, pkg_weight: 100,
    specifications: assignedCategoryAttributes(category, settings.attributes).map(attribute => ({
      attributeKey: attribute.key, name: attribute.name,
      value: attribute.options.split(',')[0]?.trim() || 'Verified value',
    })),
    variant_options: [], skus: [],
    ...overrides,
  };
}
