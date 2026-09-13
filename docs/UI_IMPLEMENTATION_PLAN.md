# Vendo V1 Approved UI Implementation Plan

Status: **PLAN ONLY — implementation requires explicit approval**  
Approved Figma: <https://www.figma.com/design/nSB6Of4q9udYWBqMidIwpA>  
Primary POS references: `POS / Light / 1440×900` (`33:2`) and `POS / Light / 1280×720` (`34:2`)

## 1. Objective and non-negotiable boundaries

Implement the approved light-first Figma system in the existing Next.js application without changing Vendo V1 business behavior.

The UI migration must not change:

- NestJS business logic, PostgreSQL/Prisma architecture, migrations, or REST contracts.
- JWT/refresh-session behavior, login throttling, RBAC, permission keys, or backend authorization.
- Company/branch/register/warehouse ownership checks.
- The authoritative base-inventory quantity or Box/PCS/Sq.ft/Sq.m conversion rules.
- Backend-authoritative money, tax, discount, due, change, inventory, reporting, and ledger calculations.
- Existing immutable transaction, idempotency, concurrency, audit, print-data, or report definitions.

No Version 2 capability is included. The frontend may format and preview values, but it must treat API responses as authoritative and must not create a second business-calculation engine.

## 2. Inspection findings

### Approved design

- The approved system is light-first: canvas `#F6F7F9`, white operational surfaces, Vendo Navy `#1D3557`, restrained Amber `#D99A2B`, Geist typography, subtle borders, compact controls, and semantic success/warning/danger/info colors.
- The 1440×900 POS uses an expanded sidebar and stable product/cart/checkout columns.
- The 1280×720 POS is a distinct compact reflow with collapsed navigation, not a scaled copy.
- The Figma file now includes approved references for Sales, Catalog, Inventory, Purchasing, Customers/Suppliers, Cash/Expenses, Dashboard/Reports, Administration, Print, and UX flow notes.

### Current frontend

- Next.js `16.3.4`, React `19.2.8`, Tailwind CSS 4, TanStack Query 5, React Hook Form, and Zod are installed.
- Geist is loaded by `next/font`, but `apps/web/src/app/globals.css` overrides it with Arial and automatically switches root colors through `prefers-color-scheme`.
- `/app` is one client page with local `area` state. It renders nine large console modules rather than route-addressable pages.
- The console modules range from roughly 19–37 KB and own their API calls, query keys, permission checks, forms, feedback, and presentation in the same files.
- TanStack queries and authenticated API wrappers are mostly declared inside each console. There is no shared domain hook or query-key layer.
- React Hook Form/Zod are used by login, catalog, and organization forms. Many operational forms use controlled local state and manual submission.
- Authentication is centralized in `AuthProvider`; the access token remains in memory, refresh uses the secure cookie, and `authenticatedFetch` retries once after a 401.
- Branch selection and `x-branch-id` attachment are repeated in operational consoles. The backend remains the branch-authorization authority.
- `PosConsole` already preserves search, unit/batch selection, pricing, hold/resume, split payment, tender/change, idempotent completion, history, and inventory effects. `Phase10Console` owns collection, return, refund, and exchange workflows.
- Printing is currently owned by `ReportingConsole`/`InvoiceDocument`; it uses `window.print()` and the existing 72 mm thermal and 194 mm A4 print rules.
- `packages/ui` exports only `StatusBadge`; seven consoles duplicate a local Card and most controls repeat Tailwind class strings.
- No frontend component/unit test files were found. Existing confidence comes from production builds, API suites, and browser workflows, so frontend characterization tests must be added before decomposition.

## 3. Target frontend architecture

