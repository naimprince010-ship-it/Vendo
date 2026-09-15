'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  VendoIcon,
  type VendoIconName,
} from '@vendo/ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  cloneElement,
  isValidElement,
  useId,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useAuth } from '../../auth/auth-context';
import { useVendoApi } from '../../hooks/use-vendo-api';
import {
  ADMIN_SECTIONS,
  friendlyAdminError,
  nextUserStatus,
  permissionGroup,
  permissionLabel,
  sectionFromPath,
  userStatusFilter,
} from './presentation';
import type {
  AuditEntry,
  Branch,
  BranchAccess,
  Company,
  Location,
  Page,
  Permission,
  Role,
  UserItem,
} from './types';

const PAGE_SIZE = 20;

function useAdministration() {
  const api = useVendoApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const can = (permission: string) => Boolean(user?.permissions.includes(permission));
  const refresh = (...keys: string[]) =>
    Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: ['admin', key] })));
  return { api, user, can, refresh };
}

function Field({
  label,
  children,
  hint,
  optional,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  optional?: boolean;
}) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id })
    : children;
  return (
    <FormField
      htmlFor={id}
      label={label}
      description={hint}
      optional={optional}
      required={!optional}
    >
      {control}
    </FormField>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

function AdministrationNav() {
  const pathname = usePathname();
  const { can } = useAdministration();
  const icons: Record<(typeof ADMIN_SECTIONS)[number]['key'], VendoIconName> = {
    company: 'company',
    branches: 'branch',
    access: 'permission',
    warehouses: 'warehouse',
    registers: 'cashRegister',
    users: 'user',
    roles: 'role',
  };
  return (
    <nav aria-label="Administration sections" className="flex gap-2 overflow-x-auto pb-1">
      {ADMIN_SECTIONS.filter((item) => can(item.permission)).map((item) => {
        const href = item.key === 'company' ? '/app/settings' : `/app/settings/${item.key}`;
        const active = sectionFromPath(pathname) === item.key;
        return (
          <Link
            key={item.key}
            href={href}
            className={`flex min-w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'border-primary bg-primary-subtle text-primary'
                : 'border-border bg-surface text-text-secondary hover:bg-neutral-hover'
            }`}
          >
            <VendoIcon name={icons[item.key]} size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdministrationWorkspace() {
  const pathname = usePathname();
  const section = sectionFromPath(pathname);
  const { can } = useAdministration();
  const selected = ADMIN_SECTIONS.find((item) => item.key === section)!;
  if (!can(selected.permission)) {
    return (
      <EmptyState
        title="Administration access unavailable"
        description="Your role does not include permission to view this administration area."
      />
    );
  }
  return (
    <div className="space-y-6">
      <AdministrationNav />
      {section === 'company' ? <CompanyWorkspace /> : null}
      {section === 'branches' ? <BranchesWorkspace /> : null}
      {section === 'access' ? <BranchAccessWorkspace /> : null}
      {section === 'warehouses' ? <LocationsWorkspace kind="warehouse" /> : null}
      {section === 'registers' ? <LocationsWorkspace kind="register" /> : null}
      {section === 'users' ? <UsersWorkspace /> : null}
      {section === 'roles' ? <RolesWorkspace /> : null}
    </div>
  );
}

function CompanyWorkspace() {
  const { api, can, refresh } = useAdministration();
  const query = useQuery({
    queryKey: ['admin', 'company'],
    queryFn: () => api<Company>('/company'),
  });
  const [overrides, setOverrides] = useState<
    Partial<
      Omit<
        Company,
        'id' | 'code' | 'negativeStockAllowed' | 'quantityScale' | 'moneyScale' | 'updatedAt'
      >
    >
  >({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const values = {
    name: overrides.name ?? query.data?.name ?? '',
    legalName: overrides.legalName ?? query.data?.legalName ?? '',
    phone: overrides.phone ?? query.data?.phone ?? '',
    email: overrides.email ?? query.data?.email ?? '',
    address: overrides.address ?? query.data?.address ?? '',
    countryCode: overrides.countryCode ?? query.data?.countryCode ?? '',
    currencyCode: overrides.currencyCode ?? query.data?.currencyCode ?? '',
    timezone: overrides.timezone ?? query.data?.timezone ?? '',
  };
  const set = (key: keyof typeof values, value: string) =>
    setOverrides((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await api('/company', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== '')),
        ),
      });
      await refresh('company', 'audit');
      setSaved(true);
    } catch (cause) {
      setError(
        friendlyAdminError(cause instanceof Error ? cause.message : 'Company update failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  if (query.isLoading) return <LoadingState title="Loading company settings…" />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        description={query.error?.message ?? 'Company unavailable.'}
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Settings"
        title="Company Profile"
        description={`Company-scoped identity and localization · ${query.data.code}`}
      />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {saved ? (
        <Alert tone="success">Company profile saved and recorded in the audit trail.</Alert>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Identity and contact</CardTitle>
            <CardDescription>Persistent business details used throughout Vendo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Company name">
              <Input
                value={values.name}
                disabled={!can('company.manage')}
                onChange={(e) => set('name', e.target.value)}
              />
            </Field>
            <Field label="Legal name" optional>
              <Input
                value={values.legalName}
                disabled={!can('company.manage')}
                onChange={(e) => set('legalName', e.target.value)}
              />
            </Field>
            <Field label="Phone" optional>
              <Input
                value={values.phone}
                disabled={!can('company.manage')}
                onChange={(e) => set('phone', e.target.value)}
              />
            </Field>
            <Field label="Email" optional>
              <Input
                type="email"
                value={values.email}
                disabled={!can('company.manage')}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
            <Field label="Address" optional>
              <Textarea
                value={values.address}
                disabled={!can('company.manage')}
                onChange={(e) => set('address', e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country">
                <Input
                  maxLength={2}
                  value={values.countryCode}
                  disabled={!can('company.manage')}
                  onChange={(e) => set('countryCode', e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Currency">
                <Input
                  maxLength={3}
                  value={values.currencyCode}
                  disabled={!can('company.manage')}
                  onChange={(e) => set('currencyCode', e.target.value.toUpperCase())}
                />
              </Field>
            </div>
            <Field label="Timezone" hint="Valid IANA timezone, for example Asia/Dhaka.">
              <Input
                value={values.timezone}
                disabled={!can('company.manage')}
                onChange={(e) => set('timezone', e.target.value)}
              />
            </Field>
            {can('company.manage') ? (
              <div className="flex items-end">
                <Button
                  onClick={() => void save()}
                  loading={busy}
                  disabled={!values.name.trim() || !values.timezone.trim()}
                >
                  Save company profile
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Operational safeguards</CardTitle>
              <CardDescription>Read-only settings exposed by the current API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <SettingValue
                label="Negative stock policy"
                value={query.data.negativeStockAllowed ? 'Allowed' : 'Blocked'}
              />
              <SettingValue
                label="Money precision"
                value={`${query.data.moneyScale} decimal places`}
              />
              <SettingValue
                label="Quantity precision"
                value={`${query.data.quantityScale} decimal places`}
              />
              <Alert tone="info">
                Changing these safeguards is intentionally unavailable because the backend has no
                supported management API.
              </Alert>
            </CardContent>
          </Card>
          <AuditCard entityType="Company" entityId={query.data.id} />
        </div>
      </div>
    </div>
  );
}

function SettingValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-divider pb-3">
      <span className="text-text-secondary">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function useListFilters() {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  return {
    draft,
    setDraft,
    search,
    status,
    setStatus,
    page,
    setPage,
    apply: () => {
      setSearch(draft.trim());
      setPage(1);
    },
    reset: () => {
      setDraft('');
      setSearch('');
      setStatus('');
      setPage(1);
    },
  };
}

function ListToolbar({
  state,
  placeholder,
}: {
  state: ReturnType<typeof useListFilters>;
  placeholder: string;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
      <SearchInput
        value={state.draft}
        placeholder={placeholder}
        onChange={(e) => state.setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') state.apply();
        }}
      />
      <Select
        aria-label="Lifecycle status"
        value={state.status}
        onChange={(e) => {
          state.setStatus(e.target.value);
          state.setPage(1);
        }}
      >
        <option value="">All statuses</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </Select>
      <div className="flex gap-2">
        <Button variant="outline" onClick={state.reset}>
          Reset
        </Button>
        <Button onClick={state.apply}>Apply</Button>
      </div>
    </div>
  );
}

function BranchesWorkspace() {
  const { api, can } = useAdministration();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useListFilters();
  const id = pathname.split('/').filter(Boolean)[3];
  const params = new URLSearchParams({ page: String(filters.page), limit: String(PAGE_SIZE) });
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('isActive', filters.status);
  const query = useQuery({
    queryKey: ['admin', 'branches', params.toString()],
    queryFn: () => api<Page<Branch>>(`/branches?${params}`),
  });
  const detail = useQuery({
    queryKey: ['admin', 'branch', id],
    queryFn: () => api<Branch>(`/branches/${id}`),
    enabled: Boolean(id),
  });
  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Administration"
        title="Branches"
        description="Manage company locations without changing the shell's active operational branch."
        actions={
          can('branch.create') ? (
            <BranchDialog trigger={<Button>Create branch</Button>} />
          ) : undefined
        }
      />
      <ListToolbar state={filters} placeholder="Search branch name or code" />
      {id ? (
        <BranchDetail
          branch={detail.data}
          loading={detail.isLoading}
          onClose={() => router.push('/app/settings/branches')}
        />
      ) : null}
      <EntityTable
        query={query}
        page={filters.page}
        setPage={filters.setPage}
        columns={['Branch', 'Contact', 'Status', 'Updated', 'Actions']}
        rows={(query.data?.items ?? []).map((branch) => [
          <Link
            key="name"
            href={`/app/settings/branches/${branch.id}`}
            className="font-semibold text-primary"
          >
            {branch.name}
            <span className="block font-mono text-xs text-text-muted">{branch.code}</span>
          </Link>,
          <span key="contact" className="text-sm">
            {branch.phone ?? 'No phone'}
            <span className="block text-xs text-text-muted">{branch.address ?? 'No address'}</span>
          </span>,
          <StatusBadge key="status" tone={branch.isActive ? 'success' : 'neutral'}>
            {branch.isActive ? 'Active' : 'Inactive'}
          </StatusBadge>,
          <span key="updated" className="text-sm text-text-secondary">
            {new Date(branch.updatedAt).toLocaleDateString()}
          </span>,
          <div key="actions" className="flex gap-2">
            {can('branch.edit') ? (
              <>
                <BranchDialog
                  branch={branch}
                  trigger={
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  }
                />
                <LifecycleAction kind="branch" item={branch} />
              </>
            ) : null}
          </div>,
        ])}
      />
    </div>
  );
}

function BranchDetail({
  branch,
  loading,
  onClose,
}: {
  branch?: Branch;
  loading: boolean;
  onClose(): void;
}) {
  if (loading) return <LoadingState title="Loading branch…" />;
  if (!branch) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{branch.name}</CardTitle>
            <CardDescription>{branch.code} · management detail</CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <SettingValue label="Status" value={branch.isActive ? 'Active' : 'Inactive'} />
        <SettingValue label="Phone" value={branch.phone ?? 'Not set'} />
        <SettingValue label="Address" value={branch.address ?? 'Not set'} />
        <div className="sm:col-span-3">
          <AuditCard entityType="Branch" entityId={branch.id} />
        </div>
      </CardContent>
    </Card>
  );
}

function EntityTable({
  query,
  page,
  setPage,
  columns,
  rows,
}: {
  query: {
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    data?: Page<unknown>;
    refetch(): unknown;
  };
  page: number;
  setPage(page: number): void;
  columns: string[];
  rows: ReactNode[][];
}) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError)
    return (
      <ErrorState
        description={query.error?.message ?? 'Unable to load records.'}
        onRetry={() => void query.refetch()}
      />
    );
  if (!rows.length)
    return (
      <EmptyState
        title="No matching records"
        description="Adjust the filters or create a new record."
      />
    );
  const total = query.data?.total ?? rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-4">
          <Pagination
            currentPage={page}
            pageCount={pages}
            totalItems={total}
            onPrevious={page > 1 ? () => setPage(page - 1) : undefined}
            onNext={page < pages ? () => setPage(page + 1) : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function BranchDialog({ branch, trigger }: { branch?: Branch; trigger: ReactNode }) {
  const { api, refresh } = useAdministration();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    code: branch?.code ?? '',
    name: branch?.name ?? '',
    phone: branch?.phone ?? '',
    address: branch?.address ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(branch ? `/branches/${branch.id}` : '/branches', {
        method: branch ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(!branch ? { code: values.code } : {}),
          name: values.name,
          ...(values.phone ? { phone: values.phone } : {}),
          ...(values.address ? { address: values.address } : {}),
        }),
      });
      await refresh('branches', 'branch', 'audit');
      setOpen(false);
    } catch (cause) {
      setError(friendlyAdminError(cause instanceof Error ? cause.message : 'Branch save failed.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{branch ? 'Edit branch' : 'Create branch'}</DialogTitle>
            <DialogDescription>
              Branch codes are company-scoped and immutable after creation.
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="space-y-4">
            {!branch ? (
              <Field label="Code">
                <Input
                  value={values.code}
                  onChange={(e) => setValues({ ...values, code: e.target.value.toUpperCase() })}
                />
              </Field>
            ) : null}
            <Field label="Name">
              <Input
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
              />
            </Field>
            <Field label="Phone" optional>
              <Input
                value={values.phone}
                onChange={(e) => setValues({ ...values, phone: e.target.value })}
              />
            </Field>
            <Field label="Address" optional>
              <Textarea
                value={values.address}
                onChange={(e) => setValues({ ...values, address: e.target.value })}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={busy}
              disabled={!values.name.trim() || (!branch && !values.code.trim())}
              onClick={() => void save()}
            >
              Save branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LifecycleAction({
  kind,
  item,
}: {
  kind: 'branch' | 'warehouse' | 'register';
  item: Branch | Location;
}) {
  const { api, refresh } = useAdministration();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const plural = kind === 'branch' ? 'branches' : `${kind}s`;
  const change = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/${plural}/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      await refresh(plural, kind, 'audit');
    } catch (cause) {
      setError(
        friendlyAdminError(cause instanceof Error ? cause.message : 'Status update failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={item.isActive ? 'danger' : 'outline'}>
          {item.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {item.isActive ? `Deactivate ${kind}?` : `Activate ${kind}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {item.isActive
              ? `${item.name} will remain in historical records. Existing stock and transactions are not deleted.`
              : `${item.name} will become available for supported new operations.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <Button
            variant={item.isActive ? 'danger' : 'primary'}
            loading={busy}
            onClick={() => void change()}
          >
            {item.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LocationsWorkspace({ kind }: { kind: 'warehouse' | 'register' }) {
  const { api, can } = useAdministration();
  const filters = useListFilters();
  const plural = `${kind}s`;
  const title = kind === 'warehouse' ? 'Warehouses' : 'Registers';
  const params = new URLSearchParams({ page: String(filters.page), limit: String(PAGE_SIZE) });
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('isActive', filters.status);
  const query = useQuery({
    queryKey: ['admin', plural, params.toString()],
    queryFn: () => api<Page<Location>>(`/${plural}?${params}`),
  });
  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Administration"
        title={title}
        description={
          kind === 'warehouse'
            ? 'Company stock locations with explicit branch ownership.'
            : 'POS terminals with explicit branch ownership; cash-shift rules remain unchanged.'
        }
        actions={
          can(`${kind}.create`) ? (
            <LocationDialog kind={kind} trigger={<Button>Create {kind}</Button>} />
          ) : undefined
        }
      />
      <ListToolbar state={filters} placeholder={`Search ${kind} name or code`} />
      <EntityTable
        query={query}
        page={filters.page}
        setPage={filters.setPage}
        columns={[title.slice(0, -1), 'Branch', 'Status', 'Updated', 'Actions']}
        rows={(query.data?.items ?? []).map((item) => [
          <span key="name" className="font-semibold">
            {item.name}
            <span className="block font-mono text-xs text-text-muted">{item.code}</span>
          </span>,
          <span key="branch">
            {item.branch.name}
            <span className="block text-xs text-text-muted">{item.branch.code}</span>
          </span>,
          <StatusBadge key="status" tone={item.isActive ? 'success' : 'neutral'}>
            {item.isActive ? 'Active' : 'Inactive'}
          </StatusBadge>,
          <span key="updated" className="text-sm text-text-secondary">
            {new Date(item.updatedAt).toLocaleDateString()}
          </span>,
          <div key="actions" className="flex gap-2">
            {can(`${kind}.edit`) ? (
              <>
                <LocationDialog
                  kind={kind}
                  item={item}
                  trigger={
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  }
                />
                <LifecycleAction kind={kind} item={item} />
              </>
            ) : null}
          </div>,
        ])}
      />
    </div>
  );
}

function LocationDialog({
  kind,
  item,
  trigger,
}: {
  kind: 'warehouse' | 'register';
  item?: Location;
  trigger: ReactNode;
}) {
  const { api, refresh } = useAdministration();
  const [open, setOpen] = useState(false);
  const plural = `${kind}s`;
  const branches = useQuery({
    queryKey: ['admin', 'branches', 'location-options'],
    queryFn: () => api<Page<Branch>>('/branches?limit=100&isActive=true'),
    enabled: open && !item,
  });
  const [branchId, setBranchId] = useState(item?.branchId ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(item ? `/${plural}/${item.id}` : `/${plural}`, {
        method: item ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(item ? { name } : { branchId, code, name }),
      });
      await refresh(plural, kind, 'audit');
      setOpen(false);
    } catch (cause) {
      setError(friendlyAdminError(cause instanceof Error ? cause.message : `${kind} save failed.`));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{item ? `Edit ${kind}` : `Create ${kind}`}</DialogTitle>
            <DialogDescription>
              {item
                ? 'The existing branch and code remain unchanged.'
                : 'Choose the owning active branch explicitly.'}
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="space-y-4">
            {!item ? (
              <>
                <Field label="Branch">
                  <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    <option value="">Select active branch</option>
                    {branches.data?.items.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.code} · {branch.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Code">
                  <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                </Field>
              </>
            ) : (
              <div className="rounded-lg border border-border bg-surface-subtle p-3 text-sm">
                <span className="text-text-muted">Owner branch</span>
                <strong className="ml-2">{item.branch.name}</strong>
              </div>
            )}
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={busy}
              disabled={!name.trim() || (!item && (!branchId || !code.trim()))}
              onClick={() => void save()}
            >
              Save {kind}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BranchAccessWorkspace() {
  const pathname = usePathname();
  const routeUserId = pathname.split('/').filter(Boolean)[3] ?? '';
  const { api, user, refresh } = useAdministration();
  const [userId, setUserId] = useState(routeUserId);
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState('');
  const users = useQuery({
    queryKey: ['admin', 'users', 'access-options'],
    queryFn: () => api<Page<UserItem>>('/users?limit=100'),
  });
  const branches = useQuery({
    queryKey: ['admin', 'branches', 'access-options'],
    queryFn: () => api<Page<Branch>>('/branches?limit=100&isActive=true'),
  });
  const access = useQuery({
    queryKey: ['admin', 'access', userId],
    queryFn: () => api<BranchAccess>(`/users/${userId}/branches`),
    enabled: Boolean(userId),
  });
  const grant = async () => {
    setError('');
    try {
      await api(`/users/${userId}/branches`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ branchId }),
      });
      await refresh('access', 'audit');
    } catch (cause) {
      setError(friendlyAdminError(cause instanceof Error ? cause.message : 'Access grant failed.'));
    }
  };
  const revoke = async (id: string) => {
    setError('');
    try {
      await api(`/users/${userId}/branches/${id}`, { method: 'DELETE' });
      await refresh('access', 'audit');
    } catch (cause) {
      setError(
        friendlyAdminError(cause instanceof Error ? cause.message : 'Access revoke failed.'),
      );
    }
  };
  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Administration"
        title="User Branch Access"
        description="Explicit operational branch scope. All Branches is granted only by the canonical branch.access_all permission."
      />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Select user</CardTitle>
            <CardDescription>Inspect the server-authoritative access mode.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="User">
              <Select
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setBranchId('');
                }}
              >
                <option value="">Select user</option>
                {users.data?.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.firstName} {item.lastName ?? ''} · {item.email}
                  </option>
                ))}
              </Select>
            </Field>
            {access.data?.accessMode === 'EXPLICIT' ? (
              <>
                <Field label="Branch">
                  <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    <option value="">Select active branch</option>
                    {branches.data?.items
                      .filter(
                        (branch) =>
                          !access.data?.branches.some((assigned) => assigned.id === branch.id),
                      )
                      .map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.code} · {branch.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Button disabled={!branchId} onClick={() => void grant()}>
                  Grant branch access
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Access scope</CardTitle>
            <CardDescription>
              {access.data ? access.data.email : 'Choose a user to inspect branch access.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {access.isLoading ? (
              <LoadingState />
            ) : access.data ? (
              <>
                <Alert tone="info">
                  {access.data.accessMode === 'ALL_ACTIVE_BRANCHES'
                    ? 'All active branches via branch.access_all. Explicit assignments do not limit this permission.'
                    : `${access.data.branches.length} explicit branch assignment${access.data.branches.length === 1 ? '' : 's'}.`}
                </Alert>
                <div className="mt-4 space-y-2">
                  {access.data.branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <span>
                        <strong>{branch.name}</strong>
                        <span className="block text-xs text-text-muted">{branch.code}</span>
                      </span>
                      {access.data?.accessMode === 'EXPLICIT' ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="danger">
                              Revoke
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke branch access?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {userId === user?.id && access.data.branches.length <= 1
                                  ? 'This is your final explicit branch assignment. The backend will prevent an unsafe self-revocation.'
                                  : `${access.data.email} will no longer be able to use ${branch.name}.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel asChild>
                                <Button variant="outline">Cancel</Button>
                              </AlertDialogCancel>
                              <AlertDialogAction asChild>
                                <Button variant="danger" onClick={() => void revoke(branch.id)}>
                                  Revoke access
                                </Button>
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </div>
                  ))}
                  {!access.data.branches.length ? (
                    <EmptyState
                      title="No explicit assignments"
                      description="Grant at least one active branch unless All Branches permission applies."
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <EmptyState title="Select a user" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsersWorkspace() {
  const pathname = usePathname();
  const id = pathname.split('/').filter(Boolean)[3];
  return id ? <UserDetail userId={id} /> : <UserList />;
}

function UserList() {
  const { api, can } = useAdministration();
  const filters = useListFilters();
  const params = new URLSearchParams({ page: String(filters.page), limit: String(PAGE_SIZE) });
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', userStatusFilter(filters.status));
  const query = useQuery({
    queryKey: ['admin', 'users', params.toString()],
    queryFn: () => api<Page<UserItem>>(`/users?${params}`),
  });
  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Administration"
        title="Users"
        description="Company-scoped accounts, roles, status, and branch access."
        actions={
          can('user.create') ? <UserDialog trigger={<Button>Create user</Button>} /> : undefined
        }
      />
      <ListToolbar state={filters} placeholder="Search user name or email" />
      <EntityTable
        query={query}
        page={filters.page}
        setPage={filters.setPage}
        columns={['User', 'Roles', 'Status', 'Last login', 'Actions']}
        rows={(query.data?.items ?? []).map((item) => [
          <Link
            key="user"
            href={`/app/settings/users/${item.id}`}
            className="font-semibold text-primary"
          >
            {item.firstName} {item.lastName ?? ''}
            <span className="block text-xs font-normal text-text-muted">{item.email}</span>
          </Link>,
          <span key="roles" className="text-sm">
            {item.userRoles.map(({ role }) => role.name).join(', ') || 'No role'}
          </span>,
          <StatusBadge
            key="status"
            tone={
              item.status === 'ACTIVE'
                ? 'success'
                : item.status === 'SUSPENDED'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {item.status}
          </StatusBadge>,
          <span key="login" className="text-sm text-text-secondary">
            {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : 'Never'}
          </span>,
          <Link key="action" href={`/app/settings/users/${item.id}`}>
            <Button size="sm" variant="outline">
              Manage
            </Button>
          </Link>,
        ])}
      />
    </div>
  );
}

function UserDetail({ userId }: { userId: string }) {
  const { api, user: currentUser, can, refresh } = useAdministration();
  const router = useRouter();
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => api<UserItem>(`/users/${userId}`),
  });
  const roles = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => api<Role[]>('/roles'),
    enabled: can('role.view'),
  });
  const access = useQuery({
    queryKey: ['admin', 'access', userId],
    queryFn: () => api<BranchAccess>(`/users/${userId}/branches`),
    enabled: can('branch.manage_access'),
  });
  if (query.isLoading) return <LoadingState title="Loading user…" />;
  if (query.isError || !query.data)
    return <ErrorState description={query.error?.message ?? 'User unavailable.'} />;
  const item = query.data;
  const assigned = new Set(item.userRoles.map(({ role }) => role.id));
  const setStatus = async () => {
    setError('');
    try {
      await api(`/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextUserStatus(item.status) }),
      });
      await refresh('user', 'users', 'audit');
    } catch (cause) {
      setError(
        friendlyAdminError(cause instanceof Error ? cause.message : 'Status update failed.'),
      );
    }
  };
  const roleChange = async (roleId: string, add: boolean) => {
    setError('');
    try {
      await api(add ? `/users/${userId}/roles` : `/users/${userId}/roles/${roleId}`, {
        method: add ? 'POST' : 'DELETE',
        headers: add ? { 'content-type': 'application/json' } : undefined,
        body: add ? JSON.stringify({ roleId }) : undefined,
      });
      await refresh('user', 'users', 'access', 'audit');
    } catch (cause) {
      setError(
        friendlyAdminError(cause instanceof Error ? cause.message : 'Role assignment failed.'),
      );
    }
  };
  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Users"
        title={`${item.firstName} ${item.lastName ?? ''}`.trim()}
        description={item.email}
        actions={
          <>
            <Button variant="ghost" onClick={() => router.push('/app/settings/users')}>
              Back to users
            </Button>
            {can('user.update') ? (
              <UserDialog user={item} trigger={<Button variant="outline">Edit profile</Button>} />
            ) : null}
            {can('user.manage_password') ? (
              <PasswordDialog
                user={item}
                trigger={<Button variant="outline">Set password</Button>}
              />
            ) : null}
          </>
        }
      />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Account status</CardTitle>
              <CardDescription>
                Status changes revoke active sessions. Password hashes and token internals are never
                exposed.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <StatusBadge tone={item.status === 'ACTIVE' ? 'success' : 'neutral'}>
                  {item.status}
                </StatusBadge>
                <p className="mt-2 text-sm text-text-muted">
                  Last login{' '}
                  {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : 'not recorded'}
                </p>
              </div>
              {can('user.manage_status') ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant={item.status === 'ACTIVE' ? 'danger' : 'outline'}
                      disabled={item.id === currentUser?.id && item.status === 'ACTIVE'}
                    >
                      {item.status === 'ACTIVE' ? 'Deactivate account' : 'Activate account'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Change user status?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {item.status === 'ACTIVE'
                          ? 'The account will be deactivated and its active sessions revoked. Historical activity remains intact.'
                          : 'The account will be allowed to authenticate again.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel asChild>
                        <Button variant="outline">Cancel</Button>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button
                          variant={item.status === 'ACTIVE' ? 'danger' : 'primary'}
                          onClick={() => void setStatus()}
                        >
                          Confirm status change
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Role assignments</CardTitle>
              <CardDescription>
                Roles are company-scoped permission bundles. Backend guards remain authoritative.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {roles.data?.map((role) => {
                const has = assigned.has(role.id);
                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <span>
                      <strong>{role.name}</strong>
                      <span className="block font-mono text-xs text-text-muted">{role.key}</span>
                    </span>
                    {can('user.assign_role') ? (
                      <RoleAssignmentAction
                        user={item}
                        role={role}
                        assigned={has}
                        onConfirm={() => roleChange(role.id, !has)}
                      />
                    ) : (
                      <StatusBadge tone={has ? 'success' : 'neutral'}>
                        {has ? 'Assigned' : 'Not assigned'}
                      </StatusBadge>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Branch scope</CardTitle>
            </CardHeader>
            <CardContent>
              {access.data ? (
                <>
                  <StatusBadge
                    tone={access.data.accessMode === 'ALL_ACTIVE_BRANCHES' ? 'info' : 'neutral'}
                  >
                    {access.data.accessMode === 'ALL_ACTIVE_BRANCHES' ? 'All Branches' : 'Explicit'}
                  </StatusBadge>
                  <p className="mt-3 text-sm text-text-secondary">
                    {access.data.accessMode === 'ALL_ACTIVE_BRANCHES'
                      ? 'Granted by branch.access_all through an assigned role.'
                      : access.data.branches.map((branch) => branch.name).join(', ') ||
                        'No assigned branches'}
                  </p>
                  <Link
                    href={`/app/settings/access/${userId}`}
                    className="mt-4 inline-block text-sm font-semibold text-primary"
                  >
                    Manage branch access
                  </Link>
                </>
              ) : (
                <p className="text-sm text-text-muted">Branch-access details require permission.</p>
              )}
            </CardContent>
          </Card>
          <AuditCard entityType="User" entityId={userId} />
        </div>
      </div>
    </div>
  );
}

function UserDialog({ user, trigger }: { user?: UserItem; trigger: ReactNode }) {
  const { api, can, refresh } = useAdministration();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    email: user?.email ?? '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    password: '',
  });
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const roles = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => api<Role[]>('/roles'),
    enabled: open && !user && can('role.view'),
  });
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(user ? `/users/${user.id}` : '/users', {
        method: user ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          user
            ? {
                email: values.email,
                firstName: values.firstName,
                ...(values.lastName ? { lastName: values.lastName } : {}),
                ...(values.phone ? { phone: values.phone } : {}),
              }
            : {
                ...values,
                lastName: values.lastName || undefined,
                phone: values.phone || undefined,
                roleIds,
              },
        ),
      });
      await refresh('users', 'user', 'audit');
      setOpen(false);
    } catch (cause) {
      setError(friendlyAdminError(cause instanceof Error ? cause.message : 'User save failed.'));
    } finally {
      setBusy(false);
    }
  };
  const valid =
    values.email.includes('@') &&
    values.firstName.trim() &&
    (user ||
      (values.password.length >= 12 &&
        /[a-z]/.test(values.password) &&
        /[A-Z]/.test(values.password) &&
        /\d/.test(values.password)));
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{user ? 'Edit user profile' : 'Create user'}</DialogTitle>
            <DialogDescription>
              {user
                ? 'Update public identity fields. Roles and branch access are managed separately.'
                : 'Create a company-scoped account with an approved initial password and optional roles.'}
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <Input
                value={values.firstName}
                onChange={(e) => setValues({ ...values, firstName: e.target.value })}
              />
            </Field>
            <Field label="Last name" optional>
              <Input
                value={values.lastName}
                onChange={(e) => setValues({ ...values, lastName: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={values.email}
                onChange={(e) => setValues({ ...values, email: e.target.value })}
              />
            </Field>
            <Field label="Phone" optional>
              <Input
                value={values.phone}
                onChange={(e) => setValues({ ...values, phone: e.target.value })}
              />
            </Field>
            {!user ? (
              <>
                <Field
                  label="Initial password"
                  hint="At least 12 characters with upper, lower, and number."
                >
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={values.password}
                    onChange={(e) => setValues({ ...values, password: e.target.value })}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm font-medium">Initial roles</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {roles.data?.map((role) => (
                      <Checkbox
                        key={role.id}
                        label={`${role.name} · ${role.key}`}
                        checked={roleIds.includes(role.id)}
                        onChange={(e) =>
                          setRoleIds((current) =>
                            e.target.checked
                              ? [...current, role.id]
                              : current.filter((id) => id !== role.id),
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={busy} disabled={!valid} onClick={() => void save()}>
              Save user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RoleAssignmentAction({
  user,
  role,
  assigned,
  onConfirm,
}: {
  user: UserItem;
  role: Role;
  assigned: boolean;
  onConfirm(): Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={assigned ? 'danger' : 'outline'}>
          {assigned ? 'Remove' : 'Assign'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {assigned ? 'Remove role assignment?' : 'Assign role?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {assigned ? 'Remove' : 'Assign'} {role.name} ({role.key}) {assigned ? 'from' : 'to'}{' '}
            {user.firstName} {user.lastName ?? ''}. This can materially change application access.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={assigned ? 'danger' : 'primary'}
              loading={busy}
              onClick={() => {
                setBusy(true);
                void onConfirm().finally(() => setBusy(false));
              }}
            >
              Confirm role change
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PasswordDialog({ user, trigger }: { user: UserItem; trigger: ReactNode }) {
  const { api, refresh } = useAdministration();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid =
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password);
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/users/${user.id}/password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      });
      await refresh('audit');
      setOpen(false);
      setPassword('');
    } catch (cause) {
      setError(
        friendlyAdminError(cause instanceof Error ? cause.message : 'Password update failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set approved user password</DialogTitle>
            <DialogDescription>
              This revokes the user&apos;s active sessions and forces re-authentication. The
              password is never displayed or stored by the frontend.
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field label="New password" hint="At least 12 characters with upper, lower, and number.">
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} disabled={!valid} onClick={() => void save()}>
              Set password and revoke sessions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RolesWorkspace() {
  const pathname = usePathname();
  const id = pathname.split('/').filter(Boolean)[3];
  return id ? <RoleDetail roleId={id} /> : <RoleList />;
}

function RoleList() {
  const { api, can } = useAdministration();
  const query = useQuery({ queryKey: ['admin', 'roles'], queryFn: () => api<Role[]>('/roles') });
  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Administration"
        title="Roles & Permissions"
        description="Readable company-scoped permission bundles; canonical keys remain visible."
        actions={
          can('role.create') ? <RoleDialog trigger={<Button>Create role</Button>} /> : undefined
        }
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState description={query.error.message} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data?.map((role) => (
            <Link key={role.id} href={`/app/settings/roles/${role.id}`}>
              <Card className="h-full transition-colors hover:border-border-strong">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{role.name}</CardTitle>
                      <CardDescription className="font-mono">{role.key}</CardDescription>
                    </div>
                    {role.isSystem ? <StatusBadge tone="info">System</StatusBadge> : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="min-h-10 text-sm text-text-secondary">
                    {role.description ?? 'No description'}
                  </p>
                  <p className="mt-4 text-sm font-semibold">
                    {role.permissions.length} permissions
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleDetail({ roleId }: { roleId: string }) {
  const { api, can, refresh } = useAdministration();
  const router = useRouter();
  const [selectedOverride, setSelectedOverride] = useState<string[] | null>(null);
  const [search, setSearch] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const role = useQuery({
    queryKey: ['admin', 'role', roleId],
    queryFn: () => api<Role>(`/roles/${roleId}`),
  });
  const permissions = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => api<Permission[]>('/permissions'),
    enabled: can('permission.view'),
  });
  const selected =
    selectedOverride ?? role.data?.permissions.map(({ permission }) => permission.id) ?? [];
  const groups = useMemo(() => {
    const result = new Map<string, Permission[]>();
    for (const permission of permissions.data ?? []) {
      if (
        search &&
        !`${permission.key} ${permission.description ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        continue;
      const group = permissionGroup(permission.key);
      result.set(group, [...(result.get(group) ?? []), permission]);
    }
    return [...result.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions.data, search]);
  if (role.isLoading) return <LoadingState title="Loading role…" />;
  if (role.isError || !role.data)
    return <ErrorState description={role.error?.message ?? 'Role unavailable.'} />;
  const original = role.data.permissions.map(({ permission }) => permission.id);
  const originalSet = new Set(original);
  const selectedSet = new Set(selected);
  const added = (permissions.data ?? []).filter(
    (permission) => selectedSet.has(permission.id) && !originalSet.has(permission.id),
  );
  const removed = role.data.permissions
    .map(({ permission }) => permission)
    .filter((permission) => !selectedSet.has(permission.id));
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ permissionIds: selected }),
      });
      await refresh('role', 'roles', 'user', 'users', 'access', 'audit');
      setReview(false);
    } catch (cause) {
      setError(
        friendlyAdminError(cause instanceof Error ? cause.message : 'Permission update failed.'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Roles & Permissions"
        title={role.data.name}
        description={`${role.data.key} · ${role.data.permissions.length} assigned permissions`}
        actions={
          <>
            <Button variant="ghost" onClick={() => router.push('/app/settings/roles')}>
              Back to roles
            </Button>
            {can('role.update') ? (
              <RoleDialog role={role.data} trigger={<Button variant="outline">Edit role</Button>} />
            ) : null}
          </>
        }
      />
      {role.data.isSystem ? (
        <Alert tone="info">
          System role. Protected behavior remains controlled by the backend.
        </Alert>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Permission matrix</CardTitle>
            <CardDescription>
              Human-readable labels with canonical permission keys. UI selection never replaces
              backend enforcement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search permission key or description"
            />
            <div className="mt-5 space-y-5">
              {groups.map(([group, items]) => (
                <section key={group}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">{group}</h3>
                    <span className="text-xs text-text-muted">
                      {items.filter((item) => selected.includes(item.id)).length}/{items.length}{' '}
                      selected
                    </span>
                  </div>
                  <div className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-2">
                    {items.map((permission) => (
                      <Checkbox
                        key={permission.id}
                        disabled={!can('role.assign_permission')}
                        checked={selected.includes(permission.id)}
                        onChange={(e) =>
                          setSelectedOverride(
                            e.target.checked
                              ? [...selected, permission.id]
                              : selected.filter((id) => id !== permission.id),
                          )
                        }
                        label={
                          <span>
                            <span className="block text-sm font-medium">
                              {permissionLabel(permission.key)}
                            </span>
                            <span className="block font-mono text-xs text-text-muted">
                              {permission.key}
                            </span>
                          </span>
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
            {can('role.assign_permission') ? (
              <div className="mt-5 flex justify-end">
                <Button disabled={!added.length && !removed.length} onClick={() => setReview(true)}>
                  Review permission changes
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Role summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SettingValue
                label="Type"
                value={role.data.isSystem ? 'System role' : 'Custom role'}
              />
              <SettingValue label="Selected" value={`${selected.length} permissions`} />
              <p className="text-text-secondary">
                {role.data.description ?? 'No description provided.'}
              </p>
            </CardContent>
          </Card>
          <AuditCard entityType="Role" entityId={roleId} />
        </div>
      </div>
      <Dialog open={review} onOpenChange={setReview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review permission changes</DialogTitle>
            <DialogDescription>
              These changes can materially alter application and data access for every user assigned
              to {role.data.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <ChangeList title="Added" items={added} empty="No additions" />
            <ChangeList title="Removed" items={removed} empty="No removals" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReview(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void save()}>
              Apply permission changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChangeList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Permission[];
  empty: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length ? (
        <ul className="space-y-1 font-mono text-xs text-text-secondary">
          {items.map((item) => (
            <li key={item.id}>{item.key}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">{empty}</p>
      )}
    </div>
  );
}

function RoleDialog({ role, trigger }: { role?: Role; trigger: ReactNode }) {
  const { api, refresh } = useAdministration();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(role?.key ?? '');
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(role ? `/roles/${role.id}` : '/roles', {
        method: role ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(!role ? { key } : {}),
          name,
          description: description || undefined,
        }),
      });
      await refresh('roles', 'role', 'audit');
      setOpen(false);
    } catch (cause) {
      setError(friendlyAdminError(cause instanceof Error ? cause.message : 'Role save failed.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{role ? 'Edit role' : 'Create role'}</DialogTitle>
            <DialogDescription>
              {role
                ? 'Update role identity without changing its permissions.'
                : 'Create a company-scoped permission bundle, then assign permissions on its detail page.'}
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="space-y-4">
            {!role ? (
              <Field label="Canonical key">
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                />
              </Field>
            ) : null}
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Description" optional>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={busy}
              disabled={name.trim().length < 2 || (!role && key.trim().length < 2)}
              onClick={() => void save()}
            >
              Save role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuditCard({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { api, can } = useAdministration();
  const query = useQuery({
    queryKey: ['admin', 'audit', entityType, entityId],
    queryFn: () =>
      api<Page<AuditEntry>>(`/audit-logs?limit=100&entityType=${encodeURIComponent(entityType)}`),
    enabled: can('audit.view'),
  });
  if (!can('audit.view')) return null;
  const items = query.data?.items.filter((item) => item.entityId === entityId) ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent changes</CardTitle>
        <CardDescription>Concise company-scoped audit activity.</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <LoadingState />
        ) : items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="border-b border-divider pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-semibold">{permissionLabel(item.action)}</p>
                <p className="text-xs text-text-muted">
                  {item.actor
                    ? `${item.actor.firstName} ${item.actor.lastName ?? ''}`.trim()
                    : 'System'}{' '}
                  · {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No recent matching audit events.</p>
        )}
      </CardContent>
    </Card>
  );
}
