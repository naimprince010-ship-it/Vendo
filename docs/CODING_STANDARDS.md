# Coding Standards

- Strict TypeScript; avoid `any` and unsafe casts.
- Domain language is explicit and consistent across schema, API, and UI.
- Controllers are thin; business invariants live in tested services/domain functions.
- Validate all external input and never trust frontend-derived totals or scope IDs.
- Use Decimal-safe operations for money and conversion quantities.
- Prefer immutable transaction history and explicit reversals.
- Tests cover invariants and failure rollback, not merely happy-path lines.
- Repository commands must work from the root.
- Comments explain why; code expresses what.
- Meaningful changes update project control and relevant design documents.
