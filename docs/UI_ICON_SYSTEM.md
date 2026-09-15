# Vendo V1 — Canonical Lucide Icon System

This is the shared production and Figma mapping for Vendo V1. The registry contains the 83 required inventory semantics, the approved pilot key `settings`, and the genuinely used optional key `lowStock`. Business components use the Vendo semantic key; Lucide component names remain isolated in the shared registry.

Standard sizes are 16px for compact actions, 18px for normal business actions, 20px for navigation, and 24px for KPI or feedback emphasis. Text remains authoritative for critical actions and statuses.

| Vendo semantic key | Lucide component      | Default size | Usage category      |
| ------------------ | --------------------- | -----------: | ------------------- |
| `dashboard`        | `LayoutDashboard`     |         20px | navigation          |
| `pos`              | `MonitorSmartphone`   |         20px | navigation          |
| `sales`            | `BadgeDollarSign`     |         20px | navigation          |
| `purchasing`       | `ShoppingBag`         |         20px | navigation          |
| `products`         | `PackageOpen`         |         20px | navigation          |
| `inventory`        | `Boxes`               |         20px | navigation          |
| `customers`        | `Users`               |         20px | navigation          |
| `suppliers`        | `Truck`               |         20px | navigation          |
| `cash`             | `Banknote`            |         20px | navigation          |
| `expenses`         | `WalletCards`         |         20px | navigation          |
| `reports`          | `ChartNoAxesCombined` |         20px | navigation          |
| `administration`   | `ShieldCheck`         |         20px | navigation          |
| `settings`         | `Settings`            |         20px | navigation          |
| `barcode`          | `ScanBarcode`         |         16px | common action       |
| `cart`             | `ShoppingCart`        |         18px | business operation  |
| `receipt`          | `ReceiptText`         |         18px | business operation  |
| `invoice`          | `FileText`            |         18px | business operation  |
| `payment`          | `CreditCard`          |         18px | business operation  |
| `due`              | `ClockAlert`          |         18px | business operation  |
| `refund`           | `HandCoins`           |         18px | business operation  |
| `return`           | `Undo2`               |         18px | business operation  |
| `exchange`         | `Repeat2`             |         18px | business operation  |
| `holdSale`         | `PauseCircle`         |         18px | business operation  |
| `product`          | `Package`             |         18px | business operation  |
| `tile`             | `Grid2X2`             |         18px | business operation  |
| `sanitary`         | `Bath`                |         18px | business operation  |
| `category`         | `Tags`                |         18px | business operation  |
| `brand`            | `Badge`               |         18px | business operation  |
| `manufacturer`     | `Factory`             |         18px | business operation  |
| `unit`             | `Ruler`               |         18px | business operation  |
| `stock`            | `Layers3`             |         18px | business operation  |
| `box`              | `Box`                 |         18px | business operation  |
| `warehouse`        | `Warehouse`           |         18px | business operation  |
| `batch`            | `PackageCheck`        |         18px | business operation  |
| `shade`            | `Palette`             |         18px | business operation  |
| `transfer`         | `ArrowLeftRight`      |         18px | business operation  |
| `physicalCount`    | `ClipboardCheck`      |         18px | business operation  |
| `adjustment`       | `SlidersHorizontal`   |         18px | business operation  |
| `damageLoss`       | `PackageX`            |         18px | business operation  |
| `movementHistory`  | `History`             |         18px | business operation  |
| `purchaseOrder`    | `ClipboardList`       |         18px | business operation  |
| `goodsReceipt`     | `PackagePlus`         |         18px | business operation  |
| `supplierInvoice`  | `Files`               |         18px | business operation  |
| `supplierPayment`  | `CircleDollarSign`    |         18px | business operation  |
| `purchaseReturn`   | `PackageMinus`        |         18px | business operation  |
| `customer`         | `UserRound`           |         18px | business operation  |
| `customerGroup`    | `UsersRound`          |         18px | business operation  |
| `supplier`         | `Handshake`           |         18px | business operation  |
| `receivable`       | `Landmark`            |         18px | business operation  |
| `advance`          | `BadgePlus`           |         18px | business operation  |
| `cashRegister`     | `Vault`               |         18px | business operation  |
| `cashShift`        | `ClockArrowUp`        |         18px | business operation  |
| `cashIn`           | `CircleArrowDown`     |         18px | business operation  |
| `cashOut`          | `CircleArrowUp`       |         18px | business operation  |
| `expense`          | `WalletCards`         |         18px | business operation  |
| `profit`           | `TrendingUp`          |         24px | KPI and reporting   |
| `analytics`        | `ChartSpline`         |         24px | KPI and reporting   |
| `calendar`         | `CalendarDays`        |         18px | business operation  |
| `financialSummary` | `ChartPie`            |         24px | KPI and reporting   |
| `company`          | `Building2`           |         18px | business operation  |
| `branch`           | `GitBranch`           |         18px | business operation  |
| `user`             | `User`                |         18px | business operation  |
| `role`             | `UserCog`             |         18px | business operation  |
| `permission`       | `KeyRound`            |         18px | business operation  |
| `security`         | `LockKeyhole`         |         18px | business operation  |
| `auditLog`         | `ScrollText`          |         18px | business operation  |
| `add`              | `Plus`                |         16px | common action       |
| `edit`             | `Pencil`              |         16px | common action       |
| `search`           | `Search`              |         16px | common action       |
| `filter`           | `ListFilter`          |         16px | common action       |
| `refresh`          | `RefreshCw`           |         16px | common action       |
| `close`            | `X`                   |         16px | common action       |
| `more`             | `Ellipsis`            |         16px | common action       |
| `print`            | `Printer`             |         18px | business operation  |
| `export`           | `FileUp`              |         16px | common action       |
| `view`             | `Eye`                 |         16px | common action       |
| `back`             | `ArrowLeft`           |         16px | common action       |
| `save`             | `Save`                |         16px | common action       |
| `success`          | `CircleCheck`         |         24px | feedback and status |
| `warning`          | `TriangleAlert`       |         24px | feedback and status |
| `error`            | `CircleX`             |         24px | feedback and status |
| `info`             | `Info`                |         24px | feedback and status |
| `loading`          | `LoaderCircle`        |         24px | feedback and status |
| `empty`            | `Inbox`               |         24px | feedback and status |
| `lowStock`         | `PackageSearch`       |         18px | business operation  |

Implementation source: `packages/ui/src/icon.tsx`. Decorative icons are hidden from assistive technology by `VendoIcon`; icon-only controls must supply their accessible name and tooltip at the control level.
