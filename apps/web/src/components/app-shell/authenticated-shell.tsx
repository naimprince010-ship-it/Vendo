'use client';

import {
  Button,
  Select,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@vendo/ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/auth-context';
import { BranchProvider, useBranchContext } from '../../contexts/branch-context';
import { hasAnyPermission } from '../../lib/permissions';
import { appRouteGroups, routeForPath, type AppRoute } from '../../lib/routes';
import { NavigationIcon } from './navigation-icon';

function NavigationLink({ mobile, route }: { mobile?: boolean; route: AppRoute }) {
  const pathname = usePathname();
  const active = pathname === route.href || pathname.startsWith(`${route.href}/`);
  const link = (
    <Link
      href={route.href}
      aria-label={route.label}
      aria-current={active ? 'page' : undefined}
      className={`group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        active
          ? 'bg-primary-soft text-primary'
          : 'text-text-secondary hover:bg-neutral-hover hover:text-text-primary'
      } ${mobile ? '' : 'justify-center min-[1400px]:justify-start'}`}
    >
      <NavigationIcon name={route.icon} className="shrink-0" />
      <span className={mobile ? '' : 'hidden min-[1400px]:inline'}>{route.label}</span>
    </Link>
  );
  if (mobile) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="min-[1400px]:hidden">
        {route.label}
      </TooltipContent>
    </Tooltip>
  );
}

function Sidebar({ mobile }: { mobile?: boolean }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <nav
      aria-label="Primary navigation"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4"
    >
      {appRouteGroups.map((group) => {
        const routes = group.routes.filter((route) =>
          hasAnyPermission(user.permissions, route.permissions),
        );
        if (routes.length === 0) return null;
        return (
          <div key={group.label} className="mb-5 last:mb-0">
            <p
              className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted ${mobile ? '' : 'hidden min-[1400px]:block'}`}
            >
              {group.label}
            </p>
            <div className="grid gap-1">
              {routes.map((route) => (
                <NavigationLink key={route.href} route={route} mobile={mobile} />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { activeBranch, activeBranchId, branches, isLoading, setActiveBranchId } =
    useBranchContext();
  const [mobileOpenedPath, setMobileOpenedPath] = useState<string | null>(null);
  const mobileOpen = mobileOpenedPath === pathname;
  const route = routeForPath(pathname);
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'V';

  return (
    <TooltipProvider delayDuration={350}>
      <div className="min-h-screen overflow-x-hidden bg-canvas text-text-primary">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col border-r border-border bg-surface md:flex min-[1400px]:w-64">
          <div className="flex h-16 items-center border-b border-divider px-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
              V
            </div>
            <div className="ml-3 hidden min-[1400px]:block">
              <p className="text-sm font-bold tracking-wide text-primary">VENDO</p>
              <p className="text-[11px] text-text-muted">Tiles + Sanitary</p>
            </div>
          </div>
          <Sidebar />
          <div className="border-t border-divider p-3">
            <div className="flex items-center justify-center gap-3 rounded-md bg-surface-secondary p-2 min-[1400px]:justify-start">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                {initials}
              </span>
              <div className="hidden min-w-0 min-[1400px]:block">
                <p className="truncate text-xs font-semibold text-text-primary">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-[11px] text-text-muted">{user?.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              className="absolute inset-0 bg-text-primary/40"
              aria-label="Close navigation"
              onClick={() => setMobileOpenedPath(null)}
            />
            <aside className="relative flex h-full w-72 flex-col bg-surface shadow-dialog">
              <div className="flex h-16 items-center justify-between border-b border-divider px-4">
                <span className="font-bold text-primary">VENDO</span>
                <Button variant="ghost" size="sm" onClick={() => setMobileOpenedPath(null)}>
                  Close
                </Button>
              </div>
              <Sidebar mobile />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 md:pl-[72px] min-[1400px]:!pl-64">
          <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-divider bg-surface/95 px-4 backdrop-blur sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileOpenedPath(pathname)}
            >
              Menu
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{route?.label ?? 'Vendo'}</h1>
              <p className="hidden truncate text-xs text-text-muted sm:block">
                {route?.description ?? 'Business operations'}
              </p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <StatusBadge tone={activeBranch ? 'success' : 'warning'}>
                {activeBranch ? 'Branch active' : 'Select branch'}
              </StatusBadge>
              <Select
                aria-label="Active branch"
                value={activeBranchId}
                disabled={isLoading || branches.length === 0}
                onChange={(event) => setActiveBranchId(event.target.value)}
                className="w-52"
              >
                {branches.length === 0 ? <option value="">No assigned branch</option> : null}
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} · {branch.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void logout().finally(() => router.replace('/login'))}
            >
              Sign out
            </Button>
          </header>
          <div className="border-b border-divider bg-surface px-4 py-3 sm:hidden">
            <Select
              aria-label="Active branch"
              value={activeBranchId}
              disabled={isLoading || branches.length === 0}
              onChange={(event) => setActiveBranchId(event.target.value)}
            >
              {branches.length === 0 ? <option value="">No assigned branch</option> : null}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} · {branch.name}
                </option>
              ))}
            </Select>
          </div>
          <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, user } = useAuth();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [router, status]);

  if (status !== 'authenticated' || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas text-sm text-text-secondary">
        Restoring secure session…
      </main>
    );
  }

  return (
    <BranchProvider>
      <ShellFrame>{children}</ShellFrame>
    </BranchProvider>
  );
}
