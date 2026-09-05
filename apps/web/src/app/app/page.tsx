'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/auth-context';

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
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <section className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-400">
              Secure workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Welcome, {user.firstName}</h1>
            <p className="mt-2 text-slate-400">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout().finally(() => router.replace('/login'))}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:border-slate-500"
          >
            Sign out
          </button>
        </div>
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-300">
          Authentication is active. Business modules remain unavailable until their approved phase
          gates pass.
        </div>
      </section>
    </main>
  );
}
