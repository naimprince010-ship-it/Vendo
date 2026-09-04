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
