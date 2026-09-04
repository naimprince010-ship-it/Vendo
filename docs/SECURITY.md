# Security

## Baseline

- Argon2id password hashing with tuned parameters.
- Short-lived JWT access tokens and rotating, hashed refresh tokens tied to revocable sessions.
- Permission and branch-scope enforcement in the API.
- DTO/request validation, secure headers, CORS allowlist, request size limits, and rate limits.
- Password/login/reset abuse protection without user enumeration.
- Secrets supplied only through environment or deployment secret stores.
- File uploads validated by size, MIME signature, extension policy, and storage isolation.
- Critical actions recorded in the audit log.

No production credentials belong in Git. `.env.example` documents names using non-secret development placeholders.
