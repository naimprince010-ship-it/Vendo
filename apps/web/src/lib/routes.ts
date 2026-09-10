import { hasAnyPermission } from './permissions';

export type NavigationIcon =
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'purchases'
  | 'products'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'cash'
  | 'expenses'
  | 'reports'
  | 'settings';

export interface AppRoute {
  description: string;
  href: string;
  icon: NavigationIcon;
  label: string;
  permissions: readonly string[];
}

export interface AppRouteGroup {
  label: string;
  routes: readonly AppRoute[];
}

export const appRouteGroups: readonly AppRouteGroup[] = [
  {
    label: 'Workspace',
    routes: [
      {
        label: 'Dashboard',
        href: '/app/dashboard',
        icon: 'dashboard',
        description: 'Operational overview',
        permissions: ['report.view_sales'],
      },
      {
        label: 'POS',
        href: '/app/pos',
        icon: 'pos',
        description: 'Create and hold sales',
        permissions: ['sale.create'],
      },
      {
        label: 'Sales',
        href: '/app/sales',
        icon: 'sales',
        description: 'Sales, returns and collections',
        permissions: ['sale.view'],
      },
      {
        label: 'Purchases',
        href: '/app/purchases',
        icon: 'purchases',
        description: 'Orders, receipts and invoices',
        permissions: ['purchase.view'],
      },
    ],
  },
  {
    label: 'Operations',
    routes: [
      {
        label: 'Products',
        href: '/app/products',
        icon: 'products',
        description: 'Catalog, units and pricing',
        permissions: ['product.view'],
      },
      {
        label: 'Inventory',
        href: '/app/inventory',
        icon: 'inventory',
        description: 'Stock, batches and movements',
        permissions: ['inventory.view'],
      },
      {
        label: 'Customers',
        href: '/app/customers',
        icon: 'customers',
        description: 'Customers and receivables',
        permissions: ['customer.view'],
      },
      {
        label: 'Suppliers',
        href: '/app/suppliers',
        icon: 'suppliers',
        description: 'Suppliers and payables',
        permissions: ['supplier.view'],
      },
      {
        label: 'Cash',
        href: '/app/cash',
        icon: 'cash',
        description: 'Register shifts and drawer',
        permissions: ['cash.view_shift', 'cash.view_history'],
      },
      {
        label: 'Expenses',
        href: '/app/expenses',
        icon: 'expenses',
        description: 'Expense posting and history',
        permissions: ['expense.view'],
      },
      {
        label: 'Reports',
        href: '/app/reports',
        icon: 'reports',
        description: 'Operational reports',
        permissions: [
          'report.view_sales',
          'report.view_inventory',
          'report.view_purchases',
          'report.view_customers',
          'report.view_suppliers',
          'report.view_expenses',
          'report.view_cash',
        ],
      },
    ],
  },
  {
    label: 'Administration',
    routes: [
      {
        label: 'Settings',
        href: '/app/settings',
        icon: 'settings',
        description: 'Company and access settings',
        permissions: [
          'company.view',
          'branch.view',
          'warehouse.view',
          'register.view',
          'user.view',
          'role.view',
        ],
      },
    ],
  },
];

export const appRoutes = appRouteGroups.flatMap((group) => group.routes);

export function visibleRoutes(userPermissions: readonly string[]) {
  return appRoutes.filter((route) => hasAnyPermission(userPermissions, route.permissions));
}

export function routeForPath(pathname: string) {
  return [...appRoutes]
    .sort((left, right) => right.href.length - left.href.length)
    .find((route) => pathname === route.href || pathname.startsWith(`${route.href}/`));
}
