# Current Phase

Phase 5 — Catalog, Units, Tile Domain, and Pricing

# Current Task

Implement and verify categories, brands, manufacturers, units, reusable products, tile/sanitary profiles, product-specific conversions, barcodes, unit pricing, search, and the corresponding real management UI.

# Objective

Deliver the production-grade catalog and tile/sanitary configuration foundation without creating inventory movements, purchases, sales, parties, cash shifts, reports, or later-phase workflows.

# Dependencies

- Verified Phase 4 company and location authorization foundation
- Existing Phase 2 catalog, Decimal, and composite tenant models
- Existing Phase 3 permission and audit infrastructure
- PostgreSQL 17 development service

# Expected Files To Change

- Catalog/domain modules under `apps/api/src/**`
- Additive Prisma migration only for genuinely required Phase 5 integrity
- Phase 5 catalog management UI under `apps/web/src/**`
- Catalog, conversion, API, permission, architecture, database, and decision documentation
- Project-control files

# Acceptance Criteria

- Catalog master data and products are tenant-scoped, permission-protected, paginated, audited, and deactivation-based.
- Product core remains industry-neutral while TILE and SANITARY details use separate one-to-one profiles.
- Decimal conversion logic preserves one authoritative base inventory unit and deterministic product/unit paths.
- Barcodes and prices resolve without ambiguity and enforce product/company/unit ownership.
- Product search is indexed, server-side, paginated, and reusable by later POS work.
- Phase 5 frontend uses real APIs and adapts product configuration to product type without fake stock.

# Verification Required

- Catalog/conversion/pricing API integration tests, Decimal-domain tests, tenant isolation, permission, and audit checks
- Additive migration inspection, application, status, catalog checks, and clean replay/drift
- Idempotent permission seed/bootstrap checks and Swagger metadata
- Live browser workflows for master data, tile and sanitary products, conversions, barcodes, pricing, and search
- Repository lint, typecheck, tests, production builds, formatting, Compose, secret scan, and Git integrity

# Status

COMPLETE — Phase 5 gate passed on 2026-09-06. Catalog APIs/UI, tile and sanitary profiles, Decimal conversions, unit barcodes/prices, search, migration, isolation, audit, tests, builds, Swagger, and live browser workflows are verified.

# Blockers

None.

# Next Approved Task

Phase 6 — Inventory and Batch/Lot/Shade. Begin by rereading governance and inventory/conversion documentation, then implement transactional opening stock and movement/balance invariants before adjustments, batches, counts, and transfers.
