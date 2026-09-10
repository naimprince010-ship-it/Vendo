# Stage 2 Manual Chrome Acceptance

This checklist records the recovered Codex in-app Chromium acceptance run against the local production web and API. The same URLs remain suitable for an optional human Chrome review.

## Preconditions

- API readiness: `http://localhost:4000/api/v1/health/ready`
- Web login: `http://localhost:3000/login`
- Use safe local-development credentials only.
- Keep DevTools Console and Network open during the test.

## Checklist

- [x] Login renders with Geist and the light-first token system; keyboard focus is visible.
- [x] A valid local Owner can authenticate, and `/app` opens `/app/dashboard`.
- [x] At 1440 × 900 the expanded sidebar, header, route title, user actions, and branch selector render without overlap.
- [x] At 1280 × 720 the compact sidebar remains accessible and its tooltip foundation identifies icon-only navigation.
- [x] Below 768 px the mobile menu opens, navigates, and closes without horizontal layout breakage.
- [x] Dashboard, POS, Sales, Purchases, Products, Inventory, Customers, Suppliers, Cash, Expenses, Reports, and Settings resolve to their URL-addressable module routes; representative refresh restoration passes.
- [x] The active branch selector exposes only the assigned local UAT branch; centralized context and preserved backend ownership checks were reviewed.
- [x] Register and cash-shift consoles render through their route pages without altering the verified V1 context logic.
- [x] Permission-aware navigation tests pass; backend direct-route/API permission enforcement is unchanged from verified V1.
- [x] Representative Button, Input, StatusBadge, tooltip, disabled, hover, and focus foundations are clear; dialog behavior remains covered by the Stage 1 component gate.
- [x] Sign out returns to login; an anonymous visit to `/app` redirects safely; the local Owner can authenticate again.
- [x] Console has no application errors, warnings, React errors, hydration failures, or missing-style/asset warnings.
- [x] API readiness and `/login`/`/app` HTTP smoke return 200; no unexpected missing asset or route failure appeared during the run.

## Result

- Tester: Codex interactive acceptance
- Date/time: 2026-09-10 (Asia/Dhaka)
- Browser/version: Codex in-app Chromium runtime
- Result: PASS
- Failed step or console evidence: None after resolving `BUG-030`; final error/warning console log is empty.
- Notes/screenshots: Verified at 1440 × 900, 1280 × 720, and 390 × 844 against the real local production Next.js build and API. Pointer-click automation on links was a browser helper limitation also reproducible on desktop; trusted keyboard link activation verified real route transitions and mobile drawer closure.

Stage 2 is accepted. Stage 3 remains gated on explicit user approval and was not started in this run.
