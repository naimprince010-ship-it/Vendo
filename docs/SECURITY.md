# Security

## Baseline

- Argon2id password hashing uses OWASP's 19 MiB memory, two-iteration, single-lane baseline. Passwords are never logged or serialized.
- HS256 JWT access tokens live for 15 minutes by default and carry only user, company, session, credential-version, issuer, and audience claims. Current user/session/permission state is reloaded server-side for protected requests.
- Refresh credentials are opaque 256-bit random values, live for 30 days by default, travel only in an HttpOnly `SameSite=Lax` cookie, and are stored only as keyed HMAC-SHA-256 fingerprints using the refresh-token secret. Every refresh rotates to a new session row. Reuse of a revoked credential revokes the active token family.
- Logout revokes the current session; users may revoke their other sessions. Password change/reset and administrative password replacement revoke all sessions and increment the credential version.
- Permission and branch-scope enforcement in the API.
- DTO/request validation, secure headers, CORS allowlist, request size limits, and rate limits.
- Login and reset endpoints have explicit throttles. Five consecutive failures temporarily lock an account for 15 minutes, while responses remain intentionally generic to resist enumeration.
- Secrets supplied only through environment or deployment secret stores.
- Binary file uploads are not implemented in Version 1. Product/company image fields are metadata-only. Any future upload endpoint must add size limits, MIME-signature validation, extension policy, malware handling, isolated object storage, and authorization before release.
- Critical actions recorded in the audit log.

No production credentials belong in Git. `.env.example` documents names using non-secret development placeholders.

## Operator and Backup Responsibility

Production secrets must be generated and injected by the deployment secret store; operators must not reuse development/bootstrap values. Database backups contain customer, supplier, transaction, and audit data and therefore require encrypted off-host storage, least-privilege access, retention controls, restore testing, and secure disposal. The application does not claim that a local database volume or an unencrypted local dump is a disaster-recovery copy.

Operators own host patching, Docker/Caddy/PostgreSQL security updates, DNS and TLS validity, firewall exposure, log access/retention, monitoring destinations, backup-job alerting, and incident-response access. The release checklist requires these environment controls before accepting real business data.

## Password Reset and Bootstrap

Reset requests always return the same accepted response. A short-lived, single-use opaque token is persisted only as a hash; delivery is an integration boundary for a later selected email/SMS provider, so the API never returns the raw token. Development bootstrap is an explicit command gated by `ALLOW_DEV_BOOTSTRAP=true` and requires company, owner email, and password environment values; there is no committed default account.

## Browser Session Boundary

The browser keeps access tokens in memory and sends them as bearer credentials. It never writes access or refresh tokens to local storage. Page reload calls the refresh endpoint with credentials included, rotates the HttpOnly cookie, and restores public user state. Production cookies require HTTPS.

## Company and Active Branch Boundary

Company identity is always loaded from the authenticated user/session and is never accepted from organization-management request bodies. The active branch header is only a selection request: the API verifies company ownership, active status, and either an explicit current `UserBranch` assignment or the current `branch.access_all` permission before exposing branch context. Foreign, inactive, and unassigned branches fail closed.

Catalog services constrain category, brand, manufacturer, unit, product, barcode, conversion, and price identifiers to the authenticated company. New product configuration requires active master data, and composite foreign keys reject cross-company relationships at the database boundary.

Customer groups, customers, suppliers, and their ledgers use the same authenticated company boundary. Master records are shared across authorized branches within that company; an arbitrary active-branch selection cannot expose another tenant. Credit-limit administration, ledger viewing, and balance posting require distinct permissions. Ledger posts require validated signed Decimal strings and a company-scoped idempotency key, while request hashes reject key reuse with different content. Database triggers prevent update/delete of financial history, and audit payloads avoid storing contact details unnecessarily.

Sales endpoints derive company and user identity from the current authenticated session and require a server-validated active branch. Warehouse and register must be active members of that branch; customer, salesperson, product, unit, batch, barcode, price, and payment method are reloaded within the authenticated company. The API does not accept a company ID. Price overrides and discounts require separate current permissions, cost visibility is independently protected, completion keys are request-hashed, and PostgreSQL locks protect customer credit and physical stock races. Completed invoice/line triggers prevent silent financial or inventory-history rewrites.

Phase 10 financial commands add separate permissions for customer collection/payment history, return, refund, exchange, and void. All linked IDs are re-resolved inside the authenticated company and active branch. Request-hash idempotency prevents duplicate submits, transaction-scoped locks prevent over-allocation/over-return/over-refund, and immutable database triggers protect completed payment and compensating-document history.

Phase 11 drawer commands require an authenticated company, authorized active branch, active company/branch-owned register, and explicit permission. Cash business events require an open shift; non-cash events create no drawer row. Register-scoped PostgreSQL advisory locks serialize opening, movement posting, and closing across API processes. Database source uniqueness blocks duplicate automatic movements, request hashes protect manual command retries, and triggers prevent movement deletion, closed-shift edits, and silent posted-expense rewrites.

## Production Runtime Boundary

Production configuration is validated before NestJS starts. PostgreSQL URLs, two distinct 32+ character JWT secrets, explicit HTTPS CORS origins, valid ports/durations, and disabled development seed/bootstrap switches are mandatory. Placeholder/loopback database credentials and placeholder secrets are rejected. Request bodies are bounded, proxy trust is explicit, Swagger is disabled in production, and `/api/v1/health/ready` fails closed when PostgreSQL is unavailable.

Every request receives or validates an `x-request-id`. Completion/failure logs are structured JSON and contain method, query-free route, status, duration, and safe authenticated identifiers; request bodies, cookies, authorization headers, token values, raw exception messages, and stack traces are excluded. Unexpected 5xx responses expose only a generic message and correlation ID.

The centralized route audit statically verifies that every controller route is permission-protected or belongs to a narrowly reviewed public/self-service exception. Only authentication bootstrap/session routes and health endpoints may declare `@Public()`; operational cash, inventory, purchase, report, and sales controllers must also declare active-branch enforcement.