```text
apps/web/src/
  app/
    app/
      layout.tsx                 authenticated application shell
      page.tsx                   compatibility redirect to /app/dashboard
      dashboard/page.tsx
      pos/page.tsx
      sales/page.tsx
      sales/[saleId]/page.tsx
      products/page.tsx
      products/new/page.tsx
      products/[productId]/page.tsx
      products/[productId]/edit/page.tsx
      inventory/page.tsx
      inventory/movements/page.tsx
      inventory/counts/page.tsx
      purchases/page.tsx
      purchases/orders/new/page.tsx
      purchases/orders/[orderId]/page.tsx
      purchases/receipts/new/page.tsx
      purchases/invoices/page.tsx
      purchases/payments/page.tsx
      purchases/returns/page.tsx
      customers/page.tsx
      customers/[customerId]/page.tsx
      suppliers/page.tsx
      suppliers/[supplierId]/page.tsx
      cash/page.tsx
      cash/shifts/[shiftId]/page.tsx
      expenses/page.tsx
      reports/page.tsx
      reports/[reportKind]/page.tsx
      settings/page.tsx
      settings/branches/page.tsx
      settings/warehouses/page.tsx
      settings/registers/page.tsx
      settings/users/page.tsx
      settings/roles/page.tsx
  components/
    app-shell/
    business/
    feedback/
  contexts/branch-context.tsx
  hooks/use-vendo-api.ts
  lib/routes.ts
  lib/permissions.ts
  lib/query-keys.ts
  lib/display-money.ts
packages/ui/src/
  components/
  hooks/
  styles/
  index.ts
```

Page components should compose domain feature modules; they must not copy request logic. Existing consoles will first be treated as characterization references, then split by presentation boundary while retaining the same request payloads, query keys, invalidation behavior, idempotency headers, and API paths.

## 4. Component-system recommendation — approval required before dependencies

### Recommendation

Adopt a **small shadcn-style source-owned component layer in `packages/ui`**, backed only where necessary by Radix primitives. Do not add a full runtime design framework and do not replace Tailwind.

Recommended primitives:

- Source-owned: Button, Input, Textarea, Field, Badge, StatusBadge, Alert, Card, Skeleton, EmptyState, Table, Pagination, and money/quantity display helpers.
- Radix-backed: Dialog/AlertDialog, Select, Tabs, Popover, Dropdown Menu, Tooltip, and optionally Toast.
- Supporting utilities: `class-variance-authority`, `clsx`, `tailwind-merge`, and a single consistent icon set such as `lucide-react`.

### Benefits

- Accessible focus management, keyboard behavior, Escape handling, labels, and modal focus trapping for high-risk actions.
- Source ownership matches shadcn's model and allows exact Vendo token/Figma alignment.
- Eliminates seven copied Cards and repeated control/status class strings.
- Provides reusable behavior without introducing a theme runtime or competing styling system.

### Dependency and bundle impact

- Add only the Radix packages used by an implemented stage; tree-shaking keeps unused primitives out of production bundles.
- `class-variance-authority`, `clsx`, and `tailwind-merge` are small utilities but add a shared class-composition convention.
- `lucide-react` must use named imports only.
- Tailwind 4 must explicitly scan `packages/ui/src` if workspace dependency discovery does not already include it.

### Migration and maintenance impact

- Existing native controls remain until their owning screen is migrated; no all-at-once replacement.
- Component APIs and variants must be documented in `packages/ui`; app-specific business behavior stays in `apps/web`.
- The shadcn CLI must not overwrite project configuration or generate uncontrolled dependencies. Components should be reviewed and committed as normal source.

### Accessibility impact

- Positive for dialogs, menus, tabs, tooltips, and selectable lists because Radix supplies well-tested interaction primitives.
- Persistent labels, visible focus, error association, live regions, keyboard order, and semantic table markup still require Vendo-specific implementation and browser testing.

### Decision gate

No dependency is installed by this plan. Stage 1 starts only after approval of this selective Radix/shadcn strategy. If rejected, equivalent accessible behavior must be implemented and tested internally, especially focus traps and keyboard selection.

## 5. Route migration plan

The current stable public entry points are `/`, `/login`, and `/app`. `/app` will remain valid and redirect authenticated users to `/app/dashboard`. Authentication restoration occurs before protected content is shown. Screen-local query state such as filters and active tabs should move to search parameters where useful, while IDs belong in path segments.

