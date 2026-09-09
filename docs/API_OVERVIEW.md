# API Overview

The NestJS REST API is versioned at `/api/v1`; Swagger/OpenAPI is exposed in non-production environments and can be separately protected in production.

Production liveness is `GET /api/v1/health`; database-backed readiness is `GET /api/v1/health/ready`. Both are public by design and expose no secrets. Responses and structured server logs carry an `x-request-id` correlation value.

`GET /api/v1/audit-logs` requires `audit.view` and returns a company-scoped, paginated journal with optional action, entity, actor, branch, and date filters. A supplied branch must belong to the authenticated company.

Phase 7 exposes authenticated company-scoped `/customer-groups`, `/customers`, and `/suppliers` resources with server-side pagination/search and lifecycle endpoints. Customer credit limits have a dedicated permission endpoint. Customer and supplier ledger routes provide real balance/history queries plus idempotent opening, correction, and adjustment posting. Party master routes do not require `x-branch-id`; optional branch attribution belongs to future operational transaction origins.

Phase 8 exposes active-branch-scoped `/purchases` resources for purchase orders, goods receipts, supplier invoices, outbound supplier payments, purchase returns, payment methods, and supplier due queries. The API owns lifecycle transitions, Decimal calculations, company/location ownership, inventory/supplier-ledger effects, allocation limits, and duplicate-submit protection.

Phase 9 exposes active-branch-scoped `/sales` resources for bounded POS context/customer/product discovery, exact barcode lookup, effect-free drafts/hold/resume, idempotent atomic completion, and paginated invoice history/detail. Completion owns price/discount/tax/settlement/credit validation and commits the sale, inventory, payment, optional customer receivable, and audit effects together.

Phase 10 extends sale completion to multiple configured payment methods and exposes idempotent `/sales/collections`, `/sales/returns`, `/sales/refunds`, `/sales/exchanges`, and `/sales/:id/void` commands. Corresponding paginated history APIs expose customer payments, returns, and refunds. Sale detail derives current invoice outstanding, returned/returnable base quantity, lifecycle status, collections, returns, refunds, and exchange links from immutable records.

## Conventions

- JSON request/response bodies with Zod/shared schemas where practical and Nest validation at the transport boundary.
- Stable machine-readable error codes plus safe human-readable messages.
- Cursor or bounded page pagination for collections.
- Idempotency keys for critical externally retried commands where appropriate.
- Decimal money and quantity values are serialized as strings.
- Authentication, permission, tenant, and location checks occur before business mutations.

## Phase 3 Identity API

