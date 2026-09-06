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