| Current screen/workflow                 | Proposed route                                          | Primary permission                                         | Context requirement                                     |
| --------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `/app` default area                     | `/app/dashboard`                                        | `report.view_sales`                                        | Active branch                                           |
| POS console                             | `/app/pos`                                              | `sale.create`                                              | Active branch, warehouse, register; open shift for cash |
| Held sales                              | `/app/pos?panel=held`                                   | `sale.create`                                              | Active branch                                           |
| Completed sales/history                 | `/app/sales`                                            | `sale.view`                                                | Active branch                                           |
| Selected sale and Phase 10 actions      | `/app/sales/[saleId]`                                   | `sale.view`; action-specific permission                    | Active branch and owned sale                            |
| Due collection                          | `/app/sales/[saleId]?action=collect` or customer detail | `customer.collect_payment`                                 | Active branch for posting                               |
| Return/refund/exchange/void             | `/app/sales/[saleId]?action=…`                          | `sale.return`, `sale.refund`, `sale.exchange`, `sale.void` | Active branch/register rules from API                   |
| Product list                            | `/app/products`                                         | `product.view`                                             | Company scope                                           |
| Product create                          | `/app/products/new`                                     | `product.create`                                           | Company scope                                           |
| Product detail                          | `/app/products/[productId]`                             | `product.view`                                             | Company scope                                           |
| Product edit/configuration              | `/app/products/[productId]/edit?section=…`              | `product.edit`; `pricing.manage` where applicable          | Company scope                                           |
| Categories/brands/manufacturers/units   | `/app/products?master=categories                        | brands                                                     | manufacturers                                           | units`                              | Existing catalog permission | Company scope |
| Inventory balances/batches              | `/app/inventory`                                        | `inventory.view`                                           | Active branch and explicit warehouse                    |
| Inventory movements                     | `/app/inventory/movements`                              | `inventory.view`                                           | Active branch and explicit warehouse                    |
| Opening/adjustment/damage/loss/transfer | `/app/inventory?action=…`                               | Existing action permission                                 | Active branch and explicit warehouse(s)                 |
| Physical counts                         | `/app/inventory/counts`                                 | Existing count/reconcile permission                        | Active branch and warehouse                             |
| Purchase order list                     | `/app/purchases`                                        | `purchase.view`                                            | Active branch                                           |
| Create PO                               | `/app/purchases/orders/new`                             | `purchase.create`                                          | Active branch                                           |
| PO detail/lifecycle                     | `/app/purchases/orders/[orderId]`                       | `purchase.view`; edit/approve permissions                  | Active branch and owned supplier/order                  |
| Goods receipt                           | `/app/purchases/receipts/new?orderId=…`                 | `purchase.receive`                                         | Active branch and explicit warehouse                    |
| Supplier invoices                       | `/app/purchases/invoices`                               | Existing purchase invoice permission                       | Active branch                                           |
| Supplier payments                       | `/app/purchases/payments`                               | `supplier.payment.view/create`                             | Active branch; open shift when cash/register-based      |
| Purchase returns                        | `/app/purchases/returns`                                | `purchase.return`                                          | Active branch and warehouse                             |
| Customers/groups                        | `/app/customers`                                        | `customer.view`                                            | Company scope; branch for operational posting only      |
| Customer detail/ledger                  | `/app/customers/[customerId]`                           | `customer.view_ledger`                                     | Company ownership                                       |
| Suppliers                               | `/app/suppliers`                                        | `supplier.view`                                            | Company scope                                           |
| Supplier detail/ledger                  | `/app/suppliers/[supplierId]`                           | `supplier.view_ledger`                                     | Company ownership                                       |
| Cash console/current shift              | `/app/cash`                                             | `cash.view_shift`                                          | Active branch and register                              |
| Shift history/detail                    | `/app/cash/shifts/[shiftId]`                            | `cash.view_shift/history`                                  | Active branch/register ownership                        |
| Expenses/categories                     | `/app/expenses`                                         | `expense.view`                                             | Active branch; shift if cash posting                    |
| Reports tabs                            | `/app/reports/[reportKind]`                             | Existing report permission                                 | Existing endpoint branch rules                          |
| Invoice print/reprint                   | `/app/sales/[saleId]/print?format=thermal               | a4`                                                        | `sale.view`                                             | Owned sale/active authorized branch |
| Company settings                        | `/app/settings`                                         | `company.view/manage`                                      | Company scope                                           |
| Branch/access management                | `/app/settings/branches`                                | Existing branch permission                                 | Company scope                                           |
| Warehouses                              | `/app/settings/warehouses`                              | `warehouse.view`                                           | Company scope; branch ownership                         |
| Registers                               | `/app/settings/registers`                               | `register.view`                                            | Company/branch ownership                                |
| Users                                   | `/app/settings/users`                                   | Existing user permission                                   | Company scope                                           |
| Roles/permissions                       | `/app/settings/roles`                                   | Existing role/permission management permission             | Company scope                                           |

