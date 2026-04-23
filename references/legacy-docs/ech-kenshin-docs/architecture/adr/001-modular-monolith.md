# ADR-001: Modular Monolith over Microservices

> Status: Accepted | Date: 2025-03

## Context

ECH-Kenshin needs to handle multiple business domains (Product Management, Inventory, Orders, Fulfillment) with deep integrations between them (e.g., listing a product requires PM data + INV stock + channel config).

## Decision

Use a **Modular Monolith** architecture: a single NestJS process with isolated domain modules ("Towers") that communicate via events and shared infrastructure.

## Rationale

1. **Team size**: With a small-to-medium team, microservices overhead (service mesh, distributed tracing, deployment orchestration) is not justified
2. **Deep integration**: PM, INV, OMS, FUL domains share data heavily — network boundaries would add latency and complexity
3. **Deployment simplicity**: One Docker image, one deploy pipeline, one database
4. **Future migration path**: Tower boundaries are designed to be extractable into services if needed — each tower owns its routes, services, and schemas

## Consequences

- All towers share one PostgreSQL database (isolated by schema namespace)
- Inter-tower communication is via in-process events, not HTTP/gRPC
- A bug in one tower can crash the entire process (mitigated by error boundaries and health checks)
- Scaling is vertical (bigger machine) not horizontal per-domain (mitigated by BullMQ offloading heavy work)
