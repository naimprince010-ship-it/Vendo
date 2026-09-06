# Database Design

PostgreSQL 17 is the system of record. Prisma 7.10 manages the typed client and migrations. All primary identifiers are UUIDs, timestamps are UTC `timestamptz(3)`, money is `numeric(19,4)`, physical quantities are `numeric(20,6)`, and conversion factors are `numeric(24,10)`.

## Ownership and Integrity

Every business-owned aggregate carries `companyId`. Location-sensitive aggregates carry branch and, where stock is involved, warehouse. Composite candidate keys such as `(id, companyId)` and `(id, branchId, companyId)` allow foreign keys to enforce tenant and location ownership rather than trusting request IDs.

Transactional records use restrictive deletion. Cascades are limited to configuration joins and product barcodes whose parent is not a posted transaction. Financial and physical history is reversed in later workflow phases, never deleted.

## Organization and Access Foundation

- `Company` owns branches, identity, catalog, parties, methods, categories, settings, and audit history.
- `Branch` owns warehouses and registers. A warehouse belongs to exactly one branch.
- `User`, `Role`, and global `Permission` are joined through tenant-safe `UserRole`, `RolePermission`, and `UserBranch` tables.
- `AuthSession` stores one keyed HMAC-SHA-256 fingerprint of a high-entropy opaque refresh credential per rotation, a family identifier, expiry, revocation state, replacement link, and request metadata. Rotation creates a successor row; reuse of a revoked credential revokes its active family.
- `PasswordResetToken` stores only a keyed HMAC-SHA-256 token fingerprint, expiry, use timestamp, and request IP. Reset completion consumes the token and revokes the user's sessions atomically.
- `User.credentialVersion` invalidates access tokens after credential administration; failed-login and temporary-lock fields support account-level abuse controls.

Phase 4 uses this schema without a new migration. Branch, warehouse, and register codes are unique within a company; warehouse and register branch ownership is fixed by composite foreign keys. Organizational records are deactivated instead of deleted, so historical references remain readable. No default warehouse column is introduced until Phase 6 defines the real inventory selection workflow.

## Catalog and Tile Extension

- `Product` is the reusable core and references one authoritative base `Unit`.
- `ProductTileProfile` is optional and one-to-one; it stores tile-only dimensions and merchandising attributes.
- Packaging and area conversions live in versioned `UnitConversion` records as `factorToBase`. Tile profile does not duplicate pieces-per-box or coverage counters.
- `ProductPrice` permits independent retail, wholesale, minimum, and custom prices per unit.
- `ProductBarcode` supports multiple globally unique barcodes per company and one primary barcode per product.
- `ProductBatch` is optional. Its batch/lot/shade identity is unique with PostgreSQL `NULLS NOT DISTINCT`, avoiding duplicate identities when lot or shade is absent.

## Parties and Transaction Foundations

- `CustomerGroup` has a company-unique code, descriptive lifecycle fields, and restrictive customer references. Inactive groups remain readable but cannot be assigned to new customer configuration.
- `Customer` and `Supplier` are company-owned reusable masters with company-unique explicit codes, indexed name/contact search fields, and active/inactive lifecycle. Phone and email are not forced unique. Customer credit limits are `numeric(19,4)` and non-negative.
- `CustomerLedgerEntry` and `SupplierLedgerEntry` are separate immutable signed journals. Customer positive values increase receivable and negative values represent credits/advances; supplier positive values increase payable and negative values represent supplier advances. Balance queries sum ledger entries rather than reading a mutable party balance column.
- Each party permits one original opening entry; corrections and adjustments are new entries. Company-scoped idempotency keys and SHA-256 request hashes prevent duplicate/reinterpreted posts. Advisory transaction locks serialize opening corrections, and composite foreign keys constrain party, optional branch, and actor ownership.
- A database trigger provisions exactly one active walk-in customer whenever a company is inserted. The existing partial unique index prevents a second system walk-in for the same company.
- Purchasing separates `PurchaseOrder`, `GoodsReceipt`, and `PurchaseInvoice`. Their item tables snapshot transaction unit, base quantity, factor, cost, discount, tax, and totals as applicable.
- `Sale` and `SaleItem` retain branch/register/warehouse/customer/user context and Decimal totals. Completion logic is deferred to Phase 9.
- `Payment` is a direction-aware monetary event linked to one method and optional customer or supplier. `SalePayment` and `PurchasePayment` support split payments and allocations without conflating payment with invoice/receipt creation.
- Sale, purchase, payment, return, and credit-note ledger types are reserved for their approved workflow phases. Phase 7 posts only legitimate opening balances, corrections, and explicit adjustments; it creates no fabricated operational entries.

