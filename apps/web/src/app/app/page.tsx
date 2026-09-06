'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/auth-context';
import { OrganizationConsole } from './organization-console';

export default function ProtectedAppPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();

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
            <h1 className="mt-1 text-2xl font-semibold">Organization management</h1>
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
        <OrganizationConsole />
      </div>
    </main>
  );
}
