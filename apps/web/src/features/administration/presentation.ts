export type AdminSection =
  'company' | 'branches' | 'access' | 'warehouses' | 'registers' | 'users' | 'roles';

export const ADMIN_SECTIONS: ReadonlyArray<{
  key: AdminSection;
  label: string;
  description: string;
  permission: string;
}> = [
  {
    key: 'company',
    label: 'Company Profile',
    description: 'Identity and localization',
    permission: 'company.view',
  },
  {
    key: 'branches',
    label: 'Branches',
    description: 'Business locations',
    permission: 'branch.view',
  },
  {
    key: 'access',
    label: 'Branch Access',
    description: 'User location scope',
    permission: 'branch.manage_access',
  },
  {
    key: 'warehouses',
    label: 'Warehouses',
    description: 'Stock locations',
    permission: 'warehouse.view',
  },
  {
    key: 'registers',
    label: 'Registers',
    description: 'POS terminals',
    permission: 'register.view',
  },
  { key: 'users', label: 'Users', description: 'Accounts and access', permission: 'user.view' },
  {
    key: 'roles',
    label: 'Roles & Permissions',
    description: 'Permission bundles',
    permission: 'role.view',
  },
];

export function sectionFromPath(pathname: string): AdminSection {
  const segment = pathname.split('/').filter(Boolean)[2];
  return ADMIN_SECTIONS.some((item) => item.key === segment)
    ? (segment as AdminSection)
    : 'company';
}

export function permissionGroup(key: string): string {
  const resource = key.split('.')[0] ?? 'other';
  const labels: Record<string, string> = {
    company: 'Company',
    branch: 'Branch',
    warehouse: 'Warehouses',
    register: 'Registers',
    user: 'Users',
    role: 'Roles',
    permission: 'Permissions',
    category: 'Catalog',
    brand: 'Catalog',
    manufacturer: 'Catalog',
    unit: 'Catalog',
    product: 'Catalog',
    pricing: 'Catalog',
    inventory: 'Inventory',
    purchase: 'Purchasing',
    supplier: 'Suppliers',
    customer: 'Customers',
    customer_group: 'Customers',
    sale: 'Sales',
    refund: 'Sales',
    cash: 'Cash',
    expense: 'Expenses',
    report: 'Reports',
    settings: 'Settings',
    audit: 'Audit',
  };
  return labels[resource] ?? 'Other';
}

export function permissionLabel(key: string): string {
  return key
    .split('.')
    .map((part) => part.replaceAll('_', ' '))
    .join(' · ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function friendlyAdminError(message: string): string {
  if (/cannot remove your last branch access/i.test(message))
    return 'You cannot remove your final branch assignment. Grant another branch first.';
  if (/email is already in use/i.test(message))
    return 'That email is already assigned to another user.';
  if (/code is already in use/i.test(message))
    return 'That code is already in use in this company.';
  if (/active company branch is required/i.test(message))
    return 'Select an active branch owned by this company.';
  if (/cannot deactivate your own account/i.test(message))
    return 'You cannot deactivate your own signed-in account.';
  if (/invalid|unavailable|not found/i.test(message)) return message;
  return message || 'The administration request could not be completed.';
}

export function userStatusFilter(isActive: string): '' | 'ACTIVE' | 'DISABLED' {
  if (isActive === 'true') return 'ACTIVE';
  if (isActive === 'false') return 'DISABLED';
  return '';
}

export function nextUserStatus(status: string): 'ACTIVE' | 'DISABLED' {
  return status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
}
