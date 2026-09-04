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
