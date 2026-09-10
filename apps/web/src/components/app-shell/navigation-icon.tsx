import type { SVGProps } from 'react';
import type { NavigationIcon as NavigationIconName } from '../../lib/routes';

const paths: Record<NavigationIconName, string> = {
  dashboard: 'M4 4h6v6H4V4Zm10 0h6v10h-6V4ZM4 14h6v6H4v-6Zm10 4h6v2h-6v-2Z',
  pos: 'M4 5h16l-1 10H6L4 5Zm3 13h.01M17 18h.01M8 9h8',
  sales: 'M5 4h14v16l-3-2-3 2-3-2-3 2-2-1V4Zm4 5h6M9 13h4',
  purchases: 'M4 7h16l-1 13H5L4 7Zm4 0V5a4 4 0 0 1 8 0v2',
  products: 'M4 6.5 12 3l8 3.5v11L12 21l-8-3.5v-11ZM4 7l8 4 8-4M12 11v10',
  inventory: 'M3 7h18v14H3V7Zm3-4h12v4H6V3Zm3 8h6',
  customers:
    'M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8.5 1a3 3 0 0 0 0-6',
  suppliers: 'M3 20h18M5 20V8l7-5 7 5v12M9 20v-6h6v6',
  cash: 'M3 6h18v13H3V6Zm0 4h18M16 15h2',
  expenses: 'M4 4h16v16H4V4Zm4 4h8m-8 4h8m-8 4h5',
  reports: 'M5 20V10m7 10V4m7 16v-7',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6-1.5 1.5m-9 9L6 18m12 0-1.5-1.5m-9-9L6 6',
};

export function NavigationIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: NavigationIconName }) {
  const strokeOnly = name !== 'dashboard';
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" {...props}>
      <path
        d={paths[name]}
        fill={strokeOnly ? 'none' : 'currentColor'}
        stroke={strokeOnly ? 'currentColor' : 'none'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
