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