## Inventory

`InventoryMovement` is the auditable stock journal. It stores a signed base quantity plus the original positive transaction quantity, unit, and snapshotted conversion factor. `InventoryBalance` is the only current-stock projection and contains one `baseQuantity` per warehouse/product/optional batch.

There are no independent box, piece, square-foot, or square-metre stock columns. A PostgreSQL `NULLS NOT DISTINCT` unique index prevents duplicate unbatched balance rows.

Phase 6 adds `InventoryOperation`, `PhysicalCount`, and `PhysicalCountItem`. `InventoryOperation` owns a company-unique idempotency key, payload hash, operation type, actor, and stored result. A count belongs to one company/branch/warehouse, follows `DRAFT → IN_REVIEW → POSTED`, and stores line snapshots of base quantity and balance version. Count items retain the entered transaction unit, quantity, and factor while `countedQuantity` is the resolved authoritative base quantity.

Nullable batch identities for batches, balances, and count positions use PostgreSQL `NULLS NOT DISTINCT`. Composite foreign keys prevent cross-company product/unit/batch and cross-branch warehouse relationships. Check constraints enforce positive conversion/transaction quantities, non-negative counted quantities, valid snapshot versions, consistent count state timestamps/actors, and SHA-256 operation hashes.

## Cash, Expenses, Settings, and Audit

- `CashShift` and `CashMovement` provide the monetary drawer foundation; one open shift per register is enforced by a partial unique index.
- `Expense` references branch, category, payment method, and actor.
- `Setting` uses JSON values with one key per company/optional branch scope.
- `AuditLog` records actor, branch, entity, before/after JSON, reason, IP address, and timestamp.
- A general ledger/chart of accounts is not included. No double-entry accounting figures are represented before a correct accounting module exists.

## Database-Level Constraints

The initial migration adds checks that Prisma schema syntax cannot express, including positive quantities and factors, non-negative monetary totals, valid scale settings, payment party exclusivity, tile dimensions, setting scope consistency, shift close consistency, and inventory movement sign/type rules. Partial and null-safe unique indexes enforce operational identities.

## Indexing Strategy

Composite indexes begin with `companyId`, followed by branch/warehouse or searchable/filterable fields. Covered access paths include SKU, barcode, product name/model/brand/category, tile size/series, batch/shade, party name/phone, transaction number/status/date, inventory product/batch/date, payment party/date, and audit entity/actor/action/date.

## Transaction Boundaries

Later application services must use database transactions for goods receipt, sale completion, returns, transfers, adjustments, payment allocation, and shift close. Inventory balance rows use a version column for optimistic concurrency and may additionally be locked with PostgreSQL row locks. A movement and its balance mutation must commit together.

Implemented Phase 6 inventory workflows use transaction-scoped PostgreSQL advisory locks keyed by company/warehouse/product/batch. Locks are sorted for multi-line and transfer operations; a version-conditional balance update provides a second concurrency check. Negative-stock policy is read inside the same transaction. Transfers use one transaction and one correlation UUID for their paired movements. No default warehouse is stored; callers select an explicitly authorized active warehouse.

## Deferred Schema

Return/refund/exchange entities (Phases 8 and 10) and any double-entry journal (future accounting scope) remain deliberately deferred so their lifecycle rules are designed with the implementing workflow rather than guessed early.

Phase 5 migration `20260906043323_phase5_catalog_foundation` normalizes company-owned manufacturers, adds a separate sanitary profile, permits unit-bound barcodes, and enforces one active conversion per company/product/unit. Existing manufacturer text is migrated before its legacy column is removed. Commercial factors remain `numeric(24,10)`; money remains `numeric(19,4)`.

Phase 6 migrations `20260906060435_phase6_inventory_engine` and `20260906062000_phase6_inventory_constraints` add idempotent posting and physical counts, then restore/extend PostgreSQL-only null-safe indexes and checks after generated-SQL inspection. A clean five-migration replay has no drift.
