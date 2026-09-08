# Permissions

Authorization is permission-based and enforced by the API. Roles are configurable bundles; role names are not authorization checks.

Permission keys use `resource.action`, including `sale.create`, `sale.void`, `sale.refund`, `sale.discount`, `sale.override_price`, `product.create`, `product.edit`, `product.view_cost`, `inventory.view`, `inventory.adjust`, `inventory.transfer`, `purchase.create`, `purchase.approve`, `purchase.receive`, `cash.open_shift`, `cash.close_shift`, `report.view_sales`, `report.view_profit`, and `settings.manage`.

Phase 3 administrative keys are:

- `user.create`, `user.view`, `user.update`, `user.manage_status`, `user.assign_role`, `user.manage_password`
- `role.create`, `role.view`, `role.update`, `role.assign_permission`
- `permission.view`

Phase 4 organization keys are:

- `company.view`, `company.manage`
- `branch.view`, `branch.create`, `branch.edit`, `branch.manage_access`, `branch.access_all`
- `warehouse.view`, `warehouse.create`, `warehouse.edit`
- `register.view`, `register.create`, `register.edit`

`branch.access_all` grants implicit access to every active branch in the authenticated company. It is a permission, not a role-name shortcut. Other users require explicit `UserBranch` assignments. `branch.manage_access` controls grant/revoke administration but does not itself grant operational branch access.

The permission catalog is centralized in `apps/api/src/authorization/permission-catalog.ts` and synchronized idempotently by the development seed/bootstrap commands. Controllers declare required keys with `@RequirePermissions(...)`; a global permission guard evaluates the current server-loaded permission set.

Requests also enforce company and branch scope. UI visibility improves usability but never replaces API authorization.

Phase 5 adds `category.view/create/edit`, `brand.view/create/edit`, `manufacturer.view/create/edit`, `unit.view/manage`, `product.view`, and `pricing.view/manage`. Existing `product.create`, `product.edit`, and `product.view_cost` remain in force.

Phase 6 adds:

- `inventory.opening_stock`
- `inventory.damage`
- `inventory.loss`
- `inventory.count`
- `inventory.reconcile`
- `inventory.view_history`
- `inventory.batch_manage`

Existing `inventory.view`, `inventory.adjust`, and `inventory.transfer` remain. Every inventory controller also requires the Phase 4 active-branch guard; cross-branch transfers separately validate destination-branch access.

Phase 7 adds:

- `customer.view`, `customer.create`, `customer.edit`, `customer.manage_credit`, `customer.view_ledger`, `customer.adjust_balance`
- `customer_group.view`, `customer_group.manage`
- `supplier.view`, `supplier.create`, `supplier.edit`, `supplier.view_ledger`, `supplier.adjust_balance`

Customer and supplier masters are company-scoped, not branch-scoped. Ledger viewing and signed balance posting are intentionally separate permissions from ordinary master-data editing. API ownership checks use the authenticated company and never accept a client company ID.

Phase 8 adds `purchase.view`, `purchase.edit`, `purchase.invoice`, `purchase.return`, `supplier.payment.create`, and `supplier.payment.view`. Existing `purchase.create`, `purchase.approve`, and `purchase.receive` are retained. Every purchase controller uses active-branch enforcement; document IDs, supplier IDs, receipt/invoice lines, warehouses, products, units, and batches are revalidated in the authenticated company on the backend.

Phase 9 reuses the established sales keys without duplicating the catalog: `sale.create` protects POS context/search, draft/hold/resume, and completion; `sale.view` protects history and detail; `sale.discount` is required for any non-zero line or invoice discount; and `sale.override_price` plus a reason is required when the requested unit price differs from the configured retail/wholesale price. Minimum-price rejection is always enforced. `product.view_cost` independently controls whether POS search exposes cost metadata.

Phase 10 adds `sale.return`, `sale.exchange`, `customer.collect_payment`, and `customer.view_payments`. Existing `sale.refund` and `sale.void` protect refund and completed-sale reversal commands. Every command also requires authenticated company context and an active authorized branch; UI visibility is advisory only.

Phase 11 retains `cash.open_shift` and `cash.close_shift` and adds `cash.view_shift`, `cash.cash_in`, `cash.cash_out`, `cash.adjust`, and `cash.view_history`. Expenses use `expense.view`, `expense.create`, `expense.edit`, `expense.post`, and `expense.reverse`. Automatic drawer movements inherit the permission of their originating sale, collection, supplier payment, or refund, while the backend still validates the active company/branch/register/shift inside the shared cash service.
