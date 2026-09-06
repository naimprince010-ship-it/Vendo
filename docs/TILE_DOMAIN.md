# Tile Domain

Tiles are reusable core Products with an optional `TileProfile`. The profile owns dimensions, thickness, display size, series, finish, surface, color, grade, origin, pieces-per-box, and coverage rules.

Batch tracking is optional. When enabled, allocation identifies batch/lot and shade. Receipt and return movements preserve those identities.

Phase 6 enforces this option in every stock mutation: a batch-tracked tile requires an active batch belonging to the same company and product; other products reject batch IDs. Batch/lot/shade masters do not store stock counters. Their available boxes, pieces, and area are derived from the batch-keyed base balance and active product conversions.

## Invariants

- Dimensions and coverage are positive decimal values.
- Pieces per box is a positive integer.
- One product has one authoritative inventory base unit.
- Boxes, pieces, square feet, and square metres are derived representations of that one quantity.
- Pricing units are independent price records; promotional box price need not equal area price multiplied by coverage.

## Dimensions and Commercial Coverage

The API accepts millimetres, centimetres, or inches and stores width/height in millimetres using Prisma Decimal. Informational nominal area uses `mm² / 92,903.04` for square feet and `mm² / 1,000,000` for square metres, rounded to 10 decimal places.

Nominal area does not control commercial conversion. Active product conversion factors do. With PCS as base, `BOX = 4` and `SQFT = 0.25` means one box is four pieces and one piece represents four commercial square feet.
