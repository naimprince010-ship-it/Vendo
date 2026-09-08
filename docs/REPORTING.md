# Reporting and Document Design

## Authoritative Sources

- Sales: completed `Sale` and immutable `SaleItem` snapshots.
- Returns/voids: `SaleReturn.totalCredit` at `returnedAt`; refunds settle credit and never reduce revenue again.
- Inventory: `InventoryBalance.baseQuantity`, reconciled to movements. Box/PCS/Sq.ft/Sq.m are derived conversions.
- Purchases: posted supplier invoices are purchase value; receipts are physical events; payments are settlement; invoiced returns are financial credits.
- Receivables/payables: immutable customer/supplier ledger sums. Positive is receivable/payable; negative is advance.
- Expenses: posted, non-reversed expenses. Reversed rows remain history but are excluded from valid expense totals.
- Cash: immutable signed drawer movements. Opening float is drawer cash but not business cash inflow.

## Period Policy

`from` and `to` are calendar dates in `Company.timezone`. The API converts them to a half-open UTC range. Default is the current company-local day.

Sales are event-period reports: gross sales are invoices completed in range; return/void credits are posted-return events in range; net sales is gross less those credits. Customer collections are never sales. Refunds are not deducted a second time.

## Cost and Profit

COGS starts with historical `SaleItem.unitCost × quantity`. A restocked return reverses proportional historical cost using return base quantity and stored conversion. A non-resellable return does not reverse cost because sellable stock was not restored. Gross profit is permission protected. Net profit is intentionally not reported without a complete general ledger.

## Documents and Exports

Thermal (72 mm content) and A4 layouts use one invoice projection. Product/SKU/unit/tile/batch/shade and financial values are transaction snapshots. CSV exports reuse screen permission, tenant, branch, date, search, and row-limit rules. Product aggregation is capped at 10,000 sale or return lines per request and rejects oversized ranges rather than truncating silently.