Compatibility rules:

- `/app` is never removed; it becomes a redirect.
- Login return targets must accept only internal approved `/app/*` paths to prevent open redirects.
- Route visibility is permission-aware, but the API remains the authorization authority.
- A branch change invalidates branch-bound query keys and clears incompatible warehouse/register/batch selections before navigation continues.
- Browser Back/Forward must restore URL-backed tabs, filters, selected IDs, and dialogs safely without replaying mutations.

## 6. Implementation stages

### Stage 1 — UI foundation (medium)

Implement approved tokens and reusable primitives without altering business screens.

Expected files:

- Modify `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `packages/ui/package.json`, `packages/ui/src/index.ts`.
- Add `packages/ui/src/styles/tokens.css`, `packages/ui/src/lib/cn.ts`, and component files under `packages/ui/src/components/`.
- Add component tests under `packages/ui/src/**/*.test.tsx` and a focused accessibility test setup in `apps/web` if required.

Acceptance:

- Geist is the effective body font; light is the deterministic V1 default.
- Tokens match approved Figma semantic values.
- Button/Input/Select/Search/Badge/StatusBadge/Table/Pagination/Dialog/Alert/Loading/Empty/Error states meet keyboard and accessible-name checks.
- No console workflow or API request changes.

Commit: `ui: establish Vendo light design system`

### Stage 2 — Application shell and route foundation (high)

Implement authenticated layout, sidebar/header, branch context, route definitions, and compatibility redirect.

Expected files:

- Modify `apps/web/src/app/app/page.tsx`, `apps/web/src/app/providers.tsx`; change `apps/web/src/auth/auth-context.tsx` only if an internal return path is needed.
- Add `apps/web/src/app/app/layout.tsx`, initial route pages, `components/app-shell/*`, `contexts/branch-context.tsx`, `hooks/use-vendo-api.ts`, `lib/routes.ts`, `lib/permissions.ts`, and `lib/query-keys.ts`.

Acceptance:

- Login, refresh restoration, logout, `/app` compatibility, route navigation, permission-hidden items, and active branch behavior pass.
- 1440 expanded and 1280 collapsed shell match Figma; back-office mobile layout has no document-level horizontal overflow.
- No frontend-provided branch ID can bypass backend validation.

Commit: `ui: implement route-addressable application shell`

### Stage 3 — POS (very high, business-critical)

First add characterization coverage around current POS requests and payloads. Then split `PosConsole` into product discovery, cart, customer/pricing context, payment, held sales, completion, and history components while retaining the current query/API layer.

Expected files:

- Modify/move `apps/web/src/app/app/pos-console.tsx` and `apps/web/src/app/app/page.tsx` integration.
- Add `apps/web/src/app/app/pos/page.tsx`, `features/pos/*`, and reusable `components/business/{product-selector,batch-shade-selector,unit-quantity-editor,money-display,payment-rows}.tsx`.

Acceptance:

- Both approved resolutions pass Figma comparison.
- Barcode/SKU/name search, tile unit conversion, exact batch/shade, sanitary item, named/walk-in customer, retail/wholesale pricing, allowed override, discounts, hold/resume, split payment, due, tender/change, open-shift rule, idempotent completion, invoice/history, permission behavior, and inventory deduction all regress cleanly.
- POS mutation payloads and idempotency-key lifecycle remain unchanged unless a verified duplicate-submit bug requires an isolated frontend fix.

Commit: `ui: redesign POS cashier workspace`

### Stage 4 — Sale detail and post-sale operations (very high)

Status: **PASS (2026-09-11)** — route-addressable Sale Detail, immutable historical line presentation, backend-derived financial state, collection/return/refund/exchange/void dialogs, linked exchange invoices, print access, responsive browser acceptance, and affected Phase 9/10 regressions pass. Stage 5 has not started.

Move Phase 10 workflows out of the POS page and compose them in sale detail with deliberate dialogs and a financial timeline.

Expected files:

- Modify/move `phase10-console.tsx` and the sale-detail portion of `pos-console.tsx`.
- Add `app/app/sales/page.tsx`, `app/app/sales/[saleId]/page.tsx`, and `features/sales/*`.

Acceptance: collection, advance, partial/full return, exact batch restoration, non-resellable disposition, refund limit, exchange, void permission/reason, current outstanding, immutable original invoice, and print/reprint pass.

Commit: `ui: redesign sale detail and post-sale workflows`

### Stage 5 — Catalog (high)

Status: **PASS (2026-09-12)** — route-addressable product and master-data workspaces, adaptive TILE/SANITARY/ACCESSORY/GENERAL editing, real server-side search, coherent Decimal conversion and independent pricing presentation, barcode/lifecycle operations, responsive browser acceptance, and full regressions pass. Stage 6 has not started.

Split the current catalog console into route-level product list/detail/editor and master-data workspaces. Use adaptive sections for TILE, SANITARY, ACCESSORY, and GENERAL.

Expected files: modify/move `catalog-console.tsx`; add product routes and `features/catalog/*`.

Acceptance: company isolation, lifecycle, product search, tile Decimal coverage, direct-to-base conversions, barcode uniqueness, unit-specific prices, permission-hidden cost/price controls, and unsaved-form protection pass.

Commit: `ui: redesign catalog and adaptive product editor`

### Stage 6 — Inventory (very high)

Status: **PASS (2026-09-12)** — route-addressable Inventory overview, stock/detail, low-stock, batch/shade, deliberate opening/adjustment/damage/loss/transfer operations, physical-count lifecycle, and immutable movement presentation pass. Form-state defect `BUG-035` and physical-count zero-quantity defect `BUG-036` are resolved through focused tests, production builds, clean 16-migration replay, exact API/database reconciliation, and human Chrome acceptance at 1440 × 900 and 1280 × 720 with a clean console. External Codex browser-control issue `BUG-034` remains separately documented; no automated-browser PASS is claimed. Stage 7 has not started.

Split stock, operations, batches, counts, transfers, and history into explicit views. Dangerous operations use reviewed dialogs, never browser confirmation.

Expected files: modify/move `inventory-console.tsx`; add inventory routes and `features/inventory/*`.

Acceptance: one base balance with derived equivalents, exact batch/shade, stock policy, opening/adjustment/damage/loss, transfer, count/reconciliation, idempotency, and movement/balance reconciliation pass.

Commit: `ui: redesign inventory operations`

### Stage 7 — Purchasing (very high)

Status: **PASS (2026-09-12)** — Purchase Orders, Goods Receipts, Supplier Invoices, Supplier Payments, and Purchase Returns are route-addressable and use consistent light-first document list/detail patterns. Production-browser UAT passes the PO lifecycle, two-stage partial tile receiving, exact conversion/batch/shade, invoice draft/post, partial allocation, received-only and invoiced returns, linked-document navigation, responsive layouts, and clean console. Scoped API/database reconciliation and Phase 8/6 regressions pass; backend contracts, Prisma, migrations, and business rules remain unchanged. Stage 8 has not started.

Decompose the current purchasing console by document aggregate. Preserve PO, receipt, invoice, payment, and return separation.

Expected files: modify/move `purchasing-console.tsx`; add purchase routes and `features/purchasing/*`.

Acceptance: PO lifecycle, partial receiving, Box-to-PCS snapshot, tile batch/shade receipt, supplier invoice totals, payment allocation/advance, received-only versus invoiced return, idempotency, and no duplicate stock/payable effects pass.

Commit: `ui: redesign purchasing document workflows`

### Stage 8 — Customers and suppliers (high)

Status: **PASS (2026-09-13)** — route-addressable Customer Groups, Customers, protected Walk-in Customer, Customer Detail/Ledger, Suppliers, and Supplier Detail/Ledger workspaces use company-scoped real APIs, bounded search/pagination, permission-aware reviewed actions, exact Decimal balance semantics, and related Sales/Purchasing navigation. Production-browser UAT passes customer and supplier lifecycle, credit-limit, opening/correction/adjustment, receivable/advance and payable/advance interpretation, same-effective-date order after reload, 1440 × 900 and 1280 × 720 layouts, and clean-console inspection. `BUG-038` is resolved by deterministic ledger query ordering with focused regression coverage; no Prisma schema, migration, API shape, or financial semantic changed. Stage 9 has not started.

Compose shared party-list/contact/ledger primitives without creating a polymorphic backend abstraction.

Expected files: modify/move `parties-console.tsx`; add customer/supplier routes and `features/parties/*`.

Acceptance: walk-in protection, company-scoped master data, groups, credit limit permission, opening/correction history, ledger-derived signed balances, collections, supplier payable, lifecycle, pagination, and search pass.

Commit: `ui: redesign customer and supplier workspaces`

### Stage 9 — Cash and expenses (very high)

Separate shift lifecycle, immutable movements, manual cash commands, expense categories, and expense posting.

Expected files: modify/move `cash-console.tsx`; add cash/expense routes and `features/cash/*`, `features/expenses/*`.

Acceptance: single open shift, cash versus non-cash source mapping, change exclusion, expected cash formula, actual/variance, close-versus-post safety, closed-shift lock, expense reversal, permissions, and source uniqueness pass.

Commit: `ui: redesign cash shifts and expenses`

### Stage 10 — Dashboard and reports (high)

Apply the approved operational hierarchy to real report data. Replace dynamic generic presentation only where a domain column schema can be defined without changing API definitions.

Expected files: modify/move `reporting-console.tsx`; add dashboard/report routes, `features/reporting/*`, and shared metric/report-table components.

Acceptance: report permissions, branch/date/search filters, all current report kinds, event-period definitions, gross-profit rules, CSV exports, empty/loading/error states, and bounded pagination pass.

Commit: `ui: redesign dashboard and report workspaces`

### Stage 11 — Administration and settings (high)

Decompose `OrganizationConsole`; replace `window.prompt` editing with labeled forms/dialogs. Add UI only for already supported APIs.

Expected files: modify/move `organization-console.tsx`; add settings routes and `features/organization/*`, `features/identity/*`.

Acceptance: company, branches, branch access, warehouses, registers, users, roles, permissions, payment configuration, supported settings, tenant isolation, and audit-triggering updates pass.

Commit: `ui: redesign administration and settings`

### Stage 12 — Print, responsive, accessibility, and final polish (high)

Extract invoice projection/presentation while preserving the existing report invoice API and print behavior.

Expected files:

- Modify/move `InvoiceDocument` from `reporting-console.tsx`.
- Modify `globals.css` print rules only after browser and physical output comparison.
- Add print route/components and final cross-application accessibility/responsive tests.

Acceptance:

- Thermal 72 mm content and A4 194×277 mm content print correctly without app chrome.
- Historical snapshots, batch/shade, payments, due/change, and reprint remain accurate.
- 1440/1280 desktop, back-office tablet/mobile, keyboard navigation, focus visibility, accessible names, error/live-region behavior, and browser console pass.
- Physical thermal printer remains an environment acceptance gate and cannot be marked passed from browser-only testing.

Commit: `ui: polish print responsive and accessibility behavior`

## 7. Cross-stage verification gate

Every stage must execute and record:

1. Affected component/unit tests and route-level frontend tests.
2. Relevant API regression suites when a critical UI workflow is touched.
3. ESLint and strict TypeScript for affected packages.
4. `@vendo/ui` validation/build and Next.js production build.
5. Production-mode browser workflow using real local API data.
6. Browser console inspection with no unexplained errors or hydration warnings.
7. Figma-versus-browser comparison for each changed business-critical screen.
8. Permission-denied, loading, empty, error, disabled, and duplicate-submit states where relevant.
9. Git diff review proving no backend/schema/API-contract change entered the stage accidentally.

The POS, sale detail, inventory, purchasing, and cash stages also require their established Phase 6–11 invariant and concurrency suites. A visually correct screen is not a passing stage if a verified V1 workflow regresses.

## 8. Risk register

| Risk                                                                                 | Severity | Mitigation / gate                                                                                                                 |
| ------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Big-bang decomposition changes working request behavior                              | Critical | Characterization tests first; migrate one workflow/route at a time; retain payload builders and query invalidation until verified |
| Route migration breaks `/app`, login restoration, or Back/Forward                    | High     | Permanent `/app` compatibility redirect; protected layout tests; URL-backed state; browser navigation suite                       |
| Central branch context leaks or reuses stale warehouse/register/batch IDs            | Critical | Branch-scoped query keys; clear incompatible selections; keep `x-branch-id`; API ownership rejection tests                        |
| Frontend number formatting becomes authoritative                                     | Critical | Preserve Decimal strings; central display-only formatter; API result replaces previews; no `Number` arithmetic for posted values  |
| POS layout work regresses keyboard/scanner focus                                     | Critical | Characterize scan/focus behavior; shortcut map; focus-order E2E at 1440 and 1280                                                  |
| New component abstractions hide permission-sensitive actions incorrectly             | High     | Central permission helper for visibility only; keep API guards; test allowed and denied users                                     |
| Duplicate submissions during loading-state redesign                                  | Critical | Preserve operation-key reuse semantics; disable while pending; idempotency regression tests                                       |
| Dialog migration changes destructive semantics                                       | High     | Map each dialog to the existing endpoint, reason and idempotency requirements; verify original records stay immutable             |
| Shared UI package is not included by Tailwind 4 scanning                             | Medium   | Add explicit source inclusion; production-build visual smoke test                                                                 |
| Radix/shadcn dependency growth                                                       | Medium   | Install per-used primitive only; inspect bundle; no blanket generator run                                                         |
| Large console files create merge conflicts with existing local audit/rollout changes | High     | Stage-specific moves; review working tree before each stage; never discard unrelated changes                                      |
| Print CSS visual changes break physical printers                                     | High     | Browser print preview plus actual printer acceptance; preserve current dimensions until tested                                    |
| Missing frontend tests make refactors deceptively green                              | High     | Add characterization tests before moving business handlers; require browser workflows per stage                                   |

## 9. Estimated execution order and dependency logic

The approved order is retained:

1. UI Foundation — medium
2. Application Shell and routing — high
3. POS — very high, first critical workflow
4. Sale Detail — very high, depends on shell and POS transaction presentation
5. Catalog — high
6. Inventory — very high, depends on product/unit display primitives
7. Purchasing — very high, depends on catalog/inventory document primitives
8. Customers/Suppliers — high
9. Cash/Expenses — very high, depends on payment and branch/register presentation
10. Dashboard/Reports — high, depends on stable shared tables/metrics/filters
11. Administration/Settings — high
12. Print/Responsive/Accessibility polish — high, followed by the final UI regression gate

Stages are intentionally committed independently. A later stage does not begin until the current stage's build, tests, browser workflow, console review, and Figma comparison pass.

## 10. Files explicitly out of scope

- `apps/api/**`
- `packages/database/**` and all Prisma schema/migrations
- Existing REST/OpenAPI contracts
- Backend validation, authorization, inventory, sales, payment, cash, reporting, and audit services
- Production environment files and deployment topology, except documentation references required for frontend build verification

If implementation reveals that an approved Figma interaction cannot be supported by the current V1 API, stop and record the mismatch. Do not silently change the backend or invent client-only behavior.

## 11. Approval checkpoint

This document authorizes no implementation by itself. After review, the next approved task should be **Stage 1 — UI Foundation only**, including the selective Radix/shadcn dependency decision. No frontend source changes, dependency installation, commit, or push should occur before that approval.
