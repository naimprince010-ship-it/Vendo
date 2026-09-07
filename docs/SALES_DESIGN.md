# Sales, Settlement, Return, and Exchange Design

## Completed-sale authority

A completed `Sale` and its `SaleItem` snapshots are immutable. Prices, conversion factors, quantities, discounts, tax, customer, payments, and inventory history are never rewritten to represent later events. Linked documents and compensating journal entries express collections, returns, refunds, exchanges, and voids.

## Settlement

Sale completion accepts up to ten distinct configured payment methods. Each real payment creates an inbound `Payment` plus `SalePayment` allocation. Cash may record tendered money and change; non-cash methods cannot. Due is the backend-calculated remainder and is represented by a positive customer-ledger receivable, never by a fake payment method.

Later collections create a new inbound `Payment`, optional allocations to one or more completed invoices, one negative customer-ledger entry, and audit history atomically. Allocations cannot exceed the payment or current invoice outstanding. An unallocated remainder is an explicit customer advance; by convention a negative customer balance means the company holds customer credit.

Invoice outstanding is derived as original total less completed inbound payment allocations, posted return credit, and exchange credit applied to a replacement invoice. It is not copied from the original `Sale.due` snapshot.

## Returns and return value

Each `SaleReturnItem` references an original `SaleItem`. Return quantity is accepted in the original transaction unit and converted with the immutable original conversion snapshot. Cumulative returned base quantity may never exceed the original sold base quantity; a transaction-scoped advisory lock serializes competing returns.

Return credit uses the original invoice snapshot. The invoice total is allocated proportionally over original line totals, with the final line receiving the Decimal rounding residual. A partial return receives its cumulative proportional share less credit already returned. This reverses original line and invoice-level discount/tax effects without consulting current catalog prices or tax settings.

`RESTOCK` calls the shared inventory posting primitive and adds the exact base quantity to the exact original warehouse and batch/shade. `NON_RESELLABLE` records the commercial return without increasing sellable stock; quarantine/damaged-location handling is deferred until a real location workflow is approved.

## Receivable, refund, and customer credit policy

The return posts one negative customer-ledger credit for its full value. `receivableApplied` is the lesser of current invoice outstanding and return credit. Any remaining legitimate credit may be refunded, applied to an exchange, or remain as named-customer advance. A refund creates a new outbound `Payment` and `SaleRefund`; it never edits original payments. Refund capacity is:

`return credit - receivable applied - exchange credit applied - prior refunds`

Walk-in customers cannot retain pooled anonymous credit, so their return must issue the full refundable amount immediately. Cash-shift movement integration remains Phase 11 work; Phase 10 records the financial refund without fabricating drawer history.

## Exchange and void

An exchange is one atomic composition: linked return, replacement sale through the existing sale calculation/inventory engine, customer-credit application, and `SaleExchange` link. The original sale remains unchanged. The signed difference is replacement total minus returned credit; positive differences require payment or become a valid named-customer receivable, while unused named-customer credit remains an advance.

A completed-sale void is a permission-controlled return of every remaining original quantity with kind `VOID`. It requires a reason and compensating inventory/ledger/refund effects. Detail APIs derive `PARTIALLY_RETURNED`, `RETURNED`, `EXCHANGED`, and `VOIDED` lifecycle status from immutable linked records rather than changing the completed sale row.

## Safety

Critical commands use company-scoped `SalesOperation` request hashes. The same idempotency key and payload returns the committed result; a conflicting payload fails. Advisory locks serialize invoice allocation, return quantity, and refund capacity. Database checks enforce positive quantities/amounts, and triggers reject mutation or deletion of completed financial/sales records.
