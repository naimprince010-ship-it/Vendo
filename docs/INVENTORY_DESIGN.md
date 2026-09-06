# Inventory Design

Inventory is an auditable double-entry-like movement ledger for physical quantity, paired with materialized balances for efficient availability checks.

Each movement records company, branch, warehouse, product, optional batch, signed base quantity, transaction quantity/unit, applied conversion factor, movement type, reference type/ID, actor, and timestamp.

`InventoryBalance` contains only `baseQuantity`, keyed by company, warehouse, product, and nullable batch. PostgreSQL `NULLS NOT DISTINCT` uniqueness makes the unbatched row singular. Batch quantities are balances associated with a `ProductBatch`; the batch master itself does not carry an independently mutable available quantity.

## Safety

- Stock-changing workflows run in database transactions.
- Availability is checked against locked/current balance rows.
- Balance changes and movement creation commit together.
- `InventoryBalance.version` supports compare-and-swap updates; workflows may use row locks when allocating multiple lines or batches.
- Configurable negative stock policy is evaluated by the backend.
- Transfers create linked outbound and inbound movements.
- Counts reconcile by adjustment movements rather than history replacement.
- Movement transaction quantity and conversion factor must be positive; signed `baseQuantity` expresses direction. Database checks constrain naturally inbound/outbound movement types, while adjustment/reconciliation may use either sign.

## Implemented Operations

- Opening stock is a positive movement and may be posted only before any movement exists for that warehouse/product/batch position.
- Adjustments support explicit IN/OUT direction and a required reason. Damage and loss are distinct outbound types.
- A batch is required exactly when `Product.batchTracking` is enabled. Batch masters store batch/lot/shade metadata; availability exists only in batch-keyed balances.
- Transfers atomically post correlated `TRANSFER_OUT` and `TRANSFER_IN` movements. Source and destination positions are locked in sorted order, and both branches must be available to the actor.
- Physical counts capture the live balance/version in draft, permit draft item replacement, move through review, can be reopened, and reject posting if any snapshot is stale. Only the variance becomes `COUNT_RECONCILIATION` movement(s).
- Balance, batch, low-stock, count, and immutable movement-history endpoints are paginated/bounded and company/branch scoped.

## Concurrency and Retry

Each posted operation requires an `Idempotency-Key`. `InventoryOperation` stores a SHA-256 payload identity and the committed response. A same-key/same-payload retry returns that result without another movement; different payload reuse is rejected. PostgreSQL advisory transaction locks serialize the physical stock position across API instances. The balance version is then updated conditionally. Negative-stock-disabled companies reject an outbound result below zero, rolling back all lines and audit data.

All quantities enter as decimal strings, convert through the active product factor, and round to `numeric(20,6)` base quantity before the transaction is accepted. The applied `numeric(24,10)` factor is snapshotted on movements and count items.
