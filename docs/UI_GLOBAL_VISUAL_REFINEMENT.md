# Vendo V1 Global Visual Refinement

## Scope

This pass refines the existing Vendo V1 presentation system without changing routes, workflows, permissions, API contracts, business calculations, database behavior, or authoritative Decimal values. It preserves the approved light-first direction, Lucide icon system, BDT currency label, quantity formatting, and semantic customer/supplier financial labels.

## Token and surface system

- Application canvas: a light neutral #f3f5f8 that separates the shell from content without making the product visibly gray.
- Primary surface: crisp white for cards, controls, dialogs, and dense operational panels.
- Secondary surface: #f7f9fc for grouping and low-emphasis structure.
- Interactive hover: #edf2f7 for restrained row and navigation feedback.
- Text, borders, and dividers were tightened for clearer hierarchy and contrast.
- Navy remains the structural brand color. Amber remains a sparse brand/attention accent.

## Elevation system

| Level | Use                                        | Treatment       |
| ----- | ------------------------------------------ | --------------- |
| 0     | Application canvas                         | No shadow       |
| 1     | Cards, tables, operational panels          | shadow-card     |
| 2     | Interactive cards and floating action bars | shadow-elevated |
| 3     | Dialogs and modal overlays                 | shadow-dialog   |

Borders remain part of the hierarchy so elevation does not produce a floating-card-heavy interface.

## Shared component refinements

- Cards use consistent border, radius, padding, title spacing, and low elevation.
- Tables use a restrained navy-soft header, compact rows, consistent dividers, hover feedback, and tabular numeric alignment.
- Form labels, inputs, focus, error, disabled, and read-only states use a unified hierarchy.
- Dialogs and alert dialogs use the same strong border, header divider, radius, and highest elevation level.
- Buttons retain the approved variants while improving border, hover, focus, and active depth.
- Status badges combine text with restrained semantic borders and tints.
- Empty/error/loading feedback stays compact and text-led, with small Lucide containers rather than large illustrations.

## KPI and semantic accents

Dashboard KPI cards retain real API metrics only. Icons use small tinted containers:

- Net sales: primary/navy
- Gross profit: restrained success
- Expenses: restrained danger
- Low stock: restrained amber warning
- Invoice/customer context: restrained information tone
- Supplier context: primary tone

No trends, comparisons, charts, or analytics were fabricated. KPI cards use subtle hover elevation only when they are links.

## Shell and module results

- Sidebar: clearer brand block, selected indicator, group spacing, compact tooltip behavior, and low-key structural shadow.
- Header: stronger separation from the canvas with consistent branch/account controls.
- POS: the existing three-column workflow remains unchanged; product results, cart rows, checkout, and floating actions have clearer surface depth while preserving density.
- Sales: list interactions and the Sale Detail action bar use the shared elevation hierarchy.
- Catalog, Inventory, Purchasing, Parties, Expenses, and Cash: their existing section navigation now shares the same elevated operational surface.
- Reports and Administration inherit the global card, table, form, badge, and feedback refinements without reducing information density.

## Responsive browser acceptance

| Viewport   | Result                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1440 x 900 | PASS — Dashboard, POS, Sale Detail, Products, Inventory, Purchasing, Customers, Cash, Reports, and Administration inspected         |
| 1280 x 720 | PASS — Dashboard and desktop-first POS captured; no body-level horizontal overflow                                                  |
| 1024 x 768 | PASS — Inventory/back-office shell captured; compact sidebar and content hierarchy remain usable                                    |
| 390 x 844  | PASS — Dashboard/mobile shell captured; menu, branch selector, KPI stack, and sign-out remain available with no horizontal overflow |

Representative after-state captures were taken during authenticated browser acceptance for Dashboard, POS, Sale Detail, Inventory, Reports, and the mobile shell. The approved baseline at commit abfb5f6d4cfe6d0b61cd742521175b7a1dffbeaf provides the before-state comparison.

## Accessibility

- Keyboard focus was verified on POS controls with a visible primary focus ring.
- Mobile navigation exposes named Menu, Close navigation, navigation links, branch selection, and Sign out controls.
- Lucide icons remain decorative where accompanying text exists; icon-only controls retain accessible names.
- Status and financial meaning remain text-led rather than color-only.
- Native table, form, and Radix dialog semantics remain intact.

This is an accessibility smoke result, not a formal WCAG certification.

## Performance and bundle impact

- No dependency was added.
- Refinement is token-first and uses existing Tailwind/CSS and shared UI components.
- Shadows are limited to three restrained levels.
- No animation framework, chart framework, new data request, or additional client state was introduced.
- Production build completed successfully.

## Verification

- Web tests: 42 passed.
- Shared UI tests: 7 passed.
- Monorepo lint: passed.
- Strict TypeScript: passed.
- Next.js production build: passed.
- Browser route smoke and responsive checks: passed.
- Browser console warnings/errors: none observed.
- Formatting and git diff --check: passed.

## Known limitations

- POS remains desktop-first by design and was not redesigned for mobile.
- The pass does not add unsupported charts, trend data, or new reporting visualizations.
- Baseline screenshots are represented by the approved baseline commit; this pass did not mutate or duplicate historical artifacts.
