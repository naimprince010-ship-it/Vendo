import type { ReactNode } from 'react';
export function StatusBadge({
  tone,
  children,
}: {
  tone: 'success' | 'warning';
  children: ReactNode;
}) {
  const colors =
    tone === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900';
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors}`}>
      {children}
    </span>
  );
}
