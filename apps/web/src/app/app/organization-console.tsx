'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../../auth/auth-context';

interface Company {
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
}
interface Branch {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}
interface Location {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
  branch: Pick<Branch, 'id' | 'code' | 'name' | 'isActive'>;
}
interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
}
interface Page<T> {
  items: T[];
  total: number;
}
interface BranchAccess {
  userId: string;
  email: string;
  accessMode: 'ALL_ACTIVE_BRANCHES' | 'EXPLICIT';
  branches: Branch[];
}

const companySchema = z.object({
  name: z.string().trim().min(1).max(160),
  legalName: z.string().trim().max(200),
  phone: z.string().trim().max(40),
  email: z.string().trim().email().or(z.literal('')),
  address: z.string().trim().max(1000),
  countryCode: z.string().trim().length(2),
  currencyCode: z.string().trim().length(3),
  timezone: z.string().trim().min(1).max(80),
});
const branchSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(1000),
});
const locationSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(160),
});
type CompanyForm = z.infer<typeof companySchema>;
type BranchForm = z.infer<typeof branchSchema>;
type LocationForm = z.infer<typeof locationSchema>;
type Tab = 'company' | 'branches' | 'access' | 'warehouses' | 'registers';
type Api = <T>(path: string, init?: RequestInit) => Promise<T>;
type Mutate = <T>(
  work: () => Promise<T>,
  message: string,
  keys: string[],
) => Promise<T | undefined>;

const fieldClass =
  'mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400';
const buttonClass =
  'rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Notice({ message, error }: { message?: string; error?: string }) {
  if (!message && !error) return null;
  return (
    <p role="status" className={`mt-3 text-sm ${error ? 'text-red-300' : 'text-emerald-300'}`}>
      {error ?? message}
    </p>
  );
}

