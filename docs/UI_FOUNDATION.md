# Vendo UI Foundation

## Scope

Stage 1 establishes the approved light-first design language and reusable presentation primitives. It does not migrate routes, redesign POS, or change any backend or business workflow.

## Token authority

The design values live in `packages/ui/src/styles/tokens.css` as `--vendo-*` semantic custom properties. The Next.js global stylesheet maps those values into Tailwind v4 theme names. Screens should use semantic utilities such as `bg-surface`, `text-text-primary`, `border-border`, `bg-primary`, and `text-danger` rather than introducing local palette colors.

Geist is the canonical sans-serif font. Geist Mono is reserved for identifiers, barcodes, and other genuinely monospaced values. Financial and quantity displays use tabular numbers.

## Component ownership

Vendo owns the React source in `packages/ui`. Radix provides only Dialog, Alert Dialog, and Tooltip interaction primitives. Native browser controls remain the Stage 1 authority for Select, Checkbox, Radio, and Switch.

The form standard uses a persistent visible label, optional required/optional indicators, helper text or validation feedback, and native disabled/read-only semantics. Consumers must connect any externally supplied helper/error identifier with `aria-describedby` when additional programmatic description is needed.

The table standard provides semantic table elements, responsive horizontal overflow, numeric alignment, hover and selected rows, caption support, and composable loading/empty states.

`MoneyDisplay` and `QuantityDisplay` are presentation-only. They must receive backend-authoritative values and must never perform pricing, conversion, due, inventory, tax, or rounding calculations.

## Figma alignment and intentional deviations

- The approved light palette, business-density control heights, restrained radii, and navy/amber identity are implemented directly.
- Select remains native rather than Radix-based because Stage 1 does not require searchable or multi-select behavior.
- Popover and Dropdown Menu are deferred until an approved screen demonstrates a concrete need.
- No icon library is added; the two search foundations use small source-owned SVG icons.
- Existing V1 screens are deliberately not migrated. Stage 2 and later stages will adopt the primitives route by route after approval.

## Compatibility

The package root export remains the public import surface. The previous `StatusBadge` name and its `success`/`warning` tones remain valid, with additional semantic tones available. Existing pages continue to compile without application-wide replacement.
