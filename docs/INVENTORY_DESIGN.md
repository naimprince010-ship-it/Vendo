# Inventory Design

Inventory is an auditable double-entry-like movement ledger for physical quantity, paired with materialized balances for efficient availability checks.

Each movement records company, branch, warehouse, product, optional batch, signed base quantity, transaction quantity/unit, applied conversion factor, movement type, reference type/ID, actor, and timestamp.

## Safety

- Stock-changing workflows run in database transactions.
- Availability is checked against locked/current balance rows.
- Balance changes and movement creation commit together.
- Configurable negative stock policy is evaluated by the backend.
- Transfers create linked outbound and inbound movements.
- Counts reconcile by adjustment movements rather than history replacement.
