# API Overview

The NestJS REST API is versioned at `/api/v1`; Swagger/OpenAPI is exposed in non-production environments and can be separately protected in production.

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
