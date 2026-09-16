'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { VendoIcon } from '@vendo/ui';
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
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12 text-text-primary">
      <form
        onSubmit={handleSubmit(submit)}
        className="w-full max-w-md rounded-xl border border-border-strong bg-surface p-8 shadow-elevated"
      >
        <div className="flex items-center gap-2 text-primary">
          <VendoIcon name="security" size={24} />
          <p className="text-sm font-semibold uppercase tracking-[0.24em]">Vendo</p>
        </div>
        <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Use your company code and assigned account.
        </p>

        <label className="mt-8 block text-sm font-medium" htmlFor="companyCode">
          Company code
        </label>
        <input
          id="companyCode"
          autoComplete="organization"
          {...register('companyCode')}
          aria-invalid={Boolean(errors.companyCode)}
          className="mt-2 w-full rounded-md border border-border-strong bg-surface px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {errors.companyCode ? (
          <p className="mt-1 text-sm text-danger">{errors.companyCode.message}</p>
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
          className="mt-2 w-full rounded-md border border-border-strong bg-surface px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {errors.email ? <p className="mt-1 text-sm text-danger">{errors.email.message}</p> : null}

        <label className="mt-5 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          aria-invalid={Boolean(errors.password)}
          className="mt-2 w-full rounded-md border border-border-strong bg-surface px-3 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {errors.password ? (
          <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting || status === 'loading'}
          className="mt-7 w-full rounded-md border border-primary bg-primary px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
