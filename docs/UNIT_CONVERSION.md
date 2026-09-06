# Unit Conversion

Each stock-tracked product defines one base unit. Product-specific conversion rules convert a transaction quantity into base quantity using Decimal arithmetic.

For a tile whose base unit is PCS:

```text
1 BOX = 4 PCS
1 PCS = 4 SQFT
2 BOX = 8 PCS = 32 SQFT
```

Square metres use the controlled constant `1 sqm = 10.7639104167 sqft`, followed by the configured quantity rounding policy. Conversion metadata used by a transaction is snapshotted on its line/movement to keep history stable if catalog configuration later changes.

Backend services validate conversion paths; frontend conversions are previews only.

Phase 5 supports direct unit-to-base factors only. Conversion from A to B is `quantity × factor(A) ÷ factor(B)`, with base factor one. This prevents circular and ambiguous paths. Factors use `numeric(24,10)`, must be positive, and only one may be active for a product/unit.

API quantities are decimal strings. Base preview results retain up to 10 decimal places for coherent equivalence; target displays use the unit scale. Phase 6 must enforce operational quantity policy and snapshot each factor.

Phase 6 now resolves every operational input through the same direct factor-to-base model, rounds the persisted base delta to six decimal places, rejects zero after rounding, and snapshots the ten-decimal factor and positive transaction quantity on the immutable movement. Balance responses derive all configured units from the one stored base quantity; they never persist display equivalents.
