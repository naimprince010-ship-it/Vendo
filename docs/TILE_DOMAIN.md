# Tile Domain

Tiles are reusable core Products with an optional `TileProfile`. The profile owns dimensions, thickness, display size, series, finish, surface, color, grade, origin, pieces-per-box, and coverage rules.

Batch tracking is optional. When enabled, allocation identifies batch/lot and shade. Receipt and return movements preserve those identities.

## Invariants

- Dimensions and coverage are positive decimal values.
- Pieces per box is a positive integer.
- One product has one authoritative inventory base unit.
- Boxes, pieces, square feet, and square metres are derived representations of that one quantity.
- Pricing units are independent price records; promotional box price need not equal area price multiplied by coverage.
