'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../../auth/auth-context';

const loginSchema = z.object({
  companyCode: z.string().trim().min(1, 'Company code is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { companyCode: '', email: '', password: '' },
  });

  useEffect(() => {
    if (status === 'authenticated') router.replace('/app');
  }, [router, status]);

  async function submit(values: LoginForm) {
    setError('');
    try {
      await login(values.companyCode, values.email, values.password);
      router.replace('/app');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed.');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <form
        onSubmit={handleSubmit(submit)}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-400">Vendo</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Use your company code and assigned account.</p>

        <label className="mt-8 block text-sm font-medium" htmlFor="companyCode">
          Company code
        </label>
        <input
          id="companyCode"
          autoComplete="organization"
          {...register('companyCode')}
          aria-invalid={Boolean(errors.companyCode)}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-400"
        />
        {errors.companyCode ? (
          <p className="mt-1 text-sm text-red-300">{errors.companyCode.message}</p>
        ) : null}

        <label className="mt-5 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-400"
        />
        {errors.email ? <p className="mt-1 text-sm text-red-300">{errors.email.message}</p> : null}

        <label className="mt-5 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          aria-invalid={Boolean(errors.password)}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-400"
        />
        {errors.password ? (
          <p className="mt-1 text-sm text-red-300">{errors.password.message}</p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting || status === 'loading'}
          className="mt-7 w-full rounded-lg bg-amber-400 px-4 py-2.5 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
