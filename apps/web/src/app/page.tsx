import { ApiHealth } from './api-health';
import Link from 'next/link';

const foundations = [
  'Modular monolith',
  'PostgreSQL ledger architecture',
  'Permission-based access',
  'Decimal-safe money',
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-400">
              Vendo
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Tiles + Sanitary operations, built on auditable foundations.
            </h1>
          </div>
          <ApiHealth />
        </div>
        <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300">
          The production workspace is being built in dependency order. Transaction modules remain
          unavailable until their database and authorization gates pass.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-slate-950"
        >
          Sign in to Vendo
        </Link>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {foundations.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm font-medium text-slate-200"
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
