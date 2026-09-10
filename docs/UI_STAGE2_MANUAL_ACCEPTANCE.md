# Stage 2 Manual Chrome Acceptance

Use normal Google Chrome against the local production web and API. This checklist replaces only the temporarily unavailable Codex browser-control run; `BUG-029` remains open until that automated gate can run.

## Preconditions

- API readiness: `http://localhost:4000/api/v1/health/ready`
- Web login: `http://localhost:3000/login`
- Use safe local-development credentials only.
- Keep DevTools Console and Network open during the test.

## Checklist

- [ ] Login renders with Geist and the light-first token system; keyboard focus is visible.
- [ ] A valid local Owner can authenticate, and `/app` opens `/app/dashboard`.
- [ ] At 1440 × 900 the expanded sidebar, header, route title, user actions, and branch selector render without overlap.
- [ ] At 1280 × 720 the compact sidebar remains usable and its tooltips identify icon-only navigation.
- [ ] Below 768 px the mobile menu opens, navigates, and closes without horizontal layout breakage.
- [ ] Dashboard, POS, Sales, Purchases, Products, Inventory, Customers, Suppliers, Cash, Expenses, Reports, and Settings each change the URL and survive a browser refresh.
- [ ] Changing the active branch updates branch-bound screens and does not expose another company or an unauthorized branch.
- [ ] Register and cash-shift context remains usable inside the existing POS and Cash consoles.
- [ ] A restricted user does not see unauthorized navigation; direct route/API access is still rejected by backend permission enforcement.
- [ ] Representative Button, Input, StatusBadge, dialog/tooltip, disabled, hover, and focus states are clear and usable.
- [ ] Sign out returns to login; an anonymous visit to an authenticated module is redirected safely.
- [ ] Console has no application errors, React errors, hydration failures, or missing-style/asset warnings.
- [ ] Network shows no unexpected 4xx/5xx responses or missing static assets during navigation.

## Result

- Tester:
- Date/time:
- Browser/version:
- Result: PENDING
- Failed step or console evidence:
- Notes/screenshots:

Do not mark Stage 2 PASS or begin Stage 3 until this result is reported and recorded.