- Public: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/password-reset/request`, and `POST /auth/password-reset/complete`.
- Authenticated: `GET /auth/me`, `POST /auth/logout`, `POST /auth/logout-others`, and `POST /auth/change-password`.
- Permission-protected administration: `/users`, `/roles`, and `/permissions` endpoints.
- Access tokens use the OpenAPI bearer scheme. Refresh credentials use an HttpOnly cookie and are never included in response JSON.
- Client-supplied company IDs are not accepted by protected administration endpoints; company scope comes from the authenticated principal.

## Phase 4 Organization API

- `GET/PATCH /company` reads and updates only the authenticated company profile.
- `/branches` provides paginated create/read/update/status operations. `GET /branches/active-context` requires a validated `x-branch-id` header.
- `/users/:userId/branches` lists, grants, and revokes explicit company-owned branch assignments.
- `/warehouses` and `/registers` provide paginated create/read/update/status operations under immutable company/branch ownership.
- All mutations are permission-protected and audited. Deactivation replaces destructive deletion; inactive parents cannot be selected for active operations or receive new active locations.

## Phase 5 Catalog API

- `/categories`, `/brands`, `/manufacturers`, and `/units` provide paginated create/read/update/status operations.
- `/products` provides company-scoped paginated search, detail, creation, update, and status.
- Product-scoped endpoints configure tile/sanitary profiles, direct conversions and previews, unit barcodes, and unit prices.
- `GET /products/barcode/:barcode` resolves one active company product for later POS reuse.

## Phase 6 Inventory API

- `POST /inventory/opening`, `/adjustments`, `/damage`, `/loss`, and `/transfers` require an `Idempotency-Key`, `x-branch-id`, explicit warehouse(s), reason, and Decimal quantity lines.
- `/inventory/batches` manages optional company/product batch, lot, and shade identity without a separate stock counter.
- `GET /inventory/balances`, `/low-stock`, and `/movements` expose bounded active-branch stock projections and immutable history with base and derived quantities.
- `/inventory/counts` supports create/list/detail, draft item replacement, review, reopen, and idempotent reconciliation posting.
- All mutations load company ownership, active location, product tracking state, unit conversion, batch requirement, permission, and negative-stock policy on the backend. Transfers additionally verify destination-branch access.

## Phase 8 Purchasing API

- `/purchases/orders` provides paginated create/read/draft-update plus submit, confirm, cancel, and close transitions. Orders do not change inventory or supplier payable.
- `POST /purchases/receipts` posts partial/full receipts with an `Idempotency-Key`; one database transaction creates receipt lines, conversion snapshots, optional batch/lot/shade identity, inventory movements/balances, PO progress, and audit history.
- `/purchases/invoices` creates draft supplier invoices and idempotently posts them to the immutable supplier ledger. Posted monetary documents cannot be silently changed.
- `/purchases/payments` records idempotent outbound supplier payments, partial invoice allocations, or explicit unapplied advances. `/purchases/suppliers/:supplierId/due` derives payable and invoice outstanding values from authoritative records.
- `POST /purchases/returns` atomically returns exact received stock and creates a supplier credit only when the return references legitimately invoiced quantity. Received-only returns create no fake financial event.
- All purchasing collection APIs are bounded/paginated and active-branch/company scoped. Critical posting endpoints declare and enforce `Idempotency-Key` request-hash semantics.

## Phase 9 Sales API

- `GET /sales/pos/context` returns only the active-branch warehouses/registers, active payment methods, and company-local walk-in identity needed by the cashier.
- `GET /sales/pos/customers` is bounded company-local customer lookup. `GET /sales/pos/products` accepts an explicit warehouse plus search or exact barcode and returns reusable sale units, retail/wholesale/minimum prices, current base availability, tile batches/shades, and no cost unless authorized.
- `/sales/drafts` plus hold/resume transitions persist an effect-free working sale. Completion revalidates current catalog, price, customer, credit, and stock state.
- `POST /sales/complete` requires `Idempotency-Key`; a single transaction creates an immutable completed invoice and lines, zero or more real payment allocations, optional customer receivable, inventory movements/balances, and audit event.
- `GET /sales` and `GET /sales/:id` provide bounded company/active-branch history and receipt-ready detail.

## Phase 10 Financial Sales API

- `POST /sales/collections` posts a real inbound customer payment, explicit invoice allocations or unapplied advance, the customer-ledger credit, and audit event atomically. `GET /sales/collections` is bounded payment history.
- `POST /sales/returns` posts one full/partial linked return using original price/conversion snapshots and optionally restores exact-batch inventory. `GET /sales/returns` is bounded linked history.
- `POST /sales/refunds` posts only remaining legitimate refundable credit as a new outbound payment. `GET /sales/refunds` provides traceable refund history.
- `POST /sales/exchanges` atomically composes the return and a replacement sale through the existing sale engine, records credit applied, and links both documents.
- `POST /sales/:id/void` is a reason- and permission-controlled compensating return of all remaining sale quantities; it never deletes or edits the original invoice.

## Phase 11 Cash and Expense API

- `POST /cash/shifts/open`, `GET /cash/shifts/current`, `GET /cash/shifts/:id`, and `POST /cash/shifts/:id/close` provide an idempotent register-shift lifecycle and backend-derived reconciliation snapshot.
- `POST /cash/movements/in` and `/out` require amount, reason, active shift, permission, and `Idempotency-Key`; `GET /cash/movements` exposes bounded immutable history.
- Cash portions of sale completion, customer collection, supplier payment, and refund post one source-unique drawer movement inside the originating transaction. Non-cash portions post none.
- `/expense-categories` provides company-scoped lifecycle management. `POST /expenses` and `POST /expenses/:id/reverse` create immutable posted history and an atomic drawer effect only when the configured method is cash. `GET /expenses` is paginated and active-branch scoped.

## Phase 12 Reporting and Document API

- `GET /reports/dashboard` returns permission-filtered company-local-day KPIs and bounded operational lists.
- `GET /reports/sales`, `/products`, `/inventory`, `/purchases`, `/customers`, `/suppliers`, `/expenses`, and `/cash` provide server-filtered paginated read models.
- `GET /reports/financial-summary` requires both sales and profit permissions and intentionally returns no fabricated net-profit value.
- `GET /reports/invoices/:id` returns a company/branch-authorized historical document projection from sale snapshots.
- `GET /reports/exports/:kind` emits permission-matched UTF-8 CSV with the same date/search/tenant filters.

Date inputs are company-timezone local `YYYY-MM-DD` values converted server-side to half-open UTC intervals. A range over 366 days is rejected.
