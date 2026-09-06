'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../../auth/auth-context';

type Master = {
  id: string;
  code?: string;
  name: string;
  slug?: string;
  decimalScale?: number;
  isActive: boolean;
};
type Page<T> = { items: T[]; total: number };
type Product = {
  id: string;
  sku: string;
  name: string;
  type: string;
  model: string | null;
  isActive: boolean;
  baseUnit: Master;
  category?: Master;
  brand?: Master;
  manufacturer?: Master;
  tileProfile?: { displaySize: string | null };
};
type ProductDetail = Product & {
  description: string | null;
  sanitaryProfile: Record<string, unknown> | null;
  conversions: Array<{ id: string; factorToBase: string; fromUnit: Master }>;
  barcodes: Array<{ id: string; barcode: string; isPrimary: boolean; unit: Master | null }>;
  prices: Array<{ id: string; type: string; amount: string; unit: Master }>;
};
type Tab = 'products' | 'categories' | 'brands' | 'manufacturers' | 'units';
const field =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-400';
const button =
  'rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50';
const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['TILE', 'SANITARY', 'ACCESSORY', 'GENERAL']),
  baseUnitId: z.string().uuid(),
  categoryId: z.string(),
  brandId: z.string(),
  manufacturerId: z.string(),
  model: z.string(),
  width: z.string(),
  height: z.string(),
  displaySize: z.string(),
  sanitarySize: z.string(),
  material: z.string(),
});
type ProductForm = z.infer<typeof productSchema>;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function CatalogConsole() {
  const { user, authenticatedFetch } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('products');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const can = (key: string) => Boolean(user?.permissions.includes(key));
  const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const response = await authenticatedFetch(path, init);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      throw new Error(
        Array.isArray(body.message)
          ? body.message.join(', ')
          : (body.message ?? `Request failed (${response.status})`),
      );
    }
    return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
  };
  const run = async (work: () => Promise<unknown>, keys: string[]) => {
    setError('');
    setMessage('');
    try {
      await work();
      await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      setMessage('Saved successfully.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed');
    }
  };
  const tabs: Array<[Tab, string]> = [
    ['products', 'Products'],
    ['categories', 'Categories'],
    ['brands', 'Brands'],
    ['manufacturers', 'Manufacturers'],
    ['units', 'Units'],
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-3 py-2 text-sm ${tab === key ? 'bg-slate-100 text-slate-950' : 'border border-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {(message || error) && (
        <p role="status" className={error ? 'text-red-300' : 'text-emerald-300'}>
          {error || message}
        </p>
      )}
      {tab === 'products' ? (
        <ProductsPanel api={api} run={run} can={can} />
      ) : (
        <MasterPanel kind={tab} api={api} run={run} can={can} />
      )}
    </div>
  );
}

