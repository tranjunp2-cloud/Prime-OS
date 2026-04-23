# PM — Product Master Tower

> Catalog management, EAV attributes, variants, families, classifications, and channel mapping.

## Scope

The PM tower handles everything related to product data: creating and organizing products, defining attribute schemas, managing product families and classifications, and mapping products to marketplace channels.

## Database Tables (27)

### Taxonomy
- `attributes` — product attributes (name, type, validation rules)
- `attribute_groups` — logical groupings of attributes
- `families` — product families (define which attributes a product has)
- `family_attributes` — family-to-attribute associations
- `family_variants` — variant definitions within a family
- `family_variant_axes` — variant dimension axes (size, color, etc.)
- `extensible_enums` — custom enumeration values
- `association_types` — product association types

### Products
- `products` — product records (SKU-based, supports parent/child variants)
- `product_categories` — product-to-category associations
- `product_classifications` — product-to-classification associations
- `product_media` — product-to-media associations

### Classifications & Categories
- `classifications` — classification hierarchies
- `classification_attributes` — classification-to-attribute mappings
- `organization_classifications` — org-specific classification overrides
- `categories` — product categories (tree structure)

### Media
- `media_files` — uploaded media records
- `media_folders` — folder structure for media organization

### Channel & Marketplace
- `channels` — marketplace platform definitions
- `channel_listings` — product listings per channel
- `channel_locales` — locale config per channel
- `channel_currencies` — currency config per channel
- `channel_attribute_mappings` — channel-specific attribute mappings
- `channel_stock_rules` — stock allocation rules per channel
- `marketplace_product_types` — marketplace product type schemas
- `imported_listings` — imported seller listings from marketplaces
- `listing_submissions` — listing submission tracking

## Server Submodules (17)

Path: `apps/server/src/towers/pm/`

`attribute-groups`, `attributes`, `bootstrap`, `categories`, `channels`, `classifications`, `connectors`, `extensible-enums`, `families`, `global-update`, `gpc-seed`, `listings` (largest — Amazon listing management), `media`, `migrations`, `products`, `provisioning`, `schema-sync`

## Key Patterns

- **EAV Model**: Products store dynamic attributes as JSONB `values` column rather than fixed columns
- **Family-Attribute System**: Families define which attributes a product can have; variant axes define which attributes create variants
- **Channel Mapping**: Each marketplace has its own product type schema; attribute mappings translate PIM attributes to marketplace-specific fields
- **Soft Deletes**: All tables use `deletedAt` with partial unique indexes
