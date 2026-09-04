# Permissions

Authorization is permission-based and enforced by the API. Roles are configurable bundles; role names are not authorization checks.

Permission keys use `resource.action`, including `sale.create`, `sale.void`, `sale.refund`, `sale.discount`, `sale.override_price`, `product.create`, `product.edit`, `product.view_cost`, `inventory.view`, `inventory.adjust`, `inventory.transfer`, `purchase.create`, `purchase.approve`, `purchase.receive`, `cash.open_shift`, `cash.close_shift`, `report.view_sales`, `report.view_profit`, and `settings.manage`.

Requests also enforce company and branch scope. UI visibility improves usability but never replaces API authorization.
