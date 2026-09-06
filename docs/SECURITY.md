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
- File uploads validated by size, MIME signature, extension policy, and storage isolation.
- Critical actions recorded in the audit log.

No production credentials belong in Git. `.env.example` documents names using non-secret development placeholders.

## Password Reset and Bootstrap

Reset requests always return the same accepted response. A short-lived, single-use opaque token is persisted only as a hash; delivery is an integration boundary for a later selected email/SMS provider, so the API never returns the raw token. Development bootstrap is an explicit command gated by `ALLOW_DEV_BOOTSTRAP=true` and requires company, owner email, and password environment values; there is no committed default account.

## Browser Session Boundary

The browser keeps access tokens in memory and sends them as bearer credentials. It never writes access or refresh tokens to local storage. Page reload calls the refresh endpoint with credentials included, rotates the HttpOnly cookie, and restores public user state. Production cookies require HTTPS.

## Company and Active Branch Boundary

Company identity is always loaded from the authenticated user/session and is never accepted from organization-management request bodies. The active branch header is only a selection request: the API verifies company ownership, active status, and either an explicit current `UserBranch` assignment or the current `branch.access_all` permission before exposing branch context. Foreign, inactive, and unassigned branches fail closed.

Catalog services constrain category, brand, manufacturer, unit, product, barcode, conversion, and price identifiers to the authenticated company. New product configuration requires active master data, and composite foreign keys reject cross-company relationships at the database boundary.

Customer groups, customers, suppliers, and their ledgers use the same authenticated company boundary. Master records are shared across authorized branches within that company; an arbitrary active-branch selection cannot expose another tenant. Credit-limit administration, ledger viewing, and balance posting require distinct permissions. Ledger posts require validated signed Decimal strings and a company-scoped idempotency key, while request hashes reject key reuse with different content. Database triggers prevent update/delete of financial history, and audit payloads avoid storing contact details unnecessarily.
