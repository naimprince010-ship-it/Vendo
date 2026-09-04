# Database Design

PostgreSQL is the system of record and Prisma manages schema migrations. The detailed entity model is finalized and verified in Phase 2.

## Design Rules

- Every business-owned record carries company scope; location-sensitive records also carry branch and/or warehouse scope.
- Financial and physical transactions are reversed, not physically deleted.
- Money uses `numeric`/Prisma Decimal and explicit rounding.
- Inventory movements are append-only audit records; balances are transactional projections.
- Foreign keys, unique constraints, check constraints, and composite indexes enforce invariants where PostgreSQL can express them.
- List queries are paginated and search fields are indexed.
- All timestamps are stored in UTC and rendered in the company timezone.

## Planned Aggregates

Organization, identity/access, catalog, inventory, parties/ledgers, purchasing, sales/returns, payments, cash/expenses, audit, and settings form the major persistence boundaries. Exact tables and cardinalities will be documented alongside the Phase 2 Prisma schema.
