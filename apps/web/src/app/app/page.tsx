'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/auth-context';
import { OrganizationConsole } from './organization-console';
import { CatalogConsole } from './catalog-console';
import { InventoryConsole } from './inventory-console';
import { PartiesConsole } from './parties-console';

export default function ProtectedAppPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const [area, setArea] = useState<'organization' | 'catalog' | 'inventory' | 'parties'>('parties');

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [router, status]);

  if (status !== 'authenticated' || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Restoring secure session…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-400">
              Vendo
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Business management</h1>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout().finally(() => router.replace('/login'))}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:border-slate-500"
          >
            Sign out
          </button>
        </header>
        <nav className="mb-5 flex gap-2" aria-label="Application sections">
          {(['parties', 'inventory', 'catalog', 'organization'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setArea(item)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${area === item ? 'bg-amber-400 text-slate-950' : 'border border-slate-700 text-slate-300'}`}
            >
              {item}
            </button>
          ))}
        </nav>
        {area === 'parties' ? (
          <PartiesConsole />
        ) : area === 'inventory' ? (
          <InventoryConsole />
        ) : area === 'catalog' ? (
          <CatalogConsole />
        ) : (
          <OrganizationConsole />
        )}
      </div>
    </main>
  );
}
