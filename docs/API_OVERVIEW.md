# API Overview

The NestJS REST API is versioned at `/api/v1`; Swagger/OpenAPI is exposed in non-production environments and can be separately protected in production.

## Conventions

- JSON request/response bodies with Zod/shared schemas where practical and Nest validation at the transport boundary.
- Stable machine-readable error codes plus safe human-readable messages.
- Cursor or bounded page pagination for collections.
- Idempotency keys for critical externally retried commands where appropriate.
- Decimal money and quantity values are serialized as strings.
- Authentication, permission, tenant, and location checks occur before business mutations.
