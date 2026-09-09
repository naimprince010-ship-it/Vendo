# Performance Verification

## Phase 13 SME Catalog Gate — 2026-09-09

The controlled dataset was loaded only into `vendo_phase13_replay` by the guarded `scripts/phase13-performance-fixture.sql`. The fixture refuses every other database name. It created 10,000 active products, one unique barcode and retail price per product, and one authoritative base-unit inventory balance per product. PostgreSQL 17 was running locally through the approved Docker environment.

Measured warm-cache PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` results:

| Operation                                            |  Result | Execution time | Plan evidence                                                                                |
| ---------------------------------------------------- | ------: | -------------: | -------------------------------------------------------------------------------------------- |
| Product substring search, three fields, 25-row bound |   1 row |       1.278 ms | Bitmap OR over `Product_sku_trgm_idx`, `Product_name_trgm_idx`, and `Product_model_trgm_idx` |
| Exact company/barcode lookup                         |   1 row |       0.332 ms | Unique `ProductBarcode_companyId_barcode_key`, then composite product index                  |
| Positive-stock inventory page                        | 50 rows |       0.625 ms | `InventoryBalance_companyId_productId_baseQuantity_idx`                                      |

The measurements are local warm-cache database timings, not an internet latency claim. The first cold product run took 62.771 ms and selected a sequential scan before statistics/cache warm-up; the repeat selected the intended GIN plan. API serialization, TLS, host contention, cold caches, and real production hardware add latency. The intended deployment should alert on sustained API p95 latency above 750 ms or database saturation and should repeat this fixture/plan review after material catalog growth.

## Indexing Decision

Prisma `contains` with case-insensitive mode becomes PostgreSQL `ILIKE '%term%'`, which ordinary B-tree indexes cannot efficiently serve. Migration `20260908180000_phase13_search_performance` enables `pg_trgm` and adds GIN trigram indexes to searchable catalog, barcode, customer, and supplier fields. Exact company-scoped keys and operational/date pagination retain their existing B-tree indexes.

## Query Boundaries

- Product, party, inventory, purchase, sale, cash, audit, and report lists are server-filtered and paginated.
- POS exact barcode lookup remains deterministic and company scoped.
- Stock authority remains one Decimal base quantity; performance indexes do not add alternate stock counters.
- Dashboard and reports derive from transaction journals/projections and do not introduce mutable metric caches.

## Repeat Procedure

1. Create a database named exactly `vendo_phase13_replay` and replay all migrations.
2. Bootstrap a disposable company, then execute `scripts/phase13-performance-fixture.sql` through `psql`.
3. Run `ANALYZE` and repeat the representative `EXPLAIN (ANALYZE, BUFFERS)` queries.
4. Confirm the expected indexes appear and compare p50/p95 API timings on the intended production-class host.
5. Drop only the explicitly named disposable database when evidence has been recorded.
