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
} from '@vendo/ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';
import { useVendoApi } from '../../hooks/use-vendo-api';
import { baseUnitLabel, productSubtitle, productTypeTone } from './presentation';
import type {
  Master,
  Page,
  ProductDetail,
  ProductListItem,
  ProductType,
  References,
} from './types';

const ROOT = '/app/products',
  PAGE_SIZE = 20;
type MasterKind = 'categories' | 'brands' | 'manufacturers' | 'units';
const titleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(
      /(^|_)([a-z])/g,
      (_, space, letter: string) => `${space ? ' ' : ''}${letter.toUpperCase()}`,
    );
const optional = (value: string) => value.trim() || undefined;
const errorText = (value: unknown) =>
  value instanceof Error ? value.message : 'The request could not be completed.';

function Heading({
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
function TypeBadge({ type }: { type: ProductType }) {
  return <StatusBadge tone={productTypeTone(type)}>{titleCase(type)}</StatusBadge>;
}
function Nav() {
  const path = usePathname();
  const links = [
    [ROOT, 'Products'],
    [`${ROOT}/categories`, 'Categories'],
    [`${ROOT}/brands`, 'Brands'],
    [`${ROOT}/manufacturers`, 'Manufacturers'],
    [`${ROOT}/units`, 'Units'],
  ] as const;
  return (
    <nav
      aria-label="Catalog sections"
      className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
    >
      {links.map(([href, label]) => {
        const active =
          href === ROOT
            ? path === ROOT ||
              path === `${ROOT}/new` ||
              /^\/app\/products\/[^/]+(?:\/edit)?$/.test(path)
            : path === href;
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${active ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:bg-neutral-hover hover:text-text-primary'}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
function useRefs(enabled = true): References {
  const api = useVendoApi();
  const query = (kind: string) => api<Page<Master>>(`/${kind}?limit=100&isActive=true`);
  const units = useQuery({
    queryKey: ['catalog', 'units', 'active'],
    queryFn: () => query('units'),
    enabled,
  });
  const categories = useQuery({
    queryKey: ['catalog', 'categories', 'active'],
    queryFn: () => query('categories'),
    enabled,
  });
  const brands = useQuery({
    queryKey: ['catalog', 'brands', 'active'],
    queryFn: () => query('brands'),
    enabled,
  });
  const manufacturers = useQuery({
    queryKey: ['catalog', 'manufacturers', 'active'],
    queryFn: () => query('manufacturers'),
    enabled,
  });
  return {
    units: units.data?.items ?? [],
    categories: categories.data?.items ?? [],
    brands: brands.data?.items ?? [],
    manufacturers: manufacturers.data?.items ?? [],
  };
}

export function CatalogWorkspace() {
  const path = usePathname();
  const parts = path.slice(ROOT.length).split('/').filter(Boolean);
  let content: ReactNode;
  if (!parts.length) content = <ProductList />;
  else if (parts[0] === 'new') content = <ProductEditor />;
  else if (['categories', 'brands', 'manufacturers', 'units'].includes(parts[0]!))
    content = <Masters kind={parts[0] as MasterKind} />;
  else if (parts[1] === 'edit') content = <ProductEditor productId={parts[0]} />;
  else content = <ProductDetailPage productId={parts[0]!} />;
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <Nav />
      {content}
    </div>
  );
}

function ProductList() {
  const api = useVendoApi(),
    refs = useRefs(),
    { user } = useAuth();
  const [search, setSearch] = useState(''),
    [type, setType] = useState(''),
    [category, setCategory] = useState(''),
    [brand, setBrand] = useState(''),
    [manufacturer, setManufacturer] = useState(''),
    [active, setActive] = useState('true');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search.trim()) params.set('search', search.trim());
  if (type) params.set('type', type);
  if (category) params.set('categoryId', category);
  if (brand) params.set('brandId', brand);
  if (manufacturer) params.set('manufacturerId', manufacturer);
  if (active) params.set('isActive', active);
  const products = useQuery({
    queryKey: ['catalog', 'products', params.toString()],
    queryFn: () => api<Page<ProductListItem>>(`/products?${params}`),
  });
  const pages = Math.max(1, Math.ceil((products.data?.total ?? 0) / PAGE_SIZE));
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Catalog"
        title="Products"
        description="Manage reusable products, type-specific profiles, commercial units, independent prices and barcodes."
        actions={
          user?.permissions.includes('product.create') ? (
            <Link href={`${ROOT}/new`}>
              <Button>Add product</Button>
            </Link>
          ) : undefined
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Search and filters</CardTitle>
          <CardDescription>Search, filters and pagination are server-driven.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-6">
          <SearchInput
            className="lg:col-span-2"
            placeholder="Barcode, SKU, name, brand, model or size"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Filter
            label="Product type"
            value={type}
            set={(value) => {
              setType(value);
              setPage(1);
            }}
            options={['TILE', 'SANITARY', 'ACCESSORY', 'GENERAL'].map((x) => [x, titleCase(x)])}
          />
          <Filter
            label="Category"
            value={category}
            set={(value) => {
              setCategory(value);
              setPage(1);
            }}
            options={refs.categories.map((x) => [x.id, x.name])}
          />
          <Filter
            label="Brand"
            value={brand}
            set={(value) => {
              setBrand(value);
              setPage(1);
            }}
            options={refs.brands.map((x) => [x.id, x.name])}
          />
          <Filter
            label="Status"
            value={active}
            set={(value) => {
              setActive(value);
              setPage(1);
            }}
            options={[
              ['true', 'Active'],
              ['false', 'Inactive'],
            ]}
          />
          <Filter
            label="Manufacturer"
            value={manufacturer}
            set={(value) => {
              setManufacturer(value);
              setPage(1);
            }}
            options={refs.manufacturers.map((x) => [x.id, x.name])}
          />
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setType('');
              setCategory('');
              setBrand('');
              setManufacturer('');
              setActive('true');
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        </CardContent>
      </Card>
      {products.isLoading ? (
        <LoadingState title="Loading products…" />
      ) : products.isError ? (
        <ErrorState description={products.error.message} onRetry={() => void products.refetch()} />
      ) : !products.data?.items.length ? (
        <EmptyState title="No products found" description="Adjust filters or add a product." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Base unit</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`${ROOT}/${p.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="font-mono text-xs text-text-muted">{productSubtitle(p)}</div>
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={p.type} />
                  </TableCell>
                  <TableCell>
                    {p.category?.name ?? 'Uncategorized'}
                    <div className="text-xs text-text-muted">
                      {p.brand?.name ?? 'No brand'} · {p.manufacturer?.name ?? 'No manufacturer'}
                    </div>
                  </TableCell>
                  <TableCell>{p.model ?? '—'}</TableCell>
                  <TableCell className="font-mono">{baseUnitLabel(p.baseUnit)}</TableCell>
                  <TableCell>
                    {p.trackInventory
                      ? p.batchTracking
                        ? 'Batch tracked'
                        : 'Stock tracked'
                      : 'Not tracked'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={p.isActive ? 'success' : 'neutral'}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <Link href={`${ROOT}/${p.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            currentPage={page}
            pageCount={pages}
            totalItems={products.data.total}
            onPrevious={page > 1 ? () => setPage((x) => x - 1) : undefined}
            onNext={page < pages ? () => setPage((x) => x + 1) : undefined}
          />
        </>
      )}
    </div>
  );
}
function Filter({
  label,
  value,
  set,
  options,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  options: string[][];
}) {
  const plural =
    label === 'Category'
      ? 'categories'
      : label === 'Status'
        ? 'statuses'
        : `${label.toLowerCase()}s`;
  return (
    <Select aria-label={label} value={value} onChange={(e) => set(e.target.value)}>
      <option value="">All {plural}</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </Select>
  );
}

type FormState = {
  sku: string;
  name: string;
  type: ProductType;
  model: string;
  description: string;
  baseUnitId: string;
  categoryId: string;
  brandId: string;
  manufacturerId: string;
  standardCost: string;
  reorderLevel: string;
  trackInventory: boolean;
  batchTracking: boolean;
  width: string;
  height: string;
  dimensionUnit: 'MM' | 'CM' | 'INCH';
  thicknessMm: string;
  displaySize: string;
  series: string;
  finish: string;
  surface: string;
  color: string;
  grade: string;
  countryOfOrigin: string;
  sanitarySize: string;
  material: string;
  warrantyMonths: string;
  warrantyDetails: string;
};
const empty: FormState = {
  sku: '',
  name: '',
  type: 'GENERAL',
  model: '',
  description: '',
  baseUnitId: '',
  categoryId: '',
  brandId: '',
  manufacturerId: '',
  standardCost: '',
  reorderLevel: '',
  trackInventory: true,
  batchTracking: false,
  width: '',
  height: '',
  dimensionUnit: 'INCH',
  thicknessMm: '',
  displaySize: '',
  series: '',
  finish: '',
  surface: '',
  color: '',
  grade: '',
  countryOfOrigin: '',
  sanitarySize: '',
  material: '',
  warrantyMonths: '',
  warrantyDetails: '',
};
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</CardContent>
    </Card>
  );
}
function Field({
  label,
  description,
  required,
  onValue,
  ...props
}: {
  label: string;
  description?: string;
  required?: boolean;
  onValue: (value: string) => void;
} & Omit<ComponentProps<typeof Input>, 'onChange'>) {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <FormField htmlFor={id} label={label} description={description} required={required}>
      <Input id={id} {...props} onChange={(e) => onValue(e.target.value)} />
    </FormField>
  );
}
function SelectField({
  label,
  value,
  onValue,
  options,
  empty: emptyLabel,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onValue: (value: string) => void;
  options: Array<readonly [string, string]>;
  empty?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <FormField htmlFor={id} label={label} required={required}>
      <Select id={id} value={value} disabled={disabled} onChange={(e) => onValue(e.target.value)}>
        {emptyLabel !== undefined ? <option value="">{emptyLabel}</option> : null}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
    </FormField>
  );
}
const tilePayload = (f: FormState) => ({
  width: f.width,
  height: f.height,
  dimensionUnit: f.dimensionUnit,
  thicknessMm: optional(f.thicknessMm),
  displaySize: optional(f.displaySize),
  series: optional(f.series),
  finish: optional(f.finish),
  surface: optional(f.surface),
  color: optional(f.color),
  grade: optional(f.grade),
  countryOfOrigin: optional(f.countryOfOrigin),
});
const sanitaryPayload = (f: FormState) => ({
  size: optional(f.sanitarySize),
  color: optional(f.color),
  material: optional(f.material),
  finish: optional(f.finish),
  warrantyMonths: f.warrantyMonths ? Number(f.warrantyMonths) : undefined,
  warrantyDetails: optional(f.warrantyDetails),
});

function formFromProduct(p: ProductDetail): FormState {
  return {
    ...empty,
    sku: p.sku,
    name: p.name,
    type: p.type,
    model: p.model ?? '',
    description: p.description ?? '',
    baseUnitId: p.baseUnit.id,
    categoryId: p.category?.id ?? '',
    brandId: p.brand?.id ?? '',
    manufacturerId: p.manufacturer?.id ?? '',
    standardCost: p.standardCost ?? '',
    reorderLevel: p.reorderLevel ?? '',
    trackInventory: p.trackInventory,
    batchTracking: p.batchTracking,
    width: p.tileProfile?.widthMm ?? '',
    height: p.tileProfile?.heightMm ?? '',
    dimensionUnit: 'MM',
    thicknessMm: p.tileProfile?.thicknessMm ?? '',
    displaySize: p.tileProfile?.displaySize ?? '',
    series: p.tileProfile?.series ?? '',
    finish: p.tileProfile?.finish ?? p.sanitaryProfile?.finish ?? '',
    surface: p.tileProfile?.surface ?? '',
    color: p.tileProfile?.color ?? p.sanitaryProfile?.color ?? '',
    grade: p.tileProfile?.grade ?? '',
    countryOfOrigin: p.tileProfile?.countryOfOrigin ?? '',
    sanitarySize: p.sanitaryProfile?.size ?? '',
    material: p.sanitaryProfile?.material ?? '',
    warrantyMonths: p.sanitaryProfile?.warrantyMonths?.toString() ?? '',
    warrantyDetails: p.sanitaryProfile?.warrantyDetails ?? '',
  };
}

function ProductEditor({ productId }: { productId?: string }) {
  const api = useVendoApi();
  const detail = useQuery({
    queryKey: ['catalog', 'product', productId],
    queryFn: () => api<ProductDetail>(`/products/${productId}`),
    enabled: Boolean(productId),
  });
  if (productId && detail.isLoading) return <LoadingState />;
  if (productId && detail.isError) return <ErrorState description={detail.error.message} />;
  return (
    <ProductEditorForm
      key={productId ?? 'new-product'}
      productId={productId}
      initialForm={detail.data ? formFromProduct(detail.data) : empty}
    />
  );
}

function ProductEditorForm({
  productId,
  initialForm,
}: {
  productId?: string;
  initialForm: FormState;
}) {
  const api = useVendoApi(),
    router = useRouter(),
    client = useQueryClient(),
    refs = useRefs(),
    { user } = useAuth();
  const [form, setForm] = useState(initialForm),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [cancel, setCancel] = useState(false);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.sku.trim() || !form.baseUnitId) {
      setError('Product name, SKU and base inventory unit are required.');
      return;
    }
    setSaving(true);
    try {
      const core = {
        name: form.name.trim(),
        categoryId: form.categoryId || undefined,
        brandId: form.brandId || undefined,
        manufacturerId: form.manufacturerId || undefined,
        model: optional(form.model),
        description: optional(form.description),
        standardCost: optional(form.standardCost),
        reorderLevel: optional(form.reorderLevel),
        trackInventory: form.trackInventory,
        batchTracking: form.batchTracking,
      };
      let id = productId;
      if (!id) {
        const created = await api<ProductDetail>('/products', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sku: form.sku,
            type: form.type,
            baseUnitId: form.baseUnitId,
            ...core,
            tileProfile: form.type === 'TILE' ? tilePayload(form) : undefined,
            sanitaryProfile: form.type === 'SANITARY' ? sanitaryPayload(form) : undefined,
          }),
        });
        id = created.id;
      } else {
        await api(`/products/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(core),
        });
        if (form.type === 'TILE')
          await api(`/products/${id}/tile-profile`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(tilePayload(form)),
          });
        if (form.type === 'SANITARY')
          await api(`/products/${id}/sanitary-profile`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(sanitaryPayload(form)),
          });
      }
      setDirty(false);
      await client.invalidateQueries({ queryKey: ['catalog'] });
      if (!id) throw new Error('Saved product did not return an identifier.');
      router.push(`${ROOT}/${id}`);
    } catch (value) {
      setError(errorText(value));
    } finally {
      setSaving(false);
    }
  };
  const canCost = user?.permissions.includes('product.view_cost');
  return (
    <form onSubmit={save} className="space-y-5">
      <Heading
        eyebrow="Catalog · Products"
        title={productId ? 'Edit product' : 'Create product'}
        description="Reusable basics stay separate from tile and sanitary specifications."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                dirty ? setCancel(true) : router.push(productId ? `${ROOT}/${productId}` : ROOT)
              }
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {productId ? 'Save changes' : 'Save product'}
            </Button>
          </>
        }
      />
      {error ? (
        <Alert tone="danger" title="Could not save">
          {error}
        </Alert>
      ) : null}
      <Section title="1. Basic information">
        <Field label="Product name" required value={form.name} onValue={(v) => set('name', v)} />
        <Field
          label="SKU"
          required
          value={form.sku}
          disabled={Boolean(productId)}
          onValue={(v) => set('sku', v.toUpperCase())}
          description={productId ? 'Immutable after creation.' : 'Unique within this company.'}
        />
        <Field label="Model" value={form.model} onValue={(v) => set('model', v)} />
        <FormField
          className="md:col-span-2 xl:col-span-3"
          htmlFor="description"
          label="Description"
          optional
        >
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </FormField>
      </Section>
      <Section title="2. Classification">
        <SelectField
          label="Product type"
          value={form.type}
          disabled={Boolean(productId)}
          onValue={(v) => set('type', v as ProductType)}
          options={(['TILE', 'SANITARY', 'ACCESSORY', 'GENERAL'] as ProductType[]).map((x) => [
            x,
            titleCase(x),
          ])}
        />
        <SelectField
          label="Category"
          value={form.categoryId}
          onValue={(v) => set('categoryId', v)}
          empty="No category"
          options={refs.categories.map((x) => [x.id, x.name])}
        />
        <SelectField
          label="Brand"
          value={form.brandId}
          onValue={(v) => set('brandId', v)}
          empty="No brand"
          options={refs.brands.map((x) => [x.id, x.name])}
        />
        <SelectField
          label="Manufacturer"
          value={form.manufacturerId}
          onValue={(v) => set('manufacturerId', v)}
          empty="No manufacturer"
          options={refs.manufacturers.map((x) => [x.id, x.name])}
        />
        <SelectField
          label="Base inventory unit"
          required
          value={form.baseUnitId}
          disabled={Boolean(productId)}
          onValue={(v) => set('baseUnitId', v)}
          empty="Select base unit"
          options={refs.units.map((x) => [x.id, `${x.code} — ${x.name}`])}
        />
      </Section>
      {form.type === 'TILE' ? (
        <Section
          title="3. Tile specifications"
          description="Canonical dimensions produce informational nominal coverage only."
        >
          <Field
            label="Width"
            required
            value={form.width}
            inputMode="decimal"
            onValue={(v) => set('width', v)}
          />
          <Field
            label="Height"
            required
            value={form.height}
            inputMode="decimal"
            onValue={(v) => set('height', v)}
          />
          <SelectField
            label="Dimension unit"
            value={form.dimensionUnit}
            onValue={(v) => set('dimensionUnit', v as FormState['dimensionUnit'])}
            options={['MM', 'CM', 'INCH'].map((x) => [x, x])}
          />
          <Field
            label="Thickness (mm)"
            value={form.thicknessMm}
            inputMode="decimal"
            onValue={(v) => set('thicknessMm', v)}
          />
          <Field
            label="Display size"
            value={form.displaySize}
            onValue={(v) => set('displaySize', v)}
            description="Merchandising label only."
          />
          <Field label="Series" value={form.series} onValue={(v) => set('series', v)} />
          <Field label="Finish" value={form.finish} onValue={(v) => set('finish', v)} />
          <Field label="Surface" value={form.surface} onValue={(v) => set('surface', v)} />
          <Field label="Color" value={form.color} onValue={(v) => set('color', v)} />
          <Field label="Grade" value={form.grade} onValue={(v) => set('grade', v)} />
          <Field
            label="Country code"
            value={form.countryOfOrigin}
            onValue={(v) => set('countryOfOrigin', v.toUpperCase())}
            description="Two-letter ISO code."
          />
        </Section>
      ) : null}
      {form.type === 'SANITARY' ? (
        <Section title="3. Sanitary specifications">
          <Field label="Size" value={form.sanitarySize} onValue={(v) => set('sanitarySize', v)} />
          <Field label="Color" value={form.color} onValue={(v) => set('color', v)} />
          <Field label="Material" value={form.material} onValue={(v) => set('material', v)} />
          <Field label="Finish" value={form.finish} onValue={(v) => set('finish', v)} />
          <Field
            label="Warranty (months)"
            value={form.warrantyMonths}
            inputMode="numeric"
            onValue={(v) => set('warrantyMonths', v)}
          />
          <Field
            label="Warranty details"
            value={form.warrantyDetails}
            onValue={(v) => set('warrantyDetails', v)}
          />
        </Section>
      ) : null}
      <Section
        title="4. Inventory settings"
        description="This configures behavior only; stock operations remain in Inventory."
      >
        <div className="space-y-3">
          <Checkbox
            label="Track inventory"
            checked={form.trackInventory}
            onChange={(e) => set('trackInventory', e.target.checked)}
          />
          <Checkbox
            label="Require batch / lot / shade"
            checked={form.batchTracking}
            disabled={!form.trackInventory}
            onChange={(e) => set('batchTracking', e.target.checked)}
          />
        </div>
        <Field
          label="Reorder level"
          value={form.reorderLevel}
          inputMode="decimal"
          onValue={(v) => set('reorderLevel', v)}
        />
        {canCost ? (
          <Field
            label="Standard cost"
            value={form.standardCost}
            inputMode="decimal"
            onValue={(v) => set('standardCost', v)}
            description="Cost permission required."
          />
        ) : null}
      </Section>
      {!productId ? (
        <Alert tone="info" title="Next step">
          After saving, configure commercial conversions, independent prices and barcodes on Product
          Detail.
        </Alert>
      ) : null}
      <AlertDialog open={cancel} onOpenChange={setCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>Your changes have not been saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push(productId ? `${ROOT}/${productId}` : ROOT)}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function Details({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</dt>
          <dd className="mt-1 text-sm text-text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
function ProductDetailPage({ productId }: { productId: string }) {
  const api = useVendoApi(),
    client = useQueryClient(),
    refs = useRefs(),
    { user } = useAuth();
  const query = useQuery({
    queryKey: ['catalog', 'product', productId],
    queryFn: () => api<ProductDetail>(`/products/${productId}`),
  });
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null),
    [status, setStatus] = useState(false);
  const mutate = async (path: string, method: string, body?: unknown) => {
    setNotice(null);
    try {
      await api(path, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      await client.invalidateQueries({ queryKey: ['catalog'] });
      setNotice({ tone: 'success', text: 'Catalog changes saved.' });
    } catch (e) {
      setNotice({ tone: 'danger', text: errorText(e) });
    }
  };
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data)
    return <ErrorState description={query.error?.message ?? 'Product not found'} />;
  const p = query.data,
    canEdit = Boolean(user?.permissions.includes('product.edit')),
    canPrice = Boolean(user?.permissions.includes('pricing.manage'));
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Catalog · Product detail"
        title={p.name}
        description={`${productSubtitle(p)} · ${titleCase(p.type)}`}
        actions={
          <>
            <Link href={ROOT}>
              <Button variant="outline">Back</Button>
            </Link>
            {canEdit ? (
              <Link href={`${ROOT}/${p.id}/edit`}>
                <Button>Edit product</Button>
              </Link>
            ) : null}
          </>
        }
      />
      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex justify-between gap-4">
                <div>
                  <CardTitle>Basic information</CardTitle>
                  <CardDescription>Reusable product identity and classification.</CardDescription>
                </div>
                <StatusBadge tone={p.isActive ? 'success' : 'neutral'}>
                  {p.isActive ? 'Active' : 'Inactive'}
                </StatusBadge>
              </div>
            </CardHeader>
            <CardContent>
              <Details
                items={[
                  ['SKU', p.sku],
                  ['Type', titleCase(p.type)],
                  ['Category', p.category?.name ?? '—'],
                  ['Brand', p.brand?.name ?? '—'],
                  ['Manufacturer', p.manufacturer?.name ?? '—'],
                  ['Model', p.model ?? '—'],
                  ['Base stock unit', baseUnitLabel(p.baseUnit)],
                  ['Description', p.description ?? '—'],
                ]}
              />
            </CardContent>
          </Card>
          {p.tileProfile ? (
            <Card>
              <CardHeader>
                <CardTitle>Tile profile</CardTitle>
                <CardDescription>
                  Configured commercial conversions—not nominal geometry—control operations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Details
                  items={[
                    ['Canonical size', `${p.tileProfile.widthMm} × ${p.tileProfile.heightMm} mm`],
                    ['Display size', p.tileProfile.displaySize ?? '—'],
                    [
                      'Thickness',
                      p.tileProfile.thicknessMm ? `${p.tileProfile.thicknessMm} mm` : '—',
                    ],
                    ['Series', p.tileProfile.series ?? '—'],
                    ['Finish', p.tileProfile.finish ?? '—'],
                    ['Surface', p.tileProfile.surface ?? '—'],
                    ['Color', p.tileProfile.color ?? '—'],
                    ['Grade', p.tileProfile.grade ?? '—'],
                  ]}
                />
                <Alert tone="info" title="Calculated nominal coverage">
                  <span className="font-mono">
                    {p.tileProfile.nominalCoverage.squareFeetPerPiece} sq.ft
                  </span>{' '}
                  ·{' '}
                  <span className="font-mono">
                    {p.tileProfile.nominalCoverage.squareMetersPerPiece} sq.m
                  </span>{' '}
                  per piece. Informational only.
                </Alert>
              </CardContent>
            </Card>
          ) : null}
          {p.sanitaryProfile ? (
            <Card>
              <CardHeader>
                <CardTitle>Sanitary profile</CardTitle>
              </CardHeader>
              <CardContent>
                <Details
                  items={[
                    ['Size', p.sanitaryProfile.size ?? '—'],
                    ['Color', p.sanitaryProfile.color ?? '—'],
                    ['Material', p.sanitaryProfile.material ?? '—'],
                    ['Finish', p.sanitaryProfile.finish ?? '—'],
                    [
                      'Warranty',
                      p.sanitaryProfile.warrantyMonths === null
                        ? '—'
                        : `${p.sanitaryProfile.warrantyMonths} months`,
                    ],
                    ['Warranty details', p.sanitaryProfile.warrantyDetails ?? '—'],
                  ]}
                />
              </CardContent>
            </Card>
          ) : null}
          <Conversions product={p} units={refs.units} canEdit={canEdit} mutate={mutate} />
          <Prices product={p} canEdit={canPrice} mutate={mutate} />
          <Barcodes product={p} canEdit={canEdit} mutate={mutate} />
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Inventory settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Details
                items={[
                  ['Stock tracking', p.trackInventory ? 'Enabled' : 'Disabled'],
                  ['Batch / lot / shade', p.batchTracking ? 'Required' : 'Not required'],
                  ['Reorder level', p.reorderLevel ?? 'Not set'],
                ]}
              />
              <p className="mt-4 text-xs text-text-muted">
                Stock quantities and movements are intentionally not managed here.
              </p>
            </CardContent>
          </Card>
          {p.standardCost !== undefined ? (
            <Card>
              <CardHeader>
                <CardTitle>Standard cost</CardTitle>
                <CardDescription>Visible only with cost permission.</CardDescription>
              </CardHeader>
              <CardContent className="font-mono text-xl font-semibold">
                {p.standardCost ?? 'Not set'}
              </CardContent>
            </Card>
          ) : null}
          {canEdit ? (
            <Card>
              <CardHeader>
                <CardTitle>Lifecycle</CardTitle>
                <CardDescription>Deactivation preserves historical references.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant={p.isActive ? 'danger' : 'primary'} onClick={() => setStatus(true)}>
                  {p.isActive ? 'Deactivate product' : 'Activate product'}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
      <AlertDialog open={status} onOpenChange={setStatus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {p.isActive ? 'Deactivate' : 'Activate'} {p.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>Historical records remain readable.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                void mutate(`/products/${p.id}/status`, 'PATCH', { isActive: !p.isActive })
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type Mutate = (path: string, method: string, body?: unknown) => Promise<void>;
function Conversions({
  product,
  units,
  canEdit,
  mutate,
}: {
  product: ProductDetail;
  units: Master[];
  canEdit: boolean;
  mutate: Mutate;
}) {
  const [unit, setUnit] = useState(''),
    [factor, setFactor] = useState('');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Units & conversions</CardTitle>
        <CardDescription>
          One base stock quantity: {baseUnitLabel(product.baseUnit)}. All commercial units map
          directly to it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert tone="info">
          <strong>Base unit · {baseUnitLabel(product.baseUnit)}</strong>
          <br />
          BOX, PCS, sq.ft and sq.m are representations, never separate stock counters.
        </Alert>
        {product.conversions.map((x) => (
          <div
            key={x.id}
            className="flex justify-between rounded-md border border-border px-3 py-2 text-sm"
          >
            <span>
              1 <strong>{x.fromUnit.code}</strong>
            </span>
            <span className="font-mono">
              = {x.factorToBase} {baseUnitLabel(product.baseUnit)}
            </span>
          </div>
        ))}
        {!product.conversions.length ? (
          <EmptyState className="min-h-28" title="No commercial conversions" />
        ) : null}
        {canEdit ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Select
              aria-label="Conversion unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="">Select unit</option>
              {units
                .filter((x) => x.id !== product.baseUnit.id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.code} — {x.name}
                  </option>
                ))}
            </Select>
            <Input
              aria-label="Factor to base"
              inputMode="decimal"
              placeholder={`Factor to ${baseUnitLabel(product.baseUnit)}`}
              value={factor}
              onChange={(e) => setFactor(e.target.value)}
            />
            <Button
              disabled={!unit || !factor}
              onClick={() =>
                void mutate(`/products/${product.id}/conversions`, 'PUT', {
                  unitId: unit,
                  factorToBase: factor,
                })
              }
            >
              Save
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
function Prices({
  product,
  canEdit,
  mutate,
}: {
  product: ProductDetail;
  canEdit: boolean;
  mutate: Mutate;
}) {
  const [unit, setUnit] = useState(''),
    [type, setType] = useState('RETAIL'),
    [amount, setAmount] = useState('');
  const units = [product.baseUnit, ...product.conversions.map((x) => x.fromUnit)];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Independent unit pricing</CardTitle>
        <CardDescription>
          BOX, PCS and area prices are stored independently; none is inferred.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {product.prices.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead numeric>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.prices.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="font-mono">{x.unit.code}</TableCell>
                  <TableCell>{titleCase(x.type)}</TableCell>
                  <TableCell numeric>{x.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState className="min-h-28" title="No prices configured" />
        )}
        {canEdit ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Select aria-label="Price unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="">Select unit</option>
              {units.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.code}
                </option>
              ))}
            </Select>
            <Select aria-label="Price type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="MINIMUM">Minimum</option>
            </Select>
            <Input
              aria-label="Price amount"
              inputMode="decimal"
              placeholder="0.0000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              disabled={!unit || !amount}
              onClick={() =>
                void mutate(`/products/${product.id}/prices`, 'PUT', { unitId: unit, type, amount })
              }
            >
              Save
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
function Barcodes({
  product,
  canEdit,
  mutate,
}: {
  product: ProductDetail;
  canEdit: boolean;
  mutate: Mutate;
}) {
  const [barcode, setBarcode] = useState(''),
    [unit, setUnit] = useState(''),
    [primary, setPrimary] = useState(false);
  const units = [product.baseUnit, ...product.conversions.map((x) => x.fromUnit)];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Barcodes</CardTitle>
        <CardDescription>
          Use a generic product barcode or associate it with a configured unit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {product.barcodes.map((x) => (
          <div
            key={x.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <div>
              <span className="font-mono text-sm">{x.barcode}</span>
              <span className="ml-2 text-xs text-text-muted">{x.unit?.code ?? 'Generic'}</span>
            </div>
            <div className="flex items-center gap-2">
              {x.isPrimary ? <StatusBadge tone="success">Primary</StatusBadge> : null}
              {canEdit ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void mutate(`/products/${product.id}/barcodes/${x.id}`, 'DELETE')}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {!product.barcodes.length ? (
          <EmptyState className="min-h-28" title="No barcodes configured" />
        ) : null}
        {canEdit ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <Input
              aria-label="Barcode"
              placeholder="Scan or enter barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            <Select
              aria-label="Barcode unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="">Generic product barcode</option>
              {units.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.code}
                </option>
              ))}
            </Select>
            <Checkbox
              label="Primary"
              checked={primary}
              onChange={(e) => setPrimary(e.target.checked)}
            />
            <Button
              disabled={barcode.trim().length < 3}
              onClick={() =>
                void mutate(`/products/${product.id}/barcodes`, 'POST', {
                  barcode: barcode.trim(),
                  unitId: unit || undefined,
                  isPrimary: primary,
                })
              }
            >
              Add
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Masters({ kind }: { kind: MasterKind }) {
  const api = useVendoApi(),
    client = useQueryClient(),
    { user } = useAuth();
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [editor, setEditor] = useState<Master | null | undefined>(undefined),
    [status, setStatus] = useState<Master | null>(null),
    [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const singular =
    kind === 'categories'
      ? 'category'
      : kind === 'manufacturers'
        ? 'manufacturer'
        : kind === 'brands'
          ? 'brand'
          : 'unit';
  const canEdit = Boolean(
    user?.permissions.includes(kind === 'units' ? 'unit.manage' : `${singular}.edit`),
  );
  const canCreate = Boolean(
    user?.permissions.includes(kind === 'units' ? 'unit.manage' : `${singular}.create`),
  );
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search.trim()) params.set('search', search.trim());
  const rows = useQuery({
    queryKey: ['catalog', kind, params.toString()],
    queryFn: () => api<Page<Master>>(`/${kind}?${params}`),
  });
  const categoryRefs = useQuery({
    queryKey: ['catalog', 'categories', 'all'],
    queryFn: () => api<Page<Master>>('/categories?limit=100'),
    enabled: kind === 'categories',
  });
  const pages = Math.max(1, Math.ceil((rows.data?.total ?? 0) / PAGE_SIZE));
  const toggle = async () => {
    if (!status) return;
    try {
      await api(`/${kind}/${status.id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: !status.isActive }),
      });
      await client.invalidateQueries({ queryKey: ['catalog'] });
      setNotice({
        tone: 'success',
        text: `${titleCase(singular)} ${status.isActive ? 'deactivated' : 'activated'}.`,
      });
    } catch (e) {
      setNotice({ tone: 'danger', text: errorText(e) });
    } finally {
      setStatus(null);
    }
  };
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Catalog · Master data"
        title={titleCase(kind)}
        description={
          kind === 'categories'
            ? 'Maintain hierarchy while the server enforces cycles and active-parent rules.'
            : `Maintain normalized ${kind} for reusable products.`
        }
        actions={
          canCreate ? <Button onClick={() => setEditor(null)}>Add {singular}</Button> : undefined
        }
      />
      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Find {kind}</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchInput
            placeholder={`Search ${kind}`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>
      {rows.isLoading ? (
        <LoadingState />
      ) : rows.isError ? (
        <ErrorState description={rows.error.message} />
      ) : !rows.data?.items.length ? (
        <EmptyState title={`No ${kind} found`} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {kind === 'categories' ? <TableHead>Parent</TableHead> : null}
                <TableHead>{kind === 'units' ? 'Code' : 'Slug'}</TableHead>
                {kind === 'units' ? <TableHead>Decimal scale</TableHead> : null}
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold">
                    {kind === 'categories' && item.parent ? '↳ ' : ''}
                    {item.name}
                  </TableCell>
                  {kind === 'categories' ? (
                    <TableCell>{item.parent?.name ?? 'Top level'}</TableCell>
                  ) : null}
                  <TableCell className="font-mono text-xs">{item.code ?? item.slug}</TableCell>
                  {kind === 'units' ? <TableCell>{item.decimalScale}</TableCell> : null}
                  <TableCell>
                    <StatusBadge tone={item.isActive ? 'success' : 'neutral'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {canEdit ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setEditor(item)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatus(item)}>
                            {item.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            currentPage={page}
            pageCount={pages}
            totalItems={rows.data.total}
            onPrevious={page > 1 ? () => setPage((x) => x - 1) : undefined}
            onNext={page < pages ? () => setPage((x) => x + 1) : undefined}
          />
        </>
      )}
      <MasterEditor
        key={`${kind}:${editor === undefined ? 'closed' : (editor?.id ?? 'new')}`}
        kind={kind}
        value={editor}
        categories={categoryRefs.data?.items ?? []}
        open={editor !== undefined}
        onClose={() => setEditor(undefined)}
        onSaved={async (message) => {
          setEditor(undefined);
          setNotice({ tone: 'success', text: message });
          await client.invalidateQueries({ queryKey: ['catalog'] });
        }}
      />
      <AlertDialog
        open={Boolean(status)}
        onOpenChange={(open) => {
          if (!open) setStatus(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {status?.isActive ? 'Deactivate' : 'Activate'} {status?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Existing product relationships remain readable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void toggle()}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MasterEditor({
  kind,
  value,
  categories,
  open,
  onClose,
  onSaved,
}: {
  kind: MasterKind;
  value: Master | null | undefined;
  categories: Master[];
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const api = useVendoApi();
  const [name, setName] = useState(() => value?.name ?? ''),
    [slug, setSlug] = useState(() => value?.slug ?? ''),
    [code, setCode] = useState(() => value?.code ?? ''),
    [scale, setScale] = useState(() => String(value?.decimalScale ?? 6)),
    [parent, setParent] = useState(() => value?.parentId ?? value?.parent?.id ?? ''),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);
  const singular =
    kind === 'categories'
      ? 'category'
      : kind === 'manufacturers'
        ? 'manufacturer'
        : kind === 'brands'
          ? 'brand'
          : 'unit';
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body =
        kind === 'units'
          ? value
            ? { name, decimalScale: Number(scale) }
            : { code, name, decimalScale: Number(scale) }
          : kind === 'categories'
            ? { name, slug, parentId: parent || undefined }
            : { name, slug };
      await api(value ? `/${kind}/${value.id}` : `/${kind}`, {
        method: value ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      await onSaved(`${titleCase(singular)} ${value ? 'updated' : 'created'}.`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {value ? 'Edit' : 'Add'} {singular}
          </DialogTitle>
          <DialogDescription>
            Server validation remains authoritative for uniqueness and hierarchy.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field label="Name" required value={name} onValue={setName} />
          {kind === 'units' ? (
            <>
              <Field
                label="Code"
                required
                value={code}
                disabled={Boolean(value)}
                onValue={(v) => setCode(v.toUpperCase())}
              />
              <Field
                label="Decimal scale"
                required
                value={scale}
                inputMode="numeric"
                onValue={setScale}
              />
            </>
          ) : (
            <Field label="Slug" required value={slug} onValue={setSlug} />
          )}{' '}
          {kind === 'categories' ? (
            <SelectField
              label="Parent category"
              value={parent}
              onValue={setParent}
              empty="Top-level category"
              options={categories
                .filter((x) => x.id !== value?.id && x.isActive)
                .map((x) => [x.id, x.name])}
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={!name.trim() || (kind === 'units' ? !code.trim() : !slug.trim())}
            >
              Save {singular}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
