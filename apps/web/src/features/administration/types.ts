export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface Company {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  countryCode: string;
  currencyCode: string;
  timezone: string;
  negativeStockAllowed: boolean;
  quantityScale: number;
  moneyScale: number;
  updatedAt: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
  branch: Pick<Branch, 'id' | 'code' | 'name' | 'isActive'>;
  createdAt: string;
  updatedAt: string;
}

export interface RoleSummary {
  id: string;
  key: string;
  name: string;
}

export interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  userRoles: Array<{ role: RoleSummary }>;
}

export interface Permission {
  id: string;
  key: string;
  description: string | null;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: Array<{ permission: Permission }>;
}

export interface BranchAccess {
  userId: string;
  email: string;
  accessMode: 'ALL_ACTIVE_BRANCHES' | 'EXPLICIT';
  branches: Branch[];
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  createdAt: string;
  actor: { firstName: string; lastName: string | null; email: string } | null;
  branch: { code: string; name: string } | null;
}
