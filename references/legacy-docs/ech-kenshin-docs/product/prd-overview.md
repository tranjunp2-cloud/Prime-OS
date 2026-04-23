# Product Requirements — Overview

> Product vision, target market, and key capabilities of ECH-Kenshin.

## Vision

ECH-Kenshin is a multi-tenant SaaS platform combining **Product Information Management (PIM)** with **OmniChannel Commerce** capabilities, targeting the Japanese market with deep Amazon SP-API integration.

## Target Market

- Japanese e-commerce sellers managing products across multiple marketplaces
- Primary channel: Amazon Japan (SP-API)
- Future channels: Rakuten, Yahoo Shopping, Shopify Japan

## Core Capabilities

### 1. Product Information Management (PIM)

- Centralized product catalog with EAV (Entity-Attribute-Value) model
- Attribute families and classification hierarchies
- Variant management (size, color, material axes)
- Rich media management (images, documents)
- Channel-specific attribute mappings

### 2. Multi-Channel Listings

- Amazon listing import via SP-API
- Schema-driven listing wizard (marketplace-specific product types)
- Parent-child product hierarchy support
- Channel provisioning and bootstrapping

### 3. Inventory Management

- Multi-warehouse stock tracking
- Optimistic locking for concurrent updates
- Append-only inventory ledger for audit trail
- Channel stock rules (allocation per marketplace)
- Background stock sync workers

### 4. Order Management (Planned)

- Amazon SQS order ingestion
- Order status routing and history tracking
- Multi-fulfillment support

### 5. Fulfillment (Planned)

- FBA (Fulfilled by Amazon) / FBM (Fulfilled by Merchant) dispatch
- Shipment tracking
- Fulfillment rule engine

## Multi-Tenancy

Every organization gets isolated data via PostgreSQL Row-Level Security (RLS). Organization context flows through JWT tokens → NestJS guards → Drizzle query scoping.

## Key Integrations

- **Amazon SP-API**: Product data, listings, orders, fulfillment
- **Better-Auth**: Authentication and organization management
- **MinIO/S3**: Media storage
- **Redis/BullMQ**: Background job processing