export function OrganizationConsole() {
  const { user, authenticatedFetch } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('company');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const can = (permission: string) => Boolean(user?.permissions.includes(permission));

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await authenticatedFetch(path, init);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      const detail = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      throw new Error(detail ?? `Request failed (${response.status})`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  const mutate: Mutate = async (work, message, keys) => {
    setError('');
    setNotice('');
    try {
      const result = await work();
      setNotice(message);
      await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
      return undefined;
    }
  };

  const tabs: Array<{ id: Tab; label: string; permission: string }> = [
    { id: 'company', label: 'Company', permission: 'company.view' },
    { id: 'branches', label: 'Branches', permission: 'branch.view' },
    { id: 'access', label: 'User access', permission: 'branch.manage_access' },
    { id: 'warehouses', label: 'Warehouses', permission: 'warehouse.view' },
    { id: 'registers', label: 'Registers', permission: 'register.view' },
  ];

  return (
    <>
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Organization sections">
        {tabs
          .filter((item) => can(item.permission))
          .map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setNotice('');
                setError('');
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === item.id ? 'bg-amber-400 text-slate-950' : 'border border-slate-700 bg-slate-900 text-slate-300'}`}
            >
              {item.label}
            </button>
          ))}
      </nav>
      <Notice message={notice} error={error} />
      <div className="mt-4">
        {tab === 'company' && can('company.view') ? (
          <CompanyPanel api={api} canEdit={can('company.manage')} mutate={mutate} />
        ) : null}
        {tab === 'branches' && can('branch.view') ? (
          <BranchesPanel
            api={api}
            canCreate={can('branch.create')}
            canEdit={can('branch.edit')}
            mutate={mutate}
          />
        ) : null}
        {tab === 'access' && can('branch.manage_access') ? (
          <AccessPanel api={api} mutate={mutate} />
        ) : null}
        {tab === 'warehouses' && can('warehouse.view') ? (
          <LocationsPanel
            kind="warehouse"
            api={api}
            canCreate={can('warehouse.create')}
            canEdit={can('warehouse.edit')}
            mutate={mutate}
          />
        ) : null}
        {tab === 'registers' && can('register.view') ? (
          <LocationsPanel
            kind="register"
            api={api}
            canCreate={can('register.create')}
            canEdit={can('register.edit')}
            mutate={mutate}
          />
        ) : null}
      </div>
    </>
  );
}

function CompanyPanel({ api, canEdit, mutate }: { api: Api; canEdit: boolean; mutate: Mutate }) {
  const company = useQuery({ queryKey: ['company'], queryFn: () => api<Company>('/company') });
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CompanyForm>({ resolver: zodResolver(companySchema) });
  useEffect(() => {
    if (company.data)
      reset({
        name: company.data.name,
        legalName: company.data.legalName ?? '',
        phone: company.data.phone ?? '',
        email: company.data.email ?? '',
        address: company.data.address ?? '',
        countryCode: company.data.countryCode,
        currencyCode: company.data.currencyCode,
        timezone: company.data.timezone,
      });
  }, [company.data, reset]);
  const submit = (values: CompanyForm) =>
    mutate(
      () =>
        api<Company>('/company', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '')),
          ),
        }),
      'Company profile saved.',
      ['company'],
    );
  if (company.isLoading) return <p>Loading company…</p>;
  if (company.error) return <p className="text-red-300">Unable to load company.</p>;
  return (
    <Card title={`Company profile · ${company.data?.code ?? ''}`}>
      <form onSubmit={handleSubmit(submit)} className="grid gap-4 md:grid-cols-2">
        <Field label="Business name">
          <input {...register('name')} disabled={!canEdit} className={fieldClass} />
        </Field>
        <Field label="Legal name">
          <input {...register('legalName')} disabled={!canEdit} className={fieldClass} />
        </Field>
        <Field label="Phone">
          <input {...register('phone')} disabled={!canEdit} className={fieldClass} />
        </Field>
        <Field label="Email">
          <input type="email" {...register('email')} disabled={!canEdit} className={fieldClass} />
        </Field>
        <Field label="Country code">
          <input {...register('countryCode')} disabled={!canEdit} className={fieldClass} />
        </Field>
        <Field label="Currency">
          <input {...register('currencyCode')} disabled={!canEdit} className={fieldClass} />
        </Field>
        <Field label="Timezone">
          <input {...register('timezone')} disabled={!canEdit} className={fieldClass} />
        </Field>
        <Field label="Address">
          <input {...register('address')} disabled={!canEdit} className={fieldClass} />
        </Field>
        {canEdit ? (
          <button disabled={isSubmitting} className={`${buttonClass} md:col-span-2`}>
            Save company profile
          </button>
        ) : null}
      </form>
    </Card>
  );
}

function BranchesPanel({
  api,
  canCreate,
  canEdit,
  mutate,
}: {
  api: Api;
  canCreate: boolean;
  canEdit: boolean;
  mutate: Mutate;
}) {
  const branches = useQuery({
    queryKey: ['branches'],
    queryFn: () => api<Page<Branch>>('/branches?limit=100'),
  });
  const [activeId, setActiveId] = useState('');
  const [activeName, setActiveName] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: { code: '', name: '', phone: '', address: '' },
  });
  const create = async (values: BranchForm) => {
    await mutate(
      () =>
        api('/branches', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '')),
          ),
        }),
      'Branch created.',
      ['branches'],
    );
    reset();
  };
  const toggle = (branch: Branch) =>
    mutate(
      () =>
        api(`/branches/${branch.id}/status`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ isActive: !branch.isActive }),
        }),
      `Branch ${branch.isActive ? 'deactivated' : 'activated'}.`,
      ['branches'],
    );
  const rename = (branch: Branch) => {
    const name = window.prompt('Branch name', branch.name)?.trim();
    if (name && name !== branch.name)
      void mutate(
        () =>
          api(`/branches/${branch.id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name }),
          }),
        'Branch updated.',
        ['branches'],
      );
  };
  const validateContext = async () => {
    const selected = await mutate(
      () => api<Branch>('/branches/active-context', { headers: { 'x-branch-id': activeId } }),
      'Active branch context validated.',
      [],
    );
    if (selected) setActiveName(selected.name);
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.6fr)]">
      <Card title="Branches">
        <div className="space-y-3">
          {branches.data?.items.map((branch) => (
            <div
              key={branch.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4"
            >
              <div>
                <p className="font-medium">{branch.name}</p>
                <p className="text-xs text-slate-400">
                  {branch.code} · {branch.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              {canEdit ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => rename(branch)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggle(branch)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm"
                  >
                    {branch.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
      <div className="space-y-5">
        {canCreate ? (
          <Card title="Create branch">
            <form onSubmit={handleSubmit(create)} className="space-y-3">
              <Field label="Code">
                <input {...register('code')} className={fieldClass} />
              </Field>
              <Field label="Name">
                <input {...register('name')} className={fieldClass} />
              </Field>
              <Field label="Phone">
                <input {...register('phone')} className={fieldClass} />
              </Field>
              <Field label="Address">
                <input {...register('address')} className={fieldClass} />
              </Field>
              <button disabled={isSubmitting} className={buttonClass}>
                Create branch
              </button>
            </form>
          </Card>
        ) : null}
        <Card title="Active branch context">
          <select
            aria-label="Active branch"
            value={activeId}
            onChange={(event) => {
              setActiveId(event.target.value);
              setActiveName('');
            }}
            className={fieldClass}
          >
            <option value="">Select active branch</option>
            {branches.data?.items
              .filter((branch) => branch.isActive)
              .map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!activeId}
            onClick={() => void validateContext()}
            className={`${buttonClass} mt-3`}
          >
            Use branch
          </button>
          {activeName ? (
            <p className="mt-3 text-sm text-emerald-300">Active: {activeName}</p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function AccessPanel({ api, mutate }: { api: Api; mutate: Mutate }) {
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => api<Page<UserItem>>('/users?limit=100'),
  });
  const branches = useQuery({
    queryKey: ['branches'],
    queryFn: () => api<Page<Branch>>('/branches?limit=100'),
  });
  const [userId, setUserId] = useState('');
  const [branchId, setBranchId] = useState('');
  const access = useQuery({
    queryKey: ['branch-access', userId],
    queryFn: () => api<BranchAccess>(`/users/${userId}/branches`),
    enabled: Boolean(userId),
  });
  const grant = () =>
    mutate(
      () =>
        api(`/users/${userId}/branches`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ branchId }),
        }),
      'Branch access granted.',
      ['branch-access'],
    );
  const revoke = (id: string) =>
    mutate(
      () => api(`/users/${userId}/branches/${id}`, { method: 'DELETE' }),
      'Branch access removed.',
      ['branch-access'],
    );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Assign branch access">
        <Field label="User">
          <select
            aria-label="Access user"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className={fieldClass}
          >
            <option value="">Select user</option>
            {users.data?.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.firstName} {item.lastName ?? ''} · {item.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Branch">
          <select
            aria-label="Access branch"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            className={fieldClass}
          >
            <option value="">Select branch</option>
            {branches.data?.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          disabled={!userId || !branchId}
          onClick={() => void grant()}
          className={`${buttonClass} mt-4`}
        >
          Grant access
        </button>
      </Card>
      <Card title="Current access">
        {access.data ? (
          <>
            <p className="mb-3 text-sm text-slate-400">
              Mode:{' '}
              {access.data.accessMode === 'ALL_ACTIVE_BRANCHES'
                ? 'All active branches via permission'
                : 'Explicit assignments'}
            </p>
            <div className="space-y-2">
              {access.data.branches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 p-3"
                >
                  <span>{branch.name}</span>
                  <button
                    type="button"
                    onClick={() => void revoke(branch.id)}
                    className="text-sm text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Select a user to inspect access.</p>
        )}
      </Card>
    </div>
  );
}

function LocationsPanel({
  kind,
  api,
  canCreate,
  canEdit,
  mutate,
}: {
  kind: 'warehouse' | 'register';
  api: Api;
  canCreate: boolean;
  canEdit: boolean;
  mutate: Mutate;
}) {
  const plural = kind === 'warehouse' ? 'warehouses' : 'registers';
  const title = kind === 'warehouse' ? 'Warehouse' : 'Register';
  const branches = useQuery({
    queryKey: ['branches'],
    queryFn: () => api<Page<Branch>>('/branches?limit=100'),
  });
  const locations = useQuery({
    queryKey: [plural],
    queryFn: () => api<Page<Location>>(`/${plural}?limit=100`),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { branchId: '', code: '', name: '' },
  });
  const create = async (values: LocationForm) => {
    await mutate(
      () =>
        api(`/${plural}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values),
        }),
      `${title} created.`,
      [plural],
    );
    reset();
  };
  const toggle = (item: Location) =>
    mutate(
      () =>
        api(`/${plural}/${item.id}/status`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ isActive: !item.isActive }),
        }),
      `${title} ${item.isActive ? 'deactivated' : 'activated'}.`,
      [plural],
    );
  const rename = (item: Location) => {
    const name = window.prompt(`${title} name`, item.name)?.trim();
    if (name && name !== item.name)
      void mutate(
        () =>
          api(`/${plural}/${item.id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name }),
          }),
        `${title} updated.`,
        [plural],
      );
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
      <Card title={`${title}s`}>
        <div className="space-y-3">
          {locations.data?.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-slate-400">
                  {item.code} · {item.branch.name} · {item.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              {canEdit ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => rename(item)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggle(item)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm"
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
      {canCreate ? (
        <Card title={`Create ${kind}`}>
          <form onSubmit={handleSubmit(create)} className="space-y-3">
            <Field label="Branch">
              <select {...register('branchId')} className={fieldClass}>
                <option value="">Select branch</option>
                {branches.data?.items
                  .filter((branch) => branch.isActive)
                  .map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Code">
              <input {...register('code')} className={fieldClass} />
            </Field>
            <Field label="Name">
              <input {...register('name')} className={fieldClass} />
            </Field>
            <button disabled={isSubmitting} className={buttonClass}>
              Create {kind}
            </button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
