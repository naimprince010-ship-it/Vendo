# Sales and POS Design

## Phase 9 boundary

Phase 9 implements product discovery, drafts/holds, and atomic sale completion. Split payments, due collection, returns, refunds, exchanges, cash-shift enforcement, and printable report layouts remain Phase 10–12 work. A completed sale is immutable; later phases must add linked reversal records instead of editing it.

## Aggregate and lifecycle

`Sale` is the invoice header and `SaleItem` stores historical product, unit, conversion, cost, configured price, charged price, discount, tax, and batch snapshots. `DRAFT` and `HELD` records have no stock, payment, customer-ledger, or cash effects. Completion reloads every dependency and recalculates all authoritative amounts before transitioning to `COMPLETED`.

Invoice numbers use a company/document row in `SalesDocumentSequence`. PostgreSQL `INSERT ... ON CONFLICT ... DO UPDATE RETURNING` allocates monotonically increasing company-local values without `MAX + 1` races. Phase 9 formats them as `INV-000001`; payment references use the same strategy as `PAY-000001`.

## Pricing and totals

Retail or wholesale mode is explicit. The backend resolves one active price for the selected product unit. A different requested price requires `sale.override_price`, a reason, and cannot be below the configured minimum. Fixed line and invoice discounts require `sale.discount`. Tax inputs are fixed, tax-exclusive amounts in Phase 9.

All authoritative arithmetic uses Prisma Decimal backed by PostgreSQL `numeric(19,4)`. For each line:

`gross = transaction quantity × charged unit price`

`line total = gross - line discount + line tax`

The invoice stores gross subtotal, combined line/header discount, combined line/header tax, and `total = subtotal - discount + tax`. The browser estimate is informational only.

## Unit, batch, and inventory authority

The selected sale unit is converted directly to the product base unit with the Phase 5 factor and snapshotted on both sale line and inventory movement. Box, PCS, Sq.ft, and Sq.m never become independent stock counters. Batch-tracked products require an explicit company/product batch; the stock deduction targets that exact warehouse/batch position. Non-batch products reject fake batch selection.

Sale completion calls the Phase 6 inventory transaction primitive. Position advisory locks plus balance compare-and-swap updates serialize competing deductions and prevent concurrent overselling under the configured negative-stock policy.

## Settlement and receivable

Phase 9 accepts zero or one applied payment. It validates the active company payment method, computes cash change from tendered amount, and creates `Payment` plus `SalePayment` only for a positive paid amount. A fully paid sale creates no customer receivable. A positive due creates one immutable positive `CustomerLedgerEntry` (`SALE_INVOICE`), meaning the customer owes the company.

The company-local walk-in customer cannot carry a due. For a named customer, completion locks the customer, derives current balance from immutable ledger entries, and rejects a projected receivable above the Decimal credit limit. Split settlement and later collection are Phase 10; cash-drawer movement and open-shift enforcement are Phase 11.

## Atomicity and retries

One PostgreSQL transaction creates the completed header/lines, payment/allocation, customer receivable when applicable, inventory movements/balances, and audit record. Any failure rolls back every effect.

`SalesOperation` provides company-scoped completion idempotency. The normalized request hash includes the authenticated company/branch context and payload. The same key and request returns the committed sale; the same key with different content is rejected. Draft identifiers, customer, stock positions, and sequence rows are locked inside the transaction where required.

## Search and authorization

POS product search is bounded and server-side across barcode, SKU, name, brand, manufacturer, model, and tile display size. Results contain only sellable product/unit pricing, active conversions, selected-warehouse availability, and usable batches. Cost is returned only with `product.view_cost`.

Every route uses authenticated company context. Operational routes also require a validated active branch, and register/warehouse ownership must match it. `sale.create` protects POS context, customer/product lookup, draft, and completion; `sale.view` protects history/detail; discount and price changes are independently permissioned.