function MasterPanel({
  kind,
  api,
  run,
  can,
}: {
  kind: Exclude<Tab, 'products'>;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  run: (work: () => Promise<unknown>, keys: string[]) => Promise<void>;
  can: (key: string) => boolean;
}) {
  const singular =
    kind === 'categories'
      ? 'category'
      : kind === 'manufacturers'
        ? 'manufacturer'
        : kind === 'brands'
          ? 'brand'
          : 'unit';
  const list = useQuery({
    queryKey: [kind],
    queryFn: () => api<Page<Master>>(`/${kind}?limit=100`),
    enabled: can(`${singular}.view`),
  });
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [slug, setSlug] = useState('');
  const createPermission = kind === 'units' ? 'unit.manage' : `${singular}.create`;
  const editPermission = kind === 'units' ? 'unit.manage' : `${singular}.edit`;
  const create = () =>
    run(
      () =>
        api(`/${kind}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            kind === 'units'
              ? { code, name, decimalScale: code === 'PCS' || code === 'BOX' ? 0 : 6 }
              : { name, slug },
          ),
        }),
      [kind],
    );
  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Card title={`Create ${singular}`}>
        {can(createPermission) ? (
          <div className="space-y-3">
            <input
              className={field}
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {kind === 'units' ? (
              <input
                className={field}
                placeholder="Code (PCS, BOX, SQFT)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            ) : (
              <input
                className={field}
                placeholder="Slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            )}
            <button
              className={button}
              type="button"
              onClick={() => void create()}
              disabled={!name || (kind === 'units' ? !code : !slug)}
            >
              Create
            </button>
          </div>
        ) : (
          <p className="text-slate-400">Permission required.</p>
        )}
      </Card>
      <Card title={`${kind[0].toUpperCase()}${kind.slice(1)}`}>
        <div className="space-y-2">
          {list.data?.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 p-3"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-slate-400">{item.code ?? item.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={item.isActive ? 'text-emerald-300' : 'text-slate-500'}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </span>
                {can(editPermission) && (
                  <button
                    type="button"
                    className="text-sm text-amber-300"
                    onClick={() =>
                      void run(
                        () =>
                          api(`/${kind}/${item.id}/status`, {
                            method: 'PATCH',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ isActive: !item.isActive }),
                          }),
                        [kind],
                      )
                    }
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ProductsPanel({
  api,
  run,
  can,
}: {
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  run: (work: () => Promise<unknown>, keys: string[]) => Promise<void>;
  can: (key: string) => boolean;
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const products = useQuery({
    queryKey: ['products', search],
    queryFn: () => api<Page<Product>>(`/products?limit=50&search=${encodeURIComponent(search)}`),
    enabled: can('product.view'),
  });
  const units = useQuery({
    queryKey: ['units'],
    queryFn: () => api<Page<Master>>('/units?limit=100&isActive=true'),
    enabled: can('unit.view'),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Page<Master>>('/categories?limit=100&isActive=true'),
    enabled: can('category.view'),
  });
  const brands = useQuery({
    queryKey: ['brands'],
    queryFn: () => api<Page<Master>>('/brands?limit=100&isActive=true'),
    enabled: can('brand.view'),
  });
  const manufacturers = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => api<Page<Master>>('/manufacturers?limit=100&isActive=true'),
    enabled: can('manufacturer.view'),
  });
  const detail = useQuery({
    queryKey: ['product-detail', selectedId],
    queryFn: () => api<ProductDetail>(`/products/${selectedId}`),
    enabled: Boolean(selectedId),
  });
  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      name: '',
      type: 'GENERAL',
      baseUnitId: '',
      categoryId: '',
      brandId: '',
      manufacturerId: '',
      model: '',
      width: '24',
      height: '24',
      displaySize: '24 × 24 inch',
      sanitarySize: '',
      material: '',
    },
  });
  const type = useWatch({ control: form.control, name: 'type' });
  const submit = form.handleSubmit((value) =>
    run(async () => {
      const body: Record<string, unknown> = {
        sku: value.sku,
        name: value.name,
        type: value.type,
        baseUnitId: value.baseUnitId,
        categoryId: value.categoryId || undefined,
        brandId: value.brandId || undefined,
        manufacturerId: value.manufacturerId || undefined,
        model: value.model || undefined,
      };
      if (value.type === 'TILE')
        body.tileProfile = {
          width: value.width,
          height: value.height,
          dimensionUnit: 'INCH',
          displaySize: value.displaySize,
        };
      if (value.type === 'SANITARY')
        body.sanitaryProfile = {
          size: value.sanitarySize || undefined,
          material: value.material || undefined,
        };
      const created = await api<ProductDetail>('/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      setSelectedId(created.id);
      form.reset();
    }, ['products', 'product-detail']),
  );
  return (
    <div className="space-y-5">
      {can('product.create') && (
        <Card title="Create product">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            <input className={field} placeholder="SKU" {...form.register('sku')} />
            <input className={field} placeholder="Product name" {...form.register('name')} />
            <select className={field} {...form.register('type')}>
              <option value="GENERAL">General</option>
              <option value="ACCESSORY">Accessory</option>
              <option value="SANITARY">Sanitary</option>
              <option value="TILE">Tile</option>
            </select>
            <select className={field} {...form.register('baseUnitId')}>
              <option value="">Base unit</option>
              {units.data?.items.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.code} — {x.name}
                </option>
              ))}
            </select>
            <select className={field} {...form.register('categoryId')}>
              <option value="">No category</option>
              {categories.data?.items.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <select className={field} {...form.register('brandId')}>
              <option value="">No brand</option>
              {brands.data?.items.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <select className={field} {...form.register('manufacturerId')}>
              <option value="">No manufacturer</option>
              {manufacturers.data?.items.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <input className={field} placeholder="Model" {...form.register('model')} />
            {type === 'TILE' && (
              <>
                <input className={field} placeholder="Width inches" {...form.register('width')} />
                <input className={field} placeholder="Height inches" {...form.register('height')} />
                <input
                  className={field}
                  placeholder="Display size"
                  {...form.register('displaySize')}
                />
              </>
            )}
            {type === 'SANITARY' && (
              <>
                <input
                  className={field}
                  placeholder="Sanitary size"
                  {...form.register('sanitarySize')}
                />
                <input className={field} placeholder="Material" {...form.register('material')} />
              </>
            )}
            <button className={button} type="submit">
              Create product
            </button>
          </form>
        </Card>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card title="Product catalog">
          <input
            className={`${field} mb-3`}
            placeholder="Search barcode, SKU, name, brand, model, size"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-2">
            {products.data?.items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className="block w-full rounded-lg border border-slate-800 p-3 text-left hover:border-amber-400"
              >
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {item.sku} · {item.type}
                  {item.tileProfile?.displaySize ? ` · ${item.tileProfile.displaySize}` : ''}
                </span>
              </button>
            ))}
          </div>
        </Card>
        <ProductManager
          detail={detail.data}
          units={units.data?.items ?? []}
          api={api}
          run={run}
          can={can}
        />
      </div>
    </div>
  );
}

function ProductManager({
  detail,
  units,
  api,
  run,
  can,
}: {
  detail?: ProductDetail;
  units: Master[];
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  run: (work: () => Promise<unknown>, keys: string[]) => Promise<void>;
  can: (key: string) => boolean;
}) {
  const [unitId, setUnitId] = useState('');
  const [factor, setFactor] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState('RETAIL');
  const [updatedName, setUpdatedName] = useState('');
  if (!detail)
    return (
      <Card title="Product details">
        <p className="text-slate-400">Select a product to view and configure it.</p>
      </Card>
    );
  const configured = [detail.baseUnit, ...detail.conversions.map((x) => x.fromUnit)];
  const send = (path: string, method: string, body: unknown) =>
    run(
      () =>
        api(path, {
          method,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
      ['products', 'product-detail'],
    );
  return (
    <Card title={detail.name}>
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          {detail.sku} · {detail.type} · Base stock unit: <strong>{detail.baseUnit.code}</strong>
        </p>
        <p className="text-xs text-slate-500">
          Inventory quantities are not shown in Phase 5. All conversions resolve to one base
          quantity.
        </p>
        {can('product.edit') && (
          <div className="flex gap-2">
            <input
              className={field}
              placeholder="Updated product name"
              value={updatedName}
              onChange={(event) => setUpdatedName(event.target.value)}
            />
            <button
              type="button"
              className={button}
              disabled={!updatedName.trim()}
              onClick={() =>
                void send(`/products/${detail.id}`, 'PATCH', { name: updatedName.trim() })
              }
            >
              Update
            </button>
          </div>
        )}
        {can('product.edit') && (
          <div className="grid gap-2 sm:grid-cols-3">
            <select className={field} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Conversion unit</option>
              {units
                .filter((x) => x.id !== detail.baseUnit.id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.code}
                  </option>
                ))}
            </select>
            <input
              className={field}
              placeholder="Factor to base"
              value={factor}
              onChange={(e) => setFactor(e.target.value)}
            />
            <button
              type="button"
              className={button}
              onClick={() =>
                void send(`/products/${detail.id}/conversions`, 'PUT', {
                  unitId,
                  factorToBase: factor,
                })
              }
            >
              Save conversion
            </button>
          </div>
        )}
        <div>
          {detail.conversions.map((x) => (
            <p key={x.id} className="text-sm">
              1 {x.fromUnit.code} = {x.factorToBase} {detail.baseUnit.code}
            </p>
          ))}
        </div>
        {can('product.edit') && (
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className={field}
              placeholder="Barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            <select className={field} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Product barcode</option>
              {configured.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.code}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={button}
              onClick={() =>
                void send(`/products/${detail.id}/barcodes`, 'POST', {
                  barcode,
                  unitId: unitId || undefined,
                  isPrimary: detail.barcodes.length === 0,
                })
              }
            >
              Add barcode
            </button>
          </div>
        )}
        <div>
          {detail.barcodes.map((x) => (
            <p key={x.id} className="text-sm">
              {x.barcode} {x.unit ? `(${x.unit.code})` : ''} {x.isPrimary ? '— Primary' : ''}
            </p>
          ))}
        </div>
        {can('pricing.manage') && (
          <div className="grid gap-2 sm:grid-cols-4">
            <select className={field} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Price unit</option>
              {configured.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.code}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={priceType}
              onChange={(e) => setPriceType(e.target.value)}
            >
              <option>RETAIL</option>
              <option>WHOLESALE</option>
              <option>MINIMUM</option>
            </select>
            <input
              className={field}
              placeholder="Amount"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <button
              type="button"
              className={button}
              onClick={() =>
                void send(`/products/${detail.id}/prices`, 'PUT', {
                  unitId,
                  type: priceType,
                  amount: price,
                })
              }
            >
              Save price
            </button>
          </div>
        )}
        <div>
          {detail.prices.map((x) => (
            <p key={x.id} className="text-sm">
              {x.unit.code} {x.type}: {x.amount}
            </p>
          ))}
        </div>
        {can('product.edit') && (
          <button
            type="button"
            className="text-sm text-amber-300"
            onClick={() =>
              void send(`/products/${detail.id}/status`, 'PATCH', { isActive: !detail.isActive })
            }
          >
            {detail.isActive ? 'Deactivate product' : 'Activate product'}
          </button>
        )}
      </div>
    </Card>
  );
}
